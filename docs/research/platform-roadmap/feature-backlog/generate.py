#!/usr/bin/env python3
"""Generate Velocity's 457-record feature backlog from the research Markdown tables."""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import re
from collections import Counter
from pathlib import Path
from typing import Iterable

COLUMNS = [
    "id",
    "product",
    "domain",
    "capability",
    "how_it_works",
    "velocity_translation",
    "implementation_path",
    "phase",
    "priority",
    "sources",
]

CATALOGS = [
    ("05-*.md", {"VS-WB": ("VS Code", "Workbench and interaction model")}),
    ("06-*.md", {"VS-ED": ("VS Code", "Editor and language intelligence")}),
    ("07-*.md", {"VS-FW": ("VS Code", "Files, workspaces, search, settings, and commands")}),
    ("08-*.md", {"SCM": ("VS Code / Velocity", "Source control, Git, branches, and worktrees")}),
    ("09-*.md", {"TERM": ("VS Code / Velocity", "Integrated terminal and shell platform")}),
    ("10-*.md", {"DEVLOOP": ("VS Code / Velocity", "Tasks, debugging, testing, ports, and observability")}),
    ("11-*.md", {"PLATFORM": ("VS Code / Velocity", "Extensions, remote development, notebooks, accessibility, and enterprise")}),
    ("12-*.md", {"VS-AI": ("VS Code / Velocity", "Integrated browser and agent platform")}),
    ("13-*.md", {
        "CUR-EDIT": ("Cursor", "AI editing, context, and interaction"),
        "CUR-TOOLS": ("Cursor / Velocity", "Agent tools and execution mechanics"),
    }),
    ("14-*.md", {
        "CUR-VIS": ("Cursor / Velocity", "Browser, design, and canvas patterns"),
        "CUR-SCALE": ("Cursor / Velocity", "Parallel agents, cloud execution, automation, and review"),
    }),
    ("15-*.md", {"CUR-CUST": ("Cursor / Velocity", "Customization, governance, plugins, and CLI")}),
    ("16-*.md", {
        "FIG-COLLAB": ("Figma translated to Velocity", "Multiplayer presence, comments, and shared control"),
        "FIG-REV": ("Figma translated to Velocity", "Branching, review, version history, and handoff"),
    }),
    ("17-*.md", {"FIG-DS": ("Figma translated to Velocity", "Design systems, variables, inspection, and Dev Mode")}),
    ("18-*.md", {"VEL-TARGET": ("Velocity target", "Product primitives")}),
]

EXPECTED_COUNTS = {
    "VS-WB": 25,
    "VS-ED": 33,
    "VS-FW": 26,
    "SCM": 22,
    "TERM": 38,
    "DEVLOOP": 30,
    "PLATFORM": 26,
    "VS-AI": 42,
    "CUR-EDIT": 22,
    "CUR-TOOLS": 25,
    "CUR-VIS": 20,
    "CUR-SCALE": 25,
    "CUR-CUST": 25,
    "FIG-COLLAB": 21,
    "FIG-REV": 22,
    "FIG-DS": 29,
    "VEL-TARGET": 26,
}
EXPECTED_TOTAL = 457

HEADER = "| Capability | How it works | Velocity translation | Implementation / sequencing |"
SEPARATOR = re.compile(r"^\|\s*:?-+")
DETAILS = re.compile(
    r"^(?P<implementation>.*?)<br>\s*Phase:\s*(?P<phase>P\d+)\s*•\s*"
    r"Priority:\s*(?P<priority>P\d+)\s*•\s*Sources:\s*(?P<sources>.+?)\s*$"
)


def clean(value: str) -> str:
    value = html.unescape(value.strip())
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = value.replace("`", "")
    return value.strip()


def split_row(line: str) -> list[str]:
    # Catalog cells do not contain unescaped table pipes; fail loudly if the schema drifts.
    cells = [cell.strip() for cell in line.strip()[1:-1].split("|")]
    if len(cells) != 4:
        raise ValueError(f"Expected 4 cells, got {len(cells)}: {line[:160]}")
    return cells


def metadata_for(record_id: str, mapping: dict[str, tuple[str, str]]) -> tuple[str, str, str]:
    for prefix in sorted(mapping, key=len, reverse=True):
        if record_id.startswith(prefix + "-"):
            product, domain = mapping[prefix]
            return prefix, product, domain
    raise ValueError(f"No product/domain mapping for {record_id}")


def parse_catalog(path: Path, mapping: dict[str, tuple[str, str]]) -> Iterable[dict[str, str]]:
    in_table = False
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line == HEADER:
            in_table = True
            continue
        if not in_table:
            continue
        if SEPARATOR.match(line):
            continue
        if not line.startswith("|"):
            in_table = False
            continue

        capability_cell, how, translation, implementation_cell = split_row(line)
        if " — " not in capability_cell:
            raise ValueError(f"Missing ID separator in {path}: {capability_cell}")
        record_id, capability = capability_cell.split(" — ", 1)
        match = DETAILS.match(implementation_cell)
        if not match:
            raise ValueError(f"Missing implementation metadata in {path}: {implementation_cell}")
        prefix, product, domain = metadata_for(record_id, mapping)
        yield {
            "id": clean(record_id),
            "product": product,
            "domain": domain,
            "capability": clean(capability),
            "how_it_works": clean(how),
            "velocity_translation": clean(translation),
            "implementation_path": clean(match.group("implementation")),
            "phase": match.group("phase"),
            "priority": match.group("priority"),
            "sources": clean(match.group("sources")),
            "_prefix": prefix,
        }


def generate(research_root: Path) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    for pattern, mapping in CATALOGS:
        matches = sorted(research_root.glob(pattern))
        if len(matches) != 1:
            raise FileNotFoundError(f"Expected exactly one {pattern} below {research_root}; found {matches}")
        records.extend(parse_catalog(matches[0], mapping))

    ids = [record["id"] for record in records]
    if len(records) != EXPECTED_TOTAL:
        raise ValueError(f"Expected {EXPECTED_TOTAL} records, found {len(records)}")
    if len(set(ids)) != len(ids):
        duplicates = sorted(record_id for record_id, count in Counter(ids).items() if count > 1)
        raise ValueError(f"Duplicate feature IDs: {duplicates}")

    counts = Counter(record.pop("_prefix") for record in records)
    if counts != Counter(EXPECTED_COUNTS):
        raise ValueError(f"Prefix counts changed: expected {EXPECTED_COUNTS}, found {dict(counts)}")
    return records


def write_csv(records: list[dict[str, str]], output: Path) -> str:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)
    return hashlib.sha256(output.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    default_root = Path(__file__).resolve().parents[1]
    parser.add_argument("--research-root", type=Path, default=default_root)
    parser.add_argument("--output", type=Path, default=Path("Velocity_Feature_Roadmap.csv"))
    parser.add_argument("--check", action="store_true", help="Validate the corpus without keeping an output file")
    args = parser.parse_args()

    records = generate(args.research_root)
    if args.check:
        print(f"Validated {len(records)} unique feature records.")
        return
    digest = write_csv(records, args.output)
    print(f"Wrote {len(records)} records to {args.output} (sha256:{digest}).")


if __name__ == "__main__":
    main()
