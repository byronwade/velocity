# Velocity

Velocity is an open-source, local-first **autonomous software-development workspace**. Named AI
coworkers continuously build a shared project while you direct, observe, and approve — it is not a
chat app. The full product thesis lives in [`VELOCITY_PRODUCT_VISION.md`](VELOCITY_PRODUCT_VISION.md);
what's shipped and what's next live in the [**Roadmap**](ROADMAP.md) and the
[**Changelog**](CHANGELOG.md).

![Velocity — a project on the Browser lens beside the IDE, with coworker presence markers and the floating dock](docs/screenshots/prototype/velocity-calm-light.png)

## Platform roadmap

Velocity's production target is the existing [`byronwade/Velocity-IDE`](https://github.com/byronwade/Velocity-IDE)
Code-OSS fork. This repository remains the authoritative product specification, interaction laboratory,
local-first prototype, and deterministic scenario harness while Velocity's differentiated primitives are
ported into native workbench services and contributions.

- The accepted decision is recorded in [ADR 0001 — Platform convergence](docs/architecture/0001-platform-convergence.md).
- The full VS Code, Cursor, Figma, and Velocity research lives in the
  [Platform Research & Integration Roadmap](docs/research/platform-roadmap/README.md).
- The public [Roadmap](ROADMAP.md) is the curated epic layer; the implementation-ready 457-record
  catalog is produced by the [feature-backlog package](docs/research/platform-roadmap/feature-backlog/README.md).

The core rule is source authority: files, Git revisions, worktrees, environment manifests, and typed
evidence are durable truth. Humans direct semantic outcomes and constraints; agents make source-level
changes across code, components, tokens, routes, tests, schemas, and supporting artifacts.

## The prototype (Phase 1)

A polished, design-first prototype of the workspace lives in [`src/velocity/`](src/velocity/) and
renders as the default app. Seeded scenarios remain deterministic and repeatable; local-model and
native-desktop paths can also perform real work through the repository's service seams.

- **Project tabs** — a tab per project; each is a fully isolated workspace (its own coworkers,
  missions, lens, terminals, and rails) with live status rings and drag-to-reorder. Settings can
  switch the top row into an **Arc-style collapsible vertical rail**.
- **Split-pane workspace (Cursor-style)** — every pane has a **contextual** toolbar with a **view
  dropdown** (Browser · IDE · Terminal · System · Data · Tests · Verify) and split/close controls;
  **drag any panel by its toolbar** onto another and a blue outline previews where it lands.
  Dividers have obvious grab bars with snap points. The Browser pane adds a **compare selector**;
  the IDE pane adds tree-toggle / file-search / find-replace. **Spatial presence markers** show
  where each coworker is working; click one to Follow.
- **The workspace is alive** — a deterministic heartbeat advances every working coworker; they land
  checkpoints, pick up their next task, and a chime + desktop notification fires when work is ready
  to review.
- **Real work on local models** — create a work item with the **Local** model and the assigned
  coworker actually does it via Ollama: real tool calls against the workspace, live action updates,
  and a checkpoint whose diff is computed from actual file changes. No API key required.
- **Real in-app browser** — IDE-style **browser tabs** (each with its own history), a compact
  v0-style toolbar, device preview (desktop / tablet / mobile), and built-in **DevTools** (⌥⌘I):
  Elements (the real parsed DOM), Console (live output + eval), and Network.
- **Real IDE** — a file tree bound to the filesystem beside a live CodeMirror editor;
  open/close and search the tree, full **find & replace**, and **⌘P quick-open**.
- **Comments are the work** — directing work happens on the app, not in a chat. **New work** (⌘⇧N)
  arms placement; click the app, describe the change, and it **auto-assigns** the best-fit coworker.
  One compact popover holds who / which model / how many — all presets. Pins show the assigned
  coworker's face; click away to dismiss any thread.
- **Collaborative chat + activity sidebar** — togglable left of the tabs: humans and coworkers in
  one thread (agents answer and riff off each other, `@Name` directs), pinned work appears inline,
  and progress/completion events flow through automatically.
- **Agents as files** — every coworker is mirrored to `.velocity/coworkers/<id>.md`; edit the file
  in the IDE and the coworker updates live.
- **The workspace speaks MCP** — fs / shell / browser exposed as Model Context Protocol tools
  in-process; Settings → Integrations lists the live toolbelt.
- **Coworkers** — add / rename / pause / dismiss / restore / follow; name and role read louder than
  the model; a manager (Maya) with two reporting specialists, shown with live tools and subagents.
- **Docked developer tools** — a bottom panel (Explorer · Terminal · Logs · Problems · Source ·
  Checkpoints) that pushes the workspace up, with a real shell over the filesystem and a shell
  chooser (bash / zsh / pwsh / node). The desktop build upgrades to a **true PTY terminal**
  (ConPTY/openpty via portable-pty + xterm.js).
- **Native desktop** — projects persist across restarts, native notifications, a system-tray
  attention badge, a global summon shortcut (Ctrl/⌘⇧V), and remembered window state.
- **Checkpoints, Evidence, and Decision Sheets** — review work with diffs, tests, traces, blast
  radius, and rollback; resolve conflicts and protected actions with a recommended option.
- **Follow Mode** — following a coworker opens a panel showing what they're doing now, their latest
  checkpoint, and their activity history. Presence flags collapse to avatars and expand on
  hover/follow, so the stage stays calm with many coworkers.
- **Ship** — deploy to **Vercel, Netlify, or Cloudflare** (deploying → live with a production URL).
- **Account & settings** — a Cursor-style settings modal (plan & usage, appearance, notifications,
  coworkers, integrations), a cross-project **inbox**, light + dark themes, and a command palette
  where every entry drives state.
- Everything is designed against **v0.app's system** — **Geist** type on the v0 gray ramp, one
  radius / control-height / dialog / popover spec across the app.

Run it, then switch scenarios from the top-bar picker or the URL:

```
npm install
npm run dev            # http://localhost:5199

# seeded scenarios
/?scenario=calm        # a healthy project mid-flight (default)
/?scenario=checkpoint  # a checkpoint ready for review
/?scenario=conflict    # two coworkers conflict → a Decision Sheet
/?scenario=approval    # a protected migration needs sign-off
/?scenario=compare     # Stable vs Candidate, side by side
/?scenario=shipping    # ready to ship
/?scenario=devtools    # the IDE lens + docked tools panel
/?scenario=empty        # a blank project → describe the first work
# also: parallel, verifyFail   ·   append &theme=dark for dark mode
```

Keyboard: `1`–`7` switch views, `c` compare, `f` focus, `.` pause all, `⌘K` commands, `⌘P` go to
file, `⌘⇧N` new work, `⌘\` split right, `⌘J` terminal, `Esc` closes the topmost surface.

<details>
<summary>The earlier workstream environment</summary>

Before the autonomous-workspace redesign, Velocity was a single-workstream environment (a feature's
conversation beside its editor, terminal, browser, and design canvas). That shell still lives in
`src/workbench/` and the services it uses remain the real substrate the prototype's Code lens and
tool drawer render.

![Velocity — the earlier Work view](docs/screenshots/velocity-work.png)

</details>

## Product model

Every workstream has three views over the same context:

- **Conversation** — the outcome, work brief, agent thread, project scope, and a persistent composer.
- **Work** — the conversation beside the tool the work needs. Four surfaces are always present —
  the CodeMirror editor (with a file tree), terminal, live browser, and design canvas. Specialized
  studios (database, API runner, tests, deployments, builder, observability, …) appear **on demand**
  as dismissible tabs, summoned from the command palette instead of cluttering the shell. Changing
  tools does not create a new project context.
- **Review** — definition-of-done criteria beside behavior or diff evidence, with explicit accept
  and send-back decisions.

An attention inbox contains only blockers, requested decisions, and review-ready work. Activity,
branch, worktree, budget, model, and evidence are progressive details instead of permanent chrome.

![The Conversation view: work brief, agent thread, and a persistent composer](docs/screenshots/velocity-conversation.png)

## Current prototype

This phase focuses on making the desktop product flow tangible before building the complete
production orchestration and evidence architecture.

Implemented now:

- A single top header: a workstream switcher (search, grouped list, new-work, account) in a
  dropdown, the Conversation/Work/Review tabs, and an attention inbox — no sidebar or icon rail.
- Conversation, Work, and Review layouts with a shared active workstream, filling the full canvas.
- The full original toolset embedded in the new shell: editor, terminal, browser preview, design
  canvas, and nine specialized studios — with the file tree, command palette, quick-open, and the
  VS Code-style keyboard shortcut system all intact.
- On-demand tools: the four core surfaces are always present; the other studios surface only when
  summoned from the palette (⌘K → "Open …"), keeping the Work view focused.
- Interactive criteria selection, behavior/diff switching, activity details, accept/send-back
  transitions, light/dark appearance, and model settings.
- A real Ollama model picker and streaming agent transport.
- A Tauri 2 desktop scaffold with local Ollama access restricted to port `11434`.

Prototype seams that still need production replacements are tracked explicitly in the roadmap,
including Code-OSS workbench convergence, native source control and language services, isolated
worktrees and processes, integrated Chromium automation, typed evidence, policy enforcement, and
networked collaboration.

## Ollama

Start Ollama normally:

```bash
ollama serve
```

Open **Settings → Ollama**, test `http://localhost:11434`, and choose an installed model. In the
Tauri app, requests use the native HTTP plugin, so Ollama does not need a permissive browser CORS
setting. The desktop capability allowlist accepts only:

- `http://localhost:11434/*`
- `http://127.0.0.1:11434/*`

When using the Vite browser preview instead of Tauri, allow only that development origin:

```bash
OLLAMA_ORIGINS='http://localhost:5199' ollama serve
```

## Architecture

- **React 18 + TypeScript + Vite** for the current workbench UI and prototype.
- **Tauri 2** for the current desktop shell and native local transport.
- **Zustand** for existing editor and shell state.
- A service container in `src/services/container.tsx` for filesystem, editor, terminal, browser,
  agent, graph, preview, and design services.
- The product shell in `src/workbench/VelocityWorkbench.tsx`, with its workstream model in
  `src/workbench/model.ts` and the Code-surface file tree in `src/workbench/WorkFiles.tsx`. Every
  surface is mounted through the shared mode registry and can be surfaced by commands or agents.
- The reusable services and tools underneath are documented in [`CLAUDE.md`](CLAUDE.md).
- Desktop configuration and capabilities live in `src-tauri/`.
- The production convergence architecture is defined in
  [`docs/architecture/0001-platform-convergence.md`](docs/architecture/0001-platform-convergence.md).

## Develop

```bash
npm install
npm run dev             # browser preview at http://localhost:5199
npm run typecheck       # TypeScript validation
npm run build           # production web assets
npm run desktop:dev     # Tauri development app
npm run desktop:build   # native desktop bundle
```

Tauri development and builds require the Rust toolchain and the platform prerequisites documented
by Tauri. `?theme=light` and `?theme=dark` can force a theme for browser previews.
