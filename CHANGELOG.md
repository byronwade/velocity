# Changelog

All notable feature changes to Velocity. Every entry is written for an end user, not a committer.

**Format contract (do not break — a website consumes this file):** releases are `## YYYY-MM-DD · Title`
sections, grouped under `### Added` / `### Changed` / `### Removed` / `### Fixed`. Every entry is one
list item of the shape `- **slug** — Name. What changed and why it matters. (\`commit\`)`. The
**slug** is a stable kebab-case feature id shared with [ROADMAP.md](ROADMAP.md) — never rename one;
corrections get a new entry. Newest release first.

## 2026-07-15 · Agents as files

### Added
- **agents-as-files** — Coworkers are files. Every live coworker is mirrored to `.velocity/coworkers/<id>.md` — simple frontmatter for name, role, department, model, autonomy, scope, and budget. Edit a file in the IDE and save: the coworker updates live. Coworkers are now versionable, diffable, shareable artifacts, the same pattern as Cursor rules and Claude Code subagents.

## 2026-07-15 · The workspace comes alive

### Added
- **heartbeat** — Live coworker progress. Coworkers now make deterministic forward progress every few seconds, land a checkpoint at 100%, and rotate onto their department's next task. Tabs spin, the inbox fills, and the Review queue moves on its own — a coworker's newest checkpoint supersedes their older unreviewed one so the queue stays honest. (`54cde46`)
- **notifications-chime** — Chime + desktop notification. A quiet two-note chime when a coworker lands a checkpoint, and a desktop banner when the window is in the background. Gated by the Settings → Notifications toggle; rate-limited so parallel projects never stack noise. (`cfc08ac`)
- **work-items-chip** — Work items at a glance. A dock chip counts open work pins; its popover lists them (assignee, text, intent) and clicking one jumps to the pin and opens its thread. (`54cde46`)
- **device-preview** — Device preview in the browser. A desktop / tablet (768) / mobile (390) toggle constrains the live page to a centered device width, v0-style. (`54cde46`)
- **quick-open** — ⌘P go-to-file. Fuzzy file search over the workspace; Enter opens the file in a Code pane, creating the view if none is showing code. (`54cde46`)
- **ide-file-tree** — File tree beside the editor. The IDE pane shows the real workspace tree — collapsible folders, click to open, active file highlighted. (`b528bd4`)
- **ide-search-replace** — VS Code-style search. The file tree is openable/closable and searchable, and the editor gets full find & replace (match case, regexp, by word, replace all) from a contextual toolbar button. (`71505b9`)
- **contextual-toolbars** — Contextual pane toolbars. Each pane's toolbar adapts to its view: the Browser pane gets compare, the IDE pane gets tree-toggle / file-search / find-replace. (`71505b9`)
- **browser-devtools** — DevTools in the browser. Chrome-style Elements (the real parsed DOM), Console (live output from the preview), and Network panels, docked at the bottom of the browser pane (⌥⌘I). (`0794e04`)
- **integrations-research** — Roadmap research. A decision-ready report on the real-runtime stack: Vercel AI SDK/Gateway, Claude Agent SDK, MCP/ACP, Tauri native plugins, worktree-per-coworker. (`e017f5e`)

### Changed
- **workers-panel** — Workers panel redesigned. A monochrome divided list — no colored borders or accents anywhere: neutral circular avatars, status as a dot + pill (pulsing while working), black progress bars, subagents under a hairline guide. (`8093af7`)
- **docked-tools-panel** — Developer tools are a docked panel. The Explorer / Terminal / Logs / Problems / Source / Checkpoints drawer is now a real bottom-docked panel that pushes the workspace up, instead of a floating sheet. (`2e41f8e`)
- **v0-design-system** — One design system everywhere. Every control collapsed onto the v0/Geist token scale: one radius set, one control height, one dialog/popover/segmented spec, 16px dialog titles, monochrome generated-app output. (`42774a5`, `66a7ff3`)

## 2026-07-15 · Comments are the work

### Added
- **comments-as-work** — Place work on the app. "New work" (⌘⇧N) arms placement; click the app, describe the change, tap an intent (Fix / Redesign / Copy / Add / Test), and it auto-assigns the best-fit coworker. Who / model / how-many live behind one preset popover — no forms. Pins show the assigned coworker's face; right-click any pin for assign / model / agents / resolve / delete. (`7afd2b8`)
- **auto-assign** — Auto-assignment. Requests route deterministically by department (design → Design, tests → QA, everything else → Engineering), picking the least-busy coworker; intent is inferred from the text when no chip is tapped. (`7afd2b8`)

### Removed
- **work-chat** — The New Work chat panel. Replaced by comments-as-work: describing work now happens on the app itself, not in a chat thread. The Mission Sheet remains for detailed briefs. (`7afd2b8`)

## 2026-07-14 · A real product shell

### Added
- **real-browser** — A real in-app browser. Chrome-style toolbar, address bar, history, bookmarks, zoom, keyboard shortcuts; local URLs render the live workspace preview, external sites load in a sandboxed frame with a clean blocked-site fallback. (`9906d6c`, `ef9d2ba`)
- **real-terminal** — A real terminal with shell choice. The tools panel terminal executes against the workspace filesystem, with bash / zsh / pwsh / node session tabs and multiple sessions. (`ef9d2ba`)
- **settings-modal** — Settings. A Cursor-style modal: plan & usage, credits, pull-request prefs, appearance (theme / density / motion), notifications, coworker defaults, integrations. (`ef9d2ba`)
- **cross-project-inbox** — Inbox. A bell in the tab bar aggregates everything that needs you across every project — decisions, review-ready checkpoints, blocked coworkers — and jumps straight to the right surface. (`7a05010`)
- **keyboard-help** — Shortcut help. Press ? for a grouped keyboard-shortcut overlay. (`7a05010`)
- **split-panes** — Cursor-style split workspace. Every pane has a view dropdown (Browser / IDE / System / Data / Tests / Verify) and split-right / split-down / close; draggable dividers with snap points; right-click context menus. (`3691a55`, `b4ef209`)
- **compare-sources** — Preview compare. A Browser pane can compare the candidate against Stable / Live / Preview / Branch, side by side. (`013c67d`)
- **multi-project-tabs** — Project tabs. Each tab is a fully isolated workspace (own coworkers, missions, layout, terminals) with working-state spinners, mission progress rings, hover status cards, and drag-to-reorder. (`9ea5cd4`, `7d644f3`)
- **collaboration** — People + presence. Invite teammates (email + role), live cursors, calm presence flags, and comments pinned to the app. (`c4bb727`, `7de3b24`)
- **deploy-targets** — Ship to a host. Deploy to Vercel, Netlify, or Cloudflare from the Ship sheet — deploying → live with a production URL. (`7de3b24`)
- **follow-mode** — Follow a coworker. Following opens a panel with what they're doing now, their latest checkpoint, and their history. (`d6ec917`)

### Changed
- **no-content-shift** — Zero layout shift. All transient UI (panels, threads, popovers) overlays the stage instead of reflowing it — verified by measurement. (`f873539`)
- **edge-to-edge-panels** — Flush panels. Panels fill their regions edge-to-edge; no rounded insets. (`f2a85f1`)

## 2026-07-12 · Foundations

### Added
- **coworker-prototype** — The autonomous-workspace prototype. Named AI coworkers with scopes, budgets, autonomy and states; missions with acceptance criteria; checkpoints with diffs/tests/evidence; decision sheets; a deterministic scenario runtime behind a swappable `CoworkerRuntime` interface. (`e4ebc9e`)
- **geist-design-system** — The v0/Geist design system. Geist type, the v0 gray ramp, shadcn-style controls, light + dark. (`d916ca3`, `321d014`)
- **real-fs-tauri** — Open real projects. In the Tauri desktop build, open any folder from disk via the native filesystem. (`1d90132`)
- **workstream-shell** — The original workstream environment. Editor (CodeMirror), terminal, live preview (sucrase), design canvas, and nine on-demand studios over one in-memory workspace — still the substrate under the prototype's IDE and tools. (`516215a`, `08f1c2a`)
