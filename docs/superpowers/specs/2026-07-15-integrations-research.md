# Integrations research — building Velocity the way Cursor is built

_Research date: July 15, 2026. Three parallel web-research passes (Vercel AI stack, Tauri
native capabilities, agent-runtime OSS), synthesized against Velocity's seams: the
`CoworkerRuntime` interface, the service container (fs/shell/browser/preview), the credits/budget
UI, checkpoints/Review, and the inbox._

## The recommended stack (TL;DR)

| Layer | Pick | Why |
|---|---|---|
| Model access | **Vercel AI Gateway** (`@ai-sdk/gateway`, bundled in `ai`) | One key → hundreds of models as plain strings (`"anthropic/claude-opus-4.8"`); **per-key budgets** map 1:1 onto our credits UI; OpenAI- and Anthropic-compatible endpoints; zero markup; BYOK. |
| Agent loop (UI-side) | **Vercel AI SDK 7** (`ai`, Apache-2.0) | `Agent`/`ToolLoopAgent` with `stopWhen`/`prepareStep` loop control, **tool-approval policies** (approve/deny/ask — our autonomy levels), typed UI messages, `DirectChatTransport` = no server needed. |
| Coworker runtime (real work) | **Claude Agent SDK** (TS) in a **Node sidecar** | The Claude Code loop as a library: file/bash/search tools, **subagents = our named coworkers**, hooks = our checkpoint/budget enforcement, `permissionMode` = our autonomy, `cwd` = a worktree. Proven Tauri-sidecar pattern exists. Not OSI-open (Anthropic commercial terms), Anthropic models only. |
| Tool interop | **MCP** (`@modelcontextprotocol/sdk` v1 now, v2 landing with the 2026-07-28 spec) | Expose our existing fs/shell/browser/preview services as in-process MCP servers → every runtime consumes them identically; users can plug third-party MCP servers into a coworker's toolbelt. |
| Runtime abstraction (later) | **ACP — Agent Client Protocol** (Apache-2.0, from Zed) | Implement Velocity as an ACP *client* and coworkers become swappable agent servers (Claude Code, Codex, Gemini, OpenHands) — we never marry one vendor. This is the strategic hedge. |
| Isolation & review | **worktree-per-coworker + shadow-git checkpoints** (pattern, not a lib) | The Q1-2026 industry standard (Cursor parallel agents, Claude Code worktrees). Worktree lifecycle is ~200 lines of `git worktree add/remove`; Cline's shadow-git (per-tool-call commits in a hidden repo) is the model for our checkpoint/rollback. |

## Native desktop (Tauri v2)

All official plugins live in `tauri-apps/plugins-workspace` (MIT/Apache-2.0). Every command must
be allowed in a per-window **capability** file.

- **Notifications** — `@tauri-apps/plugin-notification`: native banners for "checkpoint ready".
  We shipped a web-standard chime + Notification-API fallback already (`src/velocity/notify.ts`);
  swap in the plugin when we care about proper installed-app banners on Windows (dev-mode shows
  the PowerShell icon — known caveat). The plugin's `sound` option plays even when backgrounded.
- **Persistence** — `plugin-fs` (scoped real-disk IO) + `plugin-store` (persisted KV JSON) replace
  the in-memory FS + localStorage for real projects; `plugin-dialog` for "open project folder".
- **Chrome** — tray icon (in core now: badge "N checkpoints waiting"), `plugin-global-shortcut`
  ("summon Velocity" from anywhere), `plugin-window-state`, `plugin-updater` (signed updates),
  `plugin-opener`.
- **Real terminal** — **`portable-pty`** (WezTerm's crate, MIT) behind ~200 lines of custom Tauri
  commands, streaming to **xterm.js**. This is the established pattern (tauri-terminal, Terminon).
  The packaged `tauri-plugin-pty` is one-maintainer/21-star — vendor the pattern instead.
  Per-workstream PTYs map naturally onto our per-pane ShellService seam.
- **Real git** — hybrid: **shell out to system git** for worktree lifecycle/commit/merge
  (guaranteed semantics, hooks, credentials) + **`gix` (gitoxide) or `git2`** read-only for fast
  status/diff rendering in Review. GitButler runs the same hybrid. gitoxide alone isn't enough
  (push/merge/rebase still incomplete, maintenance mode).
- **Real embedded browser** — Tauri 2 **child webviews** (`window.add_child`, behind the
  `unstable` feature): a real WebView2/WKWebView pane — no X-Frame-Options limits, real cookies,
  `webview.eval()`. Desktop-only, bounds must be synced manually, positioning bugs open. Use for
  the app-preview surface; keep our iframe browser as fallback.
- **Sound** — HTML5/WebAudio in the webview works (we ship it); WebView2 autoplay policy needs
  `additionalBrowserArgs: "--autoplay-policy=no-user-gesture-required"` or first-click unlock.
  Rust `rodio` via a command is the bulletproof fallback.
- **LSP (nice-to-have)** — `typescript-language-server` as a shell sidecar + the official
  **`@codemirror/lsp-client`** (transport-agnostic — write a small Tauri-IPC transport).

## The Vercel AI layer, precisely

- **AI SDK 7** (GA June 25, 2026; Node ≥ 22, ESM-only): `ToolLoopAgent` runs the LLM→tool loop
  with `stopWhen: stepCountIs(n)` / custom cost-cap predicates (→ our per-coworker budgets) and
  `prepareStep` per-step mutation (→ context trimming). v7 adds **agent-level tool approval**
  with signed approval tokens — that's our Decision Sheet, standardized. `useChat` is
  transport-based; **`DirectChatTransport`** invokes an agent in-process — no server. DevTools
  middleware inspects raw calls/tokens/timing.
- **AI Gateway**: the AI SDK's *default* provider — model strings route through it. Per-key spend
  limits + usage dashboards give us per-coworker attribution ("$1.2/5" in the Workers panel
  becomes real). Anthropic-Messages-compatible endpoint means even the Claude Agent SDK sidecar
  can be pointed at Gateway for unified billing. Desktop caveat: a key in an app is extractable —
  keep it in the Rust side/OS keychain, proxy via a Tauri command, cap with per-key budgets.
- **AI Elements 1.9** (Apache-2.0, shadcn registry — code is copied in, so it takes our Geist
  tokens): Conversation, Message, Prompt Input, **Tool** (tool-call rendering), **Reasoning**,
  Task, Artifact, Web Preview. Use as the base for coworker activity/thread views instead of
  hand-rolling. **Streamdown** for streaming-safe markdown.
- Skip for now: Workflow DevKit (durable agents — server-oriented, revisit for long-running
  coworkers), Flags SDK (Next-bound), WebContainers (closed-source, license, COOP/COEP pain).
- **Preview upgrade path**: Sandpack 2 (Apache-2.0, self-hostable bundler, works in WKWebView)
  beats our sucrase+iframe for real npm projects — but the desktop endgame is Cursor's: run the
  user's real dev server as a native process and point a (child) webview at it.

## "A system that helps create agents"

The pattern to steal is Continue.dev's (acquired by Cursor, June 2026): **agents as files** — a
markdown/JSON definition per coworker (name, role, model string, autonomy, tool allowlist, MCP
servers, scope globs, budget). Velocity's Add-Coworker UI writes one; the runtime hydrates it:
Gateway model string → AI SDK/Claude-SDK agent + MCP toolbelt + worktree. Coworkers become
versionable, shareable artifacts in the repo (`.velocity/coworkers/*.md`) — exactly how Cursor
rules/agents and Claude Code subagents work.

## Adoption roadmap

1. **Now (no new deps):** keep the deterministic runtime as the demo scenario engine. ✅ chime +
   web notifications shipped.
2. **Native foundation:** plugin-store + plugin-fs + plugin-dialog (real project persistence),
   plugin-notification, tray badge, window-state. Small, independent wins.
3. **Real terminal:** portable-pty commands + xterm.js behind the existing ShellService seam.
4. **First real coworker:** Node sidecar hosting the Claude Agent SDK, `cwd` = a git worktree,
   hooks → checkpoints, `canUseTool` → Decision Sheets, Gateway key (BYO) → credits UI. One
   coworker end-to-end before parallelism.
5. **Team:** worktree-per-coworker (system git) + shadow-git checkpoints; AI SDK 7 ToolLoopAgent
   as the second runtime behind `CoworkerRuntime` for non-Anthropic models via Gateway.
6. **Ecosystem:** MCP servers for our services; ACP client support so external agents can be
   hired as coworkers; child-webview browser; LSP.

## Codebases to read

**Kilo Code** (Apache-2.0 — orchestrator/subagent UX), **Vibe Kanban** (Apache-2.0 —
kanban-per-worktree driving 10+ CLI agents), **Crystal** (MIT — desktop parallel Claude sessions),
**Cline** (checkpoint/shadow-git design), **OpenHands software-agent-sdk** (MIT — cleanest harness
architecture), **Better Agent Terminal** (Tauri + Node sidecar + Claude SDK, our exact embedding),
**Zed ACP** examples. Void is paused; Roo archived; Continue read-only — reference only.
