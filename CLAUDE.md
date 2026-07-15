# CLAUDE.md

Guidance for working in this repository. Velocity is an **autonomous software-development workspace**
where named AI coworkers continuously improve a shared project while the human directs, observes,
compares, approves, redirects, or takes control. The running artifact, source, system, data, tests,
and deployment are primary; the product is not a chat application with tools attached.

## Product and platform source of truth

Use these artifacts in order:

1. [`VELOCITY_PRODUCT_VISION.md`](VELOCITY_PRODUCT_VISION.md) — product thesis, vocabulary,
   interaction principles, and non-negotiable user experience.
2. [`docs/architecture/0001-platform-convergence.md`](docs/architecture/0001-platform-convergence.md)
   — accepted production-platform decision and migration boundary.
3. [`ROADMAP.md`](ROADMAP.md) — curated public epics and shipped/planned status.
4. [`docs/research/platform-roadmap/README.md`](docs/research/platform-roadmap/README.md) — complete
   VS Code, Cursor, and Figma research, target architecture, security model, phases P0–P8, quality
   gates, metrics, risks, sources, and API/event sketches.
5. [`docs/research/platform-roadmap/feature-backlog.csv`](docs/research/platform-roadmap/feature-backlog.csv)
   — exhaustive 457-record capability inventory. Implementation specs cite the relevant IDs.
6. [`CHANGELOG.md`](CHANGELOG.md) — user-facing history of shipped and materially changed features.

When two artifacts differ, product intent comes from the product vision, production architecture comes
from the accepted ADR, and sequencing/status comes from the root roadmap. The detailed research
explains why and how; it does not silently override those source-of-truth documents.

## Production convergence boundary

The accepted direction is to make **`byronwade/Velocity-IDE` the production Code-OSS platform** and
port Velocity's differentiated primitives into native workbench services, commands, editor inputs,
views, context keys, policies, and review workflows. This repository remains the product
specification, interaction laboratory, deterministic demo harness, and source of reusable
product-domain concepts during that migration.

Do not reimplement mature VS Code-class editor, language, terminal, task, debug, test, SCM,
extension-host, notebook, remote-development, accessibility, or integrated-browser infrastructure in
this React/Tauri prototype as the production end state. Work in this repository is appropriate when it:

- proves a product interaction or deterministic scenario;
- sharpens the product-domain model or service boundary;
- creates source-backed manifests, policies, evidence, or portable schemas;
- builds reusable logic that can be ported into `Velocity-IDE`;
- maintains the current prototype while production convergence proceeds.

Every production-oriented proposal classifies each capability as **Reuse**, **Extend**, **Build**, or
**Retire**, cites the relevant research-backlog IDs, and explains its destination repository.

## Current prototype

The default app is the Phase-1 prototype in `src/velocity/` (`VelocityApp`, mounted by `src/App.tsx`).
It is deterministic and provider-free: a `CoworkerRuntime` (`src/velocity/runtime.ts`) produces every
state transition, bound to React via `useSyncExternalStore`. The design target is **v0.app / Geist /
shadcn**—enforce the token layer in `src/styles/tokens.css` rather than creating a new visual
language.

Standing UI rules:

- **No content shifting.** Transient UI overlays; verify with `getBoundingClientRect`.
- **Always deliver a screenshot for a UI change.** Drive the built app in Playwright.
- **The artifact remains primary.** Do not reintroduce a permanent chat transcript or composer.
- **No browser-only truth.** Approved visual changes must resolve to source edits, tests, evidence,
  and versioned state.
- **No fake production claims.** The current virtual shell, iframe browser, deterministic coworker
  runtime, local collaboration, and fixture evidence remain prototype implementations unless the
  production seam is actually connected.

Key `src/velocity/` files:

- `model.ts` — product types, `LayoutState`, work intents, coworkers, missions, evidence, decisions.
- `runtime.ts` — deterministic `PrototypeCoworkerRuntime`, heartbeat, auto-assignment, checkpoints,
  collaboration actions, and the replaceable runtime interface.
- `workspace.ts` — multi-project manager; the exported runtime proxies to the active project tab.
- `Stage.tsx` — split panes, IDE lens, artifact-level work placement, comment threads, source jumps.
- `surfaces.tsx` — rails, docked tool drawer, command bar, review/follow surfaces.
- `Dock.tsx`, `TabBar.tsx`, `SettingsSheet.tsx`, and `velocity.css` — product shell and styling.
- `src/modes/BrowserMode.tsx` — prototype in-app browser and prototype DevTools.

The earlier workstream shell in `src/workbench/` is legacy product chrome but still owns reusable
services and tool surfaces used by the prototype.

## Commands

```bash
npm run dev        # Vite dev server → http://localhost:5199
npm run build      # production build; fastest full validation of app code
npm run typecheck  # tsc --noEmit
npm run preview    # serve the production build on :5199
```

Always run `npm run typecheck` and `npm run build` before committing. Prefer browser-driving the built
app with Playwright over asserting on code alone. UI changes require a screenshot checkpoint.

## Prototype architecture

- **State** — Zustand in `src/lib/store.ts` for tabs, recursive split-pane trees, and chrome;
  `PrototypeCoworkerRuntime` owns the autonomous-workspace state. `useSyncExternalStore` snapshots
  must be stable references.
- **Services** — `src/services/container.tsx` vends `fs`, `editor`, `shell`, `browser`, `agent`,
  `graph`, `preview`, `design`, deployment, review, database, API, mission, project, and collaboration
  services behind interfaces. Non-React callers use `getServices()`.
- **Filesystem** — the shared `IFileSystem` is the source for the editor, Explorer, prototype shell,
  graph, design service, and live preview. The browser build uses an in-memory implementation; the
  Tauri build can switch to a real folder backend.
- **Editor** — CodeMirror 6 host in `src/editor/CodeMirrorHost.tsx`; a shared `TextDocument` backs
  multiple views of the same file.
- **Keybindings** — `src/keybindings/` is a VS Code-style command/keybinding engine. Add a user action
  as a command with context, then bind it in `defaults.ts`; do not add ad-hoc global `keydown`
  listeners.
- **Live preview** — `src/services/preview.ts` transpiles workspace TS/TSX with sucrase and runs it
  against vendored React in a sandboxed iframe. It is CSP-safe and deterministic, not the production
  browser/runtime architecture.
- **Project graph** — `src/lib/graph.ts` and `src/services/graph.ts` derive typed nodes and edges from
  static analysis; map, command, design, scope-resolution, and future evidence features consume it.
- **Modes** — `src/modes/registry.tsx` maps editor, terminal, browser, builder, design, database, API,
  observability, test, ship, home, mission, library, and agent surfaces to reusable components.
- **Collaboration seam** — same-window text sharing is real; networked multiplayer/CRDT remains a
  future adapter at `src/services/collab.ts`.

## Agent-first design rule

Velocity borrows Figma's presence, following, comments, branch review, history, design systems,
variables, inspection, and developer handoff—not its layer-by-layer manual authoring model as the
primary workflow. Humans select semantic scope and state desired outcomes or constraints. Agents edit
the actual tokens, components, styles, routes, data, services, tests, stories, and documentation.

Manual controls are appropriate for inspection, selection, comparison, constraints, token approval,
small corrections, takeover, accessibility review, and emergency intervention. They must not create a
second design document or mutable browser state that can diverge from source.

## Research-backed planning workflow

Before implementing a roadmap epic:

1. Find the matching records in
   `docs/research/platform-roadmap/feature-backlog.csv` and cite their IDs in the spec.
2. Confirm the phase, dependencies, source-of-truth boundary, security model, and exit gates in the
   research corpus.
3. Classify each dependency as Reuse / Extend / Build / Retire and identify whether the work belongs
   in this repository, `Velocity-IDE`, or both.
4. Define the complete end-to-end behavior, not only the panel or component that renders it.
5. Include observable acceptance tests, failure modes, accessibility checks, performance budgets,
   evidence requirements, and rollback behavior.
6. Update `ROADMAP.md` and `CHANGELOG.md` under the rules below.

The first production vertical slice is the architecture gate: real repository → mission → isolated
worktree/environment → native edit/terminal/browser/test → typed evidence → checkpoint →
Stable/Candidate review → merge/deploy → verified rollback. Do not declare the architecture proven
because isolated panels work independently.

## Conventions

- TypeScript + tabs; match the surrounding file's style and comment density.
- Keep prototype data honest. Derive from services/filesystem where possible; label fixtures and
  deterministic simulation clearly.
- Overlays open through registered commands/events and obey the no-content-shift rule.
- Prettier is available in-browser (`src/services/format.ts`), lazy-loaded; house style is tabs,
  single quotes, width 100.
- Source-backed product state, evidence, permissions, and audit events use typed schemas and stable
  identifiers suitable for migration into the production platform.

## Roadmap & changelog discipline (MANDATORY)

[`ROADMAP.md`](ROADMAP.md) and [`CHANGELOG.md`](CHANGELOG.md) are the public product record; a future
website renders them, so their format contracts must never break. **Any commit that adds, changes,
removes, or moves a user-facing feature updates both files in that same commit.**

1. **Slugs are the join key.** Every feature has one stable kebab-case slug used identically in both
   files. Never rename or reuse a slug; corrections get a new changelog entry under the same slug.
2. **Ship a feature** → add a `CHANGELOG.md` entry under today's `## YYYY-MM-DD · Title` release
   (`### Added`, format `- **slug** — Name. User-facing description. (\`commit\`)`) and check its
   `ROADMAP.md` item `- [x] … _(shipped YYYY-MM-DD)_`, adding the item first if it was never planned.
3. **Change a shipped feature materially** → add a `### Changed` entry under the same slug and update
   the roadmap description to current behavior.
4. **Remove/drop a feature** → add a `### Removed` entry with the reason; move the roadmap item to
   `## Dropped` with date and reason. Never delete roadmap lines.
5. **Plan a feature** → add an unchecked roadmap item with a phase or `(planned)`; no changelog entry
   until it ships.
6. **Keep the root roadmap curated.** The 457-record CSV is the exhaustive implementation inventory;
   promote records to root-roadmap epics only when they become public commitments.
7. Entries are written for end users—what it does and why it matters—not as commit prose. Prefer
   several small dated releases over one giant release.
