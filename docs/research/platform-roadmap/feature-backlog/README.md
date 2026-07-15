# Feature backlog

The complete implementation backlog is generated from the source-controlled capability tables in the platform-research chapters. This keeps one reviewable source of truth while still producing the tracker-ready CSV used for issue creation, estimation, sequencing, and traceability.

## Coverage

- **457 records**
- **457 unique stable IDs**
- VS Code/Code-OSS workbench, editor, files, Git, terminal, tasks, debug, tests, extensions, remote, browser, and agent platform
- Cursor editing, tools, browser/design, parallel/cloud agents, automation, review, rules, skills, MCP, plugins, and CLI
- Figma-derived collaboration, branching/review, design systems, variables, inspection, Dev Mode, and design lint
- Velocity target primitives

## Generate the CSV

From the repository root:

```bash
python docs/research/platform-roadmap/feature-backlog/generate.py \
  --output Velocity_Feature_Roadmap.csv
```

Validate the catalog without writing an output file:

```bash
python docs/research/platform-roadmap/feature-backlog/generate.py --check
```

The generated schema is:

```text
id,product,domain,capability,how_it_works,velocity_translation,implementation_path,phase,priority,sources
```

The generator fails when the count changes from 457, an ID is duplicated, a chapter is missing, a table row loses its implementation metadata, or a product-domain prefix count drifts. Deliberate catalog changes must update the chapter table and the expected count in the generator in the same commit.

The root [`ROADMAP.md`](../../../../ROADMAP.md) remains the curated public epic layer. Promote backlog records there only when they become public commitments. Implementation specs cite the relevant stable IDs from the generated CSV.
