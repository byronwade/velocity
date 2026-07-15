# Velocity

Velocity is an open-source, local-first **autonomous software-development workspace**. Named AI
coworkers continuously build a shared project while you direct, observe, and approve — it is not a
chat app. The full product thesis lives in [`VELOCITY_PRODUCT_VISION.md`](VELOCITY_PRODUCT_VISION.md).

![Velocity — a project on the Browser lens beside the IDE, with coworker presence markers and the floating dock](docs/screenshots/prototype/velocity-calm-light.png)

## The prototype (Phase 1)

A polished, deterministic, design-first prototype of the workspace lives in
[`src/velocity/`](src/velocity/). It renders as the default app. Nothing there talks to a provider
or the network — a `CoworkerRuntime` produces every state transition deterministically, so the
demo is fully repeatable.

- **Project tabs** — the top row is a tab per project; each tab is a fully isolated workspace
  (its own coworkers, missions, lens, open terminals/tools, and rails). Above the tabs sits the
  account bar — credits/usage meter, the light/dark toggle, and the user profile.
- **Split-pane workspace (Cursor-style)** — the running app is the left pane; the right holds the
  IDE (or any tool). Every pane has its own **contextual** toolbar with a **view dropdown**
  (Browser · IDE · System · Data · Tests · Verify) and **split-right / split-down / close** — build
  50/50, stacked, or 2×2 layouts with draggable dividers. The Browser pane adds a **compare
  selector** (vs Stable / Live / Preview / Branch); the IDE pane adds **toggle file tree**, **search
  files**, and **find & replace**. **Spatial presence markers** show where each coworker is working;
  click one to Follow.
- **Real in-app browser** — a Chrome-style browser (address bar, history, bookmarks, zoom) that runs
  the **live workspace preview** for local URLs and iframes external sites. Built-in **DevTools**
  (⌥⌘I) with **Elements** (the real parsed DOM), **Console** (live output from the preview), and
  **Network** — docked at the bottom of the pane.
- **Real IDE** — a file tree bound to the in-memory filesystem beside a live CodeMirror editor;
  open/close and search the tree, and full **find & replace** (match case, regexp, by word).
- **Comments are the work** — there is no chat. **New work** (or ⌘⇧N) arms placement; click the app
  to drop a pin, describe the change, and it **auto-assigns** the best-fit coworker (design →
  Maya, backend → Rowan, tests → Iris…). One compact popover holds who / which model / how many
  coworkers — all presets, mostly automatic. Pins show the assigned coworker's face; right-click a
  pin for the same menu.
- **Coworkers** — add / rename / pause / dismiss / restore / follow; name and role read louder than
  the model; a manager (Maya) with two reporting specialists, shown with live tools and subagents.
- **Docked developer tools** — a bottom panel (Explorer · Terminal · Logs · Problems · Source ·
  Checkpoints) that pushes the workspace up, with a real shell over the filesystem and a shell
  chooser (bash / zsh / pwsh / node).
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

Keyboard: `1`–`6` switch lenses, `c` compare, `f` focus, `.` pause all, `⌘K` commands,
`⌘⇧N` new work, `⌘\` split right, `⌘J` terminal, `Esc` closes the topmost surface.

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

This phase focuses on making the desktop product flow tangible before building orchestration and
persistence behind it.

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

Prototype seams that are intentionally still local or seeded:

- Workstream metadata, criteria, evidence, and activity examples are in-memory design fixtures.
- New workstreams live for the current app session; durable project/worktree orchestration comes
  next.
- The browser build's filesystem and shell remain the existing in-memory implementations.

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

- **React 18 + TypeScript + Vite** for the workbench UI.
- **Tauri 2** for the desktop shell and native local HTTP transport.
- **Zustand** for existing editor and shell state.
- A service container in `src/services/container.tsx` for filesystem, editor, terminal, browser,
  agent, graph, preview, and design services.
- The product shell in `src/workbench/VelocityWorkbench.tsx`, with its workstream model in
  `src/workbench/model.ts` and the Code-surface file tree in `src/workbench/WorkFiles.tsx`. Every
  surface (the four core tabs and the nine studios) is the existing `src/modes/*` component, mounted
  per-workstream through a `SURFACES` registry; a studio is surfaced by dispatching a
  `velocity:open-tool` event — from a ⌘K command today, and from the agent later.
- The reusable services and tools underneath (editor, terminal, browser, design, graph, keybindings,
  live preview) are documented in [`CLAUDE.md`](CLAUDE.md).
- Desktop configuration and capabilities in `src-tauri/`.

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
