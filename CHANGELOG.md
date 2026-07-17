# Changelog

All notable feature changes to Velocity. Every entry is written for an end user, not a committer.

**Format contract (do not break — a website consumes this file):** releases are `## YYYY-MM-DD · Title`
sections, grouped under `### Added` / `### Changed` / `### Removed` / `### Fixed`. Every entry is one
list item of the shape `- **slug** — Name. What changed and why it matters. (\`commit\`)`. The
**slug** is a stable kebab-case feature id shared with [ROADMAP.md](ROADMAP.md) — never rename one;
corrections get a new entry. Newest release first.

## 2026-07-16 · Chat joins the pane system

### Added
- **agent-handoffs** — Coworkers talk to each other. When a coworker lands real changed files, they hand the work to QA **in chat** — "@Iris — '…' just landed as a checkpoint. Can you give it a verification pass?" — and Iris answers with a real streamed model reply and flips to Verifying. And when any coworker's reply names a teammate ("@Theo can you…" or just "Theo"), that teammate answers for real. Chains are bounded (depth 2, one reply per coworker per exchange) and only happen when a local model is actually running — no canned agent theater.
- **chat-drag-pin** — Drag a chat message onto your app and it pins as work **right where you drop it**. Any message — yours or a coworker's reply — can be dragged from the Chat pane onto any panel; the drop point becomes the comment's position, the intent is auto-classified, a coworker auto-assigns, and the thread opens on the spot. The fastest path from "someone said it" to "someone's doing it".

### Changed
- **chat-sidebar** — The tab rail's chat icon is gone — with chat living in the panels, the rail is back to just projects, inbox, and profile. ⌘⇧C, the command palette, and the view dropdown are the ways in.
- **pane-drag-drop** — Every view in a panel's dropdown now shows its shortcut key (1–8), so the fastest way to switch is always one glance away.
- **chat-sidebar** — Chat is a pane view now, not a bespoke sidebar. Pick **Chat** from any panel's view dropdown (key **8**), and arrange it exactly like Browser, IDE, or Terminal — split it, drag it anywhere, resize it with the ordinary pane dividers. Everything the chat could do comes along: streamed real-AI replies, @Name routing, pin-as-work, the composer with the model chip. **⌘⇧C** still toggles a Chat pane and lands you in the composer, and the tab-rail chat button and command palette do the same. One layout system, no special windows — your workspace is fully yours to arrange.

## 2026-07-15 · Review you can trust

### Changed
- **workers-panel** — Find your coworkers in one click. When a coworker has a live marker, their "what I'm doing now" line in the Workers panel is a jump button — it focuses the pane on the lens where they're working (or opens that lens) and confirms with a toast; the context menu gets a matching "Jump to their work" item. Coworkers between tasks stay plain text.
- **chat-sidebar** — Coworker replies can be pinned as work now (hover a reply → pin) — an AI suggestion becomes an auto-assigned work item in one click, same as your own messages. **⌘⇧C** toggles the chat and drops you straight into the composer (listed in the ? shortcuts help), and the model chip greys out in italics while Ollama is offline and recovers by itself when it comes back.
- **checkpoint-readiness-gates** — The dock's Review alert shows how much is waiting: a count badge appears when more than one checkpoint is ready ("Review · 3"), with a matching tooltip.
- **checkpoint-readiness-gates** — Open gates are actionable now: clicking one jumps straight to the lens where you close it (criteria and evidence → Verify, tests → Tests, build → Terminal), and closing the loop really works — Run all verifies the criteria, Re-run scenario attaches the recorded trace as typed evidence, and the true green "Accept & merge" comes back only when every gate passes. Also fixed the state bug the gates surfaced: verifying a criterion updated the active mission but not the missions list, so downstream readers saw stale counts.
- **chat-sidebar** — Chat activity is actionable: a "landed — ready to review" row is a button that opens that coworker's checkpoint directly in Review (hover shows the affordance). And while a coworker's reply streams in, the feed follows it — unless you've scrolled up to read history, in which case it stays put.
- **chat-sidebar** — The chat input is the AI Elements composer card now — the one designed for exactly this: a rounded card with the focus ring on the card itself, a borderless auto-growing textarea on top, and a tools row below with an @-mention button, a **live model chip** (shows which local model actually answers; click it to pin any installed Ollama model or return to auto), and the dark arrow-up send.

### Added
- **checkpoint-readiness-gates** — Accept is earned, not assumed. Every checkpoint now derives readiness gates from typed evidence — build, tests, the mission's acceptance criteria, and its required evidence kinds — shown as a pass/fail list in Review. While any gate is open, "Accept & merge" is replaced by an explicit two-step **"Waive gates & accept…" → "Confirm — waive N gates"**, and a waived accept is audited by name in the activity log ("accepted with 2 gates waived (Acceptance criteria, Required evidence)"). One pure derivation is shared by the runtime (enforcement) and the UI (display), so the button can never disagree with the rule. First demo-harness prototype of the phase-3 platform epic.

## 2026-07-15 · Platform research and roadmap

### Added
- **platform-research-roadmap** — Production roadmap corpus. Velocity now carries the complete VS Code, Cursor, and Figma research in source control: repository audit, accepted Code-OSS convergence architecture, source-authority and security models, phases P0–P8, work packages, acceptance gates, metrics, source registry, and a generated 457-record feature backlog for issue and implementation planning. (`documentation`)

### Changed
- **integrations-research** — The focused runtime-stack memo now links into the larger platform roadmap and remains the implementation note for Vercel AI, Tauri-native capabilities, agent SDKs, MCP/ACP, worktrees, and native execution. (`documentation`)

## 2026-07-15 · A workspace you can rearrange

### Added
- **pane-drag-drop** — Move panels anywhere. Drag a panel by its toolbar onto any other panel — a blue outline shows exactly where it will land (left / right / top / bottom half) and the layout restructures on drop.
- **chat-sidebar** — Collaborative chat. A togglable sidebar (button left of the tabs, v0-style) where you, teammates, and coworkers share one thread — agents answer and riff off each other ("I'll take the design side once Iris lands theirs"), @Name directs a request, pinned work items appear inline, and the activity stream (started / landed / completed) flows through automatically, so it doubles as a live progress log. Deliberately not the core: directing work stays on the app via comments.
- **terminal-lens** — Terminal as a panel view. The real terminal joins the view dropdown (key 3) — any panel can be a terminal.
- **browser-tabs** — Browser tabs. The in-app browser gets IDE-style tabs, each with its own history; new-tab and close controls included.
- **vertical-tabs** — Arc-style vertical tabs. Settings → Appearance can switch the project tabs from the top row to a collapsible left rail — tabs stacked with their status rings, inbox and profile at the bottom.
- **ai-chat** — The chat is really AI now. Coworker replies are actual model output, streamed token-by-token through the **Vercel AI SDK** (`streamText` + the OpenAI-compatible provider) against local Ollama — no API key. Each coworker answers in persona ("You are Iris, the QA…"), `@Name` routes directly, and when a request spans departments a **second coworker replies with the first one's actual answer in context** — agents genuinely building on each other. A typing indicator shows while a reply streams; if no local model is available, the deterministic lines return as an honest fallback. Swapping to AI Gateway later is a baseURL + key change.
- **checkpoint-patch** — See exactly what changed. Real checkpoints now carry the actual line-level diff (computed from before/after snapshots, long unchanged runs folded) and Review renders it as a proper patch — green additions, red removals, per file.
- **real-rollback** — Reject really reverts. Rejecting a real checkpoint restores the workspace from inverse snapshots: files the model created are deleted, edits are restored to their prior content. Verified: a model edit to TODO.md was rejected and the file came back byte-for-byte.
- **chat-pin** — Chat → work in one click. Hover any of your chat messages and pin it as a work item; it lands on the app and auto-assigns exactly like a placed comment.
- The command palette now covers the new surfaces: toggle the chat sidebar and switch to vertical tabs from ⌘K.
- **fluid-presence** — Presence moves like people. While coworkers work, their markers drift around what they're working on — the heartbeat sets deterministic waypoints and 2.9-second eased glides carry them there, so motion is continuous and organic, never jagged or teleporting. Human collaborators' cursors glide the same way. Reduced-motion turns it all off.
- **quiet-chrome** — Minimalism pass. Pane toolbar controls (split, close, IDE tools) stay invisible until you hover or focus the pane; cursor name labels are softer; the resting frame belongs to the content.

### Changed
- **chat-sidebar** — The chat is a real AI surface now: wider by default (380px) and drag-resizable like every panel, restyled on the AI SDK Elements patterns — user messages as right-aligned bubbles, coworker replies plain-left with identity, a proper PromptInput (auto-growing, embedded send), one-tap Suggestions before the first message, and hover copy Actions on every message.
- **real-terminal** — VS Code-style terminal sessions: a tab per terminal (`bash · 1`, `pwsh · 2`, …) with per-tab kill, a **+** dropdown that opens any shell type (bash / zsh / pwsh / node), and a kill-active control — in both the docked panel and the Terminal pane view.
- **browser-compact** — The browser is ONE bar. Nav, tabs, the centered omnibox, device preview, DevTools, and a ⚙ settings menu (new tab, copy URL, open externally, start page, zoom) all live in a single 40px row, fully on the design tokens — bookmarks bar and the profile avatar are gone (not needed in this environment).
- **divider-grip** — Panel grab bars are obvious now: a wider hit area, a visible grip pill on hover, and a strong active state; resizing stays smooth with live snap points.

### Fixed
- **verify-runs** — No dead buttons anywhere. The Verify lens's Run / Run-all and the scenario re-run actually run (checking → verified with staggered progress and events; stuck criteria complete), the Tests lens's per-suite and run-all buttons execute with live running states, the System lens's scenario run and the Data lens's query run respond, and **Roll back on a real checkpoint restores the files for real** — same inverse snapshots as Reject.
- **live-doc-refresh** — Open editors never go stale. When a rejected checkpoint reverts files or the workspace rewrites a coworker definition, any pane showing that file updates in place (shared-document `replaceAll` fans out to every view). Verified: maya.md open in the editor updated live when Maya's autonomy changed.
- **comment-dismiss** — Comment windows close on click-away. Clicking anywhere outside an open thread or composer dismisses it (Esc still works).
- **chat-sidebar** — The activity portion of the feed no longer repeats itself: cycling sim tasks are deduped against recent entries, so the chat stays readable while the full history remains in the Activity panel.
- **terminal-lens** — Terminal actually appears in the panel view dropdown now. The dropdown had its own stale view list; there is one canonical `LENS_ORDER` in the model shared by the dropdown and the 1–7 keys.

## 2026-07-15 · The first real coworker

### Added
- **local-coworker** — Real work, no API key. Create a work item with the **Local** model and the assigned coworker actually does it: the Ollama tool loop (read/write files, run commands, search) runs against the real workspace, the coworker's action updates live as tools execute, the model's answer lands as a thread reply, and file changes become a checkpoint whose diff is **computed from actual before/after contents**. Small models that narrate a tool call as JSON instead of invoking it get rescued — the call is parsed and executed for real. Verified end-to-end: `qwen2.5-coder:1.5b` created a file and its `+1 −0` diff landed in Review, credited "by qwen2.5-coder:1.5b (local)".
- Real checkpoints outrank the demo heartbeat: simulated momentum can never supersede or bury a checkpoint produced by an actual model run.

## 2026-07-15 · Native foundation

### Added
- **mcp-tools** — The workspace speaks MCP. Velocity's real services are now a Model Context Protocol server — `read_file`, `write_file`, `list_files`, `run_command`, `navigate_browser` — running in-process. Settings → Integrations shows the live toolbelt via an actual MCP client handshake. This is the standard seam every coworker runtime (and any external agent) will consume.
- **pty-terminal** — A true native terminal. The desktop build's terminal panel now runs real PTY sessions (ConPTY on Windows, openpty elsewhere) through your actual shell — bash, pwsh, cmd, node — rendered by xterm.js with live resize and session tabs. The browser preview keeps the sandboxed workspace shell.
- **persistence** — Projects survive restarts. Every project tab's full workspace state (coworkers, missions, checkpoints, comments, layout) is snapshotted continuously and restored on the next launch. `?scenario=` still seeds a fresh deterministic demo. Verified: a placed work item survived a full reload.
- **native-notifications** — Native desktop banners. The Tauri build now uses the OS notification system for "checkpoint ready" (proper installed-app identity); the browser preview keeps the web Notification fallback. Same Settings toggle governs both.
- **tray-badge** — System tray presence. Velocity gets a tray icon whose tooltip reflects the live cross-project inbox count ("Velocity — 3 need you"), with Open/Quit menu items.
- **global-shortcut** — Summon from anywhere. Ctrl/⌘+Shift+V shows, unminimizes, and focuses Velocity system-wide.
- **window-state** — The desktop window remembers its size and position across launches.

## 2026-07-15 · Agents as files

### Added
- **agents-as-files** — Coworkers are files. Every live coworker is mirrored to `.velocity/coworkers/<id>.md` — simple frontmatter for name, role, department, model, autonomy, scope, and budget. Edit a file in the IDE and save: the coworker updates live. Coworkers are now versionable, diffable, shareable artifacts, the same pattern as Cursor rules and Claude Code subagents.
- **mission-timeline** — Mission timeline. The Verify lens gains a vertical milestone rail — landed checkpoints, merges, failures, and handoffs, newest first, fed live by the heartbeat — so the mission's arc is readable at a glance.
- **checkpoint-diff-to-ide** — Diff → IDE. Click a changed file in a checkpoint to open it in the Code pane (the review rail closes behind you). Heartbeat checkpoints now diff real workspace files; seeded example paths say so instead of opening a blank.
- **devtools-console-input** — Console input. The browser DevTools Console gains an eval line — type an expression, it runs inside the live preview (sandboxed, like Chrome DevTools) and echoes the input and result.

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
