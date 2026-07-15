# Velocity

Velocity is an open-source, local-first **autonomous software-development workspace**. Named AI
coworkers continuously improve a shared project while the human directs, observes, compares,
approves, redirects, or takes control. The center of the product is the living artifact—not a chat
transcript.

The product contract lives in [`VELOCITY_PRODUCT_VISION.md`](VELOCITY_PRODUCT_VISION.md). What's
shipped and what's next live in the [**Roadmap**](ROADMAP.md) and [**Changelog**](CHANGELOG.md). The
production-platform decision and complete VS Code, Cursor, and Figma research live in the
[**Platform Research & Integration Roadmap**](docs/research/platform-roadmap/README.md).

![Velocity — a project on the Browser lens beside the IDE, with coworker presence markers and the floating dock](docs/screenshots/prototype/velocity-calm-light.png)

## Product model

Velocity treats software development as a shared, observable operating system for a project:

- **The artifact is primary.** The running app, code, terminal, tests, data, infrastructure, and
  deployment are the main interface. Language is used to set outcomes and constraints, not to create
  a permanent chat-first workflow.
- **Humans direct semantic outcomes.** A person can pin work to a route, component, flow, service,
  schema, test, design-token family, or whole-product scope. Agents resolve that scope to source and
  make the cross-project edits.
- **Coworkers are persistent identities; work orders are bounded execution.** A coworker has a name,
  role, policies, model preferences, scope, budget, and history. Actual execution happens through
  isolated work orders that can change provider, model, or location.
- **Stable and Candidate are explicit.** Concurrent work is isolated. A checkpoint with required
  evidence—not a successful tool call or generated explanation—is the unit that may advance Stable.
- **Evidence replaces status prose.** Diffs, tests, diagnostics, screenshots, recordings, browser
  traces, console/network findings, accessibility results, risk, provenance, and rollback are
  inspectable and source-backed.
- **Figma-style collaboration without manual layer authoring.** Presence, Follow Mode, comments,
  branch review, history, design systems, variables, inspection, and Dev Mode are translated into an
  agent-first workflow. Humans define intent and approve outcomes; agents edit the real source.

## The prototype

A polished, deterministic, design-first prototype lives in [`src/velocity/`](src/velocity/) and
renders as the default app. Its `CoworkerRuntime` produces repeatable state transitions without a
provider, making the product model testable before the production orchestration is complete.

- **Project tabs** — each tab is an isolated workspace with its own coworkers, missions, layout,
  terminals, tools, comments, evidence, and review state.
- **Split-pane stage** — each pane can show Browser, IDE, System, Data, Tests, or Verify; panes split
  right/down, resize, close, and compare Stable, Live, Preview, or Branch.
- **In-app browser** — Chrome-style navigation, history, bookmarks, zoom, device preview, and docked
  prototype DevTools with Elements, Console, Network, and console evaluation for the live preview.
- **IDE** — a workspace file tree beside a live CodeMirror editor with quick-open, file search, and
  full find/replace.
- **Comments are the work** — New Work arms placement; clicking the artifact creates a pin, captures
  intent, and auto-assigns the best-fit coworker. Assignment, model, and staffing stay compact and
  mostly automatic.
- **Coworkers** — add, rename, pause, dismiss, restore, follow, inspect tools/subagents, and edit the
  versioned `.velocity/coworkers/*.md` definitions.
- **Docked developer tools** — Explorer, Terminal, Logs, Problems, Source, and Checkpoints in a
  bottom panel. The current terminal is a deterministic workspace-filesystem shell; a native PTY
  terminal is part of the production roadmap.
- **Checkpoints, Evidence, and Decisions** — inspect changes, tests, traces, blast radius, rollback,
  conflicts, and protected actions before advancing Stable.
- **Follow Mode** — follow a coworker's current artifact, files, tools, latest checkpoint, and
  activity history while keeping the stage calm.
- **Ship** — prototype deployment flows for Vercel, Netlify, and Cloudflare.
- **Consistent design system** — Geist type, v0 gray ramp, one radius/control/dialog/popover system,
  light and dark themes, and no content-shifting transient UI.

Run it, then switch scenarios from the top-bar picker or the URL:

```bash
npm install
npm run dev            # http://localhost:5199

# seeded scenarios
/?scenario=calm        # a healthy project mid-flight (default)
/?scenario=checkpoint  # a checkpoint ready for review
/?scenario=conflict    # two coworkers conflict → a Decision Sheet
/?scenario=approval    # a protected migration needs sign-off
/?scenario=compare     # Stable vs Candidate, side by side
/?scenario=shipping    # ready to ship
/?scenario=devtools    # IDE lens + docked tools panel
/?scenario=empty       # a blank project → describe the first work
# also: parallel, verifyFail   ·   append &theme=dark for dark mode
```

Keyboard: `1`–`6` switch lenses, `c` compare, `f` focus, `.` pause all, `⌘K` commands,
`⌘P` quick-open, `⌘⇧N` new work, `⌘\` split right, `⌘J` terminal, and `Esc` closes the topmost
surface.

## Production direction

The accepted architecture is to make **`byronwade/Velocity-IDE` the production Code-OSS platform**
and port Velocity's differentiated product primitives into native workbench services, commands,
editor inputs, views, context keys, policies, and review workflows. This repository remains the
product specification, interaction laboratory, deterministic demo harness, and source of reusable
product-domain concepts while that convergence proceeds.

That decision avoids rebuilding the mature VS Code editor, language, terminal, task, debug, test,
SCM, extension, remote-development, accessibility, notebook, and integrated-browser ecosystems in a
parallel React/Tauri shell. It is recorded in
[`docs/architecture/0001-platform-convergence.md`](docs/architecture/0001-platform-convergence.md).

The first production vertical slice is intentionally end-to-end: open a real repository → create a
mission → isolate a worktree and environment → edit with native services → run terminal/tasks/tests →
exercise the candidate in a real browser → collect typed evidence → propose a checkpoint → compare
Stable/Candidate → accept or revise → merge, deploy, and verify rollback.

## Research and planning

The planning artifacts have distinct responsibilities:

| Artifact | Responsibility |
| --- | --- |
| [`VELOCITY_PRODUCT_VISION.md`](VELOCITY_PRODUCT_VISION.md) | Product thesis, vocabulary, interaction principles, and non-negotiable user experience. |
| [`docs/architecture/0001-platform-convergence.md`](docs/architecture/0001-platform-convergence.md) | Accepted production-platform decision and migration boundary between this prototype and `Velocity-IDE`. |
| [`ROADMAP.md`](ROADMAP.md) | Curated public epics with shipped/planned status and stable feature slugs. |
| [`docs/research/platform-roadmap/README.md`](docs/research/platform-roadmap/README.md) | Full research corpus, architecture, security model, service/data design, phases P0–P8, quality gates, metrics, risks, and sources. |
| [`docs/research/platform-roadmap/feature-backlog.csv`](docs/research/platform-roadmap/feature-backlog.csv) | Exhaustive 457-record capability inventory for issue generation, estimation, sequencing, and traceability. |
| [`docs/superpowers/specs/2026-07-15-integrations-research.md`](docs/superpowers/specs/2026-07-15-integrations-research.md) | Focused implementation memo for the real runtime stack: Vercel AI, Tauri native capabilities, agent SDKs, MCP/ACP, worktrees, and native execution. |
| [`CHANGELOG.md`](CHANGELOG.md) | User-facing history of shipped and materially changed features. |

The root roadmap is intentionally concise. Detailed implementation specs should cite the relevant
feature-backlog IDs, accepted architecture decision, phase, dependencies, and measurable exit gates.

## Prototype architecture

- **React 18 + TypeScript + Vite** for the prototype UI.
- **Tauri 2** for desktop packaging and scoped native access.
- **Zustand** for existing shell/editor state.
- A service container in `src/services/container.tsx` for filesystem, editor, shell, browser, agent,
  graph, preview, design, deployment, review, and collaboration seams.
- `src/velocity/` for the autonomous-workspace shell and deterministic coworker runtime.
- `src/workbench/` and `src/modes/` for the earlier workstream shell and reusable editor, terminal,
  browser, design, database, API, test, observability, builder, mission, library, and ship surfaces.
- A VS Code-style command and keybinding engine in `src/keybindings/`.
- A sandboxed live preview built from workspace files with vendored React and sucrase.

The prototype deliberately keeps some seams local or simulated: provider-backed continuous agents,
durable orchestration, production credentials, real Git worktrees, native PTYs, Chromium/CDP browser
sessions, networked collaboration, typed evidence persistence, and transactional Stable advancement.
Those are roadmap work, not claims about the current demo.

## Develop

```bash
npm install
npm run dev             # browser preview at http://localhost:5199
npm run typecheck       # TypeScript validation
npm run build           # production web assets
npm run desktop:dev     # Tauri development app
npm run desktop:build   # native desktop bundle
```

Tauri development and builds require the Rust toolchain and the platform prerequisites documented by
Tauri. `?theme=light` and `?theme=dark` can force a theme for browser previews.
