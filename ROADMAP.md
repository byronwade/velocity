# Roadmap

The feature checklist for Velocity — what's shipped and what's next, grouped by area.

**Format contract (do not break — a website consumes this file):** every feature is one checklist
item of the shape `- [x|_] **slug** — Name. One-sentence description. _(shipped YYYY-MM-DD | planned · phase N)_`.
The **slug** is the same stable id used in [CHANGELOG.md](CHANGELOG.md), so shipped items can be
joined to their changelog details. Checked = shipped. Never delete an item — a dropped feature moves
to the Dropped section at the bottom with a reason.

## Workspace

- [x] **multi-project-tabs** — Project tabs. Isolated workspaces per tab with live status, progress rings, hover cards, drag-to-reorder. _(shipped 2026-07-14)_
- [x] **split-panes** — Split-pane workspace. Per-pane view dropdowns, split right/down, draggable snap dividers, context menus. _(shipped 2026-07-14)_
- [x] **contextual-toolbars** — Contextual pane toolbars. Toolbar controls adapt to each pane's view. _(shipped 2026-07-15)_
- [x] **no-content-shift** — Zero layout shift. Transient UI overlays; nothing reflows. _(shipped 2026-07-14)_
- [x] **edge-to-edge-panels** — Flush panels. Edge-to-edge regions, no rounded insets. _(shipped 2026-07-14)_
- [x] **cross-project-inbox** — Inbox. Everything that needs you, across all projects, in one bell. _(shipped 2026-07-14)_
- [x] **keyboard-help** — Shortcut help overlay (?). _(shipped 2026-07-14)_
- [x] **quick-open** — ⌘P go-to-file. _(shipped 2026-07-15)_
- [x] **settings-modal** — Settings modal (plan, appearance, notifications, coworkers, integrations). _(shipped 2026-07-14)_
- [x] **v0-design-system** — One v0/Geist token system across every control. _(shipped 2026-07-15)_
- [x] **geist-design-system** — Geist type + v0 gray ramp foundation, light + dark. _(shipped 2026-07-12)_

## Directing work

- [x] **comments-as-work** — Place work on the app; comments are the assignment mechanism (no chat). _(shipped 2026-07-15)_
- [x] **auto-assign** — Deterministic best-fit routing of work to coworkers by department and load. _(shipped 2026-07-15)_
- [x] **work-items-chip** — All open work pins in one dock popover. _(shipped 2026-07-15)_
- [x] **agents-as-files** — Coworkers as versionable files: `.velocity/coworkers/<id>.md` (name, role, department, model, autonomy, scope, budget) mirrors the active project's team; editing a file in the IDE applies live. _(shipped 2026-07-15)_
- [x] **mission-timeline** — A mission timeline in the Verify lens: landed checkpoints, merges, failures, and handoffs on a vertical rail, fed live by the heartbeat. _(shipped 2026-07-15)_

## Coworkers

- [x] **coworker-prototype** — Named coworkers with scopes, budgets, autonomy, states; missions; decision sheets; deterministic runtime behind the `CoworkerRuntime` seam. _(shipped 2026-07-12)_
- [x] **heartbeat** — Live deterministic progress: coworkers advance, land checkpoints, pick up next tasks. _(shipped 2026-07-15)_
- [x] **workers-panel** — Monochrome divided-list Workers panel with subagents and live tools. _(shipped 2026-07-15)_
- [x] **follow-mode** — Follow a coworker's work live. _(shipped 2026-07-14)_
- [x] **collaboration** — Human teammates: invites, live cursors, presence. _(shipped 2026-07-14)_
- [x] **local-coworker** — Real work, no API key: a work item created with the Local model runs the Ollama tool loop against the actual workspace — live action updates while tools run, the model's answer as a thread reply, and file changes landing as a checkpoint whose diff is computed from real before/after contents. _(shipped 2026-07-15)_
- [ ] **real-coworker-runtime** — First provider-backed coworker: Claude Agent SDK in a Node sidecar, `cwd` = a worktree, hooks → checkpoints, `canUseTool` → decision sheets. _(planned · phase 4 — blocked: needs an Anthropic/Gateway API key + the Node sidecar go-ahead)_
- [ ] **ai-gateway** — Vercel AI Gateway as the model layer: model strings, per-key budgets wired to the credits UI, BYOK. _(planned · phase 4 — blocked: needs an AI Gateway API key)_
- [ ] **ai-sdk-runtime** — Second runtime on Vercel AI SDK `ToolLoopAgent` for non-Anthropic models via Gateway. _(planned · phase 5 — depends on ai-gateway)_
- [ ] **worktree-per-coworker** — Real git worktree + branch per coworker (system git), shadow-git checkpoints for rollback. _(planned · phase 5 — depends on real-coworker-runtime)_
- [x] **mcp-tools** — The workspace as an MCP server: read_file / write_file / list_files / run_command / navigate_browser over the real services, in-process; Settings → Integrations lists the toolbelt via a live MCP client handshake. _(shipped 2026-07-15)_
- [ ] **mcp-external** — Plug third-party MCP servers into a coworker's toolbelt alongside the workspace server. _(planned · phase 6 — depends on real-coworker-runtime)_
- [ ] **acp-client** — Agent Client Protocol support so external agents (Claude Code, Codex, Gemini) can be hired as coworkers. _(planned · phase 6)_

## Review & shipping

- [x] **deploy-targets** — Ship to Vercel / Netlify / Cloudflare. _(shipped 2026-07-14)_
- [x] **compare-sources** — Compare candidate vs Stable / Live / Preview / Branch. _(shipped 2026-07-14)_
- [x] **checkpoint-diff-to-ide** — Click a checkpoint's changed file to open it in the IDE; heartbeat checkpoints reference real workspace files. _(shipped 2026-07-15)_
- [ ] **real-diffs** — Checkpoint diffs computed from real file changes (gix/git2 read-only). _(planned · phase 5 — depends on real-coworker-runtime + worktrees)_

## Browser

- [x] **real-browser** — Chrome-style in-app browser running the live workspace preview. _(shipped 2026-07-14)_
- [x] **browser-devtools** — Elements / Console / Network DevTools docked in the pane. _(shipped 2026-07-15)_
- [x] **device-preview** — Desktop / tablet / mobile viewport toggle. _(shipped 2026-07-15)_
- [ ] **child-webview-browser** — Real WebView2/WKWebView child-webview pane: no iframe blocking, real cookies. _(planned · phase 6)_
- [x] **devtools-console-input** — Evaluate JS in the live preview from the DevTools Console tab, with echoed input and results. _(shipped 2026-07-15)_

## IDE & tools

- [x] **workstream-shell** — CodeMirror editor, terminal, live preview, design canvas, nine on-demand studios. _(shipped 2026-07-12)_
- [x] **ide-file-tree** — File tree beside the editor. _(shipped 2026-07-15)_
- [x] **ide-search-replace** — Searchable tree + full find & replace. _(shipped 2026-07-15)_
- [x] **real-terminal** — Real shell over the workspace FS with bash/zsh/pwsh/node sessions. _(shipped 2026-07-14)_
- [x] **docked-tools-panel** — Bottom-docked developer tools panel. _(shipped 2026-07-15)_
- [x] **pty-terminal** — True native terminal in the desktop build: portable-pty (ConPTY/openpty) sessions behind Tauri commands, rendered by xterm.js with live resize; the browser preview keeps the workspace shell. _(shipped 2026-07-15)_
- [ ] **lsp** — TypeScript language server as a sidecar wired to CodeMirror (completions, diagnostics, rename). _(planned · phase 6)_
- [ ] **sandpack-preview** — Sandpack 2 self-hosted bundler for real npm projects (or real dev-server + webview). _(planned)_

## Native desktop

- [x] **real-fs-tauri** — Open any real project folder in the Tauri build. _(shipped 2026-07-12)_
- [x] **notifications-chime** — Chime + desktop notification on checkpoint (web-standard). _(shipped 2026-07-15)_
- [x] **native-notifications** — Native notification plugin wired: the desktop build sends real installed-app banners (web Notification API remains the browser fallback). _(shipped 2026-07-15)_
- [x] **persistence** — Projects survive restarts: every project's full workspace state is snapshotted (throttled + on close) and restored on launch; `?scenario=` starts a fresh deterministic seed. _(shipped 2026-07-15)_
- [x] **tray-badge** — System tray icon with an attention tooltip fed live by the cross-project inbox count, plus Open/Quit menu. _(shipped 2026-07-15)_
- [x] **global-shortcut** — Ctrl/⌘+Shift+V summons Velocity from anywhere (shows, unminimizes, focuses). _(shipped 2026-07-15)_
- [x] **window-state** — Window size/position remembered across launches. _(shipped 2026-07-15)_
- [ ] **auto-updater** — Signed in-app updates. _(planned · phase 2 — blocked: needs a signing key + release endpoint)_

## Research & docs

- [x] **integrations-research** — The real-runtime stack report (Vercel AI, Tauri native, agent OSS). _(shipped 2026-07-15)_

## Dropped

- **work-chat** — The New Work chat panel. Dropped 2026-07-15: directing work belongs on the app itself (comments-as-work), not in a chat thread.
