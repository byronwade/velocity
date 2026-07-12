# Velocity

An open-source, browser-native workspace that fuses an AI-agent IDE, a real terminal, a live
editor, a real embedded browser, and a v0-style "generate any app" builder — with Framer-grade
real-time collaboration and deploy-anywhere freedom.

This directory is the **product shell** (a React SPA), distinct from the VS Code fork at the repo
root. See the master spec discussion for the full vision; this app implements it milestone by
milestone.

## Status — Milestone 1: Shell skeleton ✅

The shell is real and runnable. The chrome (tabs + command header) never changes; the content of a
tab changes with its active **mode**.

- **Row 1 — Tab strip** (browser-style, topmost): per-tab context, add/close/switch, mode glyph, middle-click close.
- **Row 2 — Command header** (Framer IA, left→right): sidebar toggle · navigation/breadcrumb · contextual actions · **center mode dropdown + title + branch** · site actions · presence stack · Invite · Share.
- **Row 3 — Sidebar** (activity rail + collapsible panel) **+ recursive split workspace**: any pane splits horizontally/vertically, recursively; drag resizers; split/close/maximize per pane. Any pane hosts any mode.
- **Row 4 — Status bar**: branch, perf, pane/tab counts, presence.
- **Five modes** (stubs for M1, real in later milestones): Agents · Live Editor · Terminal · Browser · Builder.
- Light / dark theming from one token system; layout + theme persist per session (`localStorage`).

### Keyboard
- `⌘/Ctrl + T` new tab · `⌘/Ctrl + W` close tab
- `⌘/Ctrl + 1–5` set the active pane's mode
- `⌘/Ctrl + \` split right (`⇧` = split down) · `⌘/Ctrl + Enter` maximize pane

## Architecture

- **Shell**: React 18 + TypeScript + Vite. The workspace of every tab is a **recursive split-pane tree** (`lib/types.ts`, `lib/tree.ts`) serialized per tab.
- **State**: zustand (`lib/store.ts`) with selective subscriptions; persisted to `localStorage` (a stand-in for the future CRDT/server sync).
- **Modes**: a registry (`modes/registry.tsx`) maps each mode to metadata + a content component, so a pane renders its mode without the shell knowing the details.
- No runtime dependency beyond React + zustand; icons are inline SVG (CSP-safe).

## Roadmap (vertical slices)

1. **Shell skeleton** ✅ — layout, recursive splits, tabs, mode dropdown.
2. Live Editor — Monaco/CodeMirror + LSP + file model + git basics.
3. Terminal — WebContainer runtime + xterm.js, splits, persistent sessions.
4. Browser — real embedded browser bound to the dev server, element-to-code.
5. Collaboration — Yjs CRDT + presence/awareness across editor/terminal/browser.
6. Agents — chat + @context + inline edit + Composer + autonomous loop + MCP/ACP.
7. Builder — prompt-to-app, versions, visual+code parity.
8. Deploy-anywhere — pluggable target adapters (Docker/K8s/Fly/Cloudflare/Netlify/VPS/portable).

## Develop

```bash
npm install
npm run dev        # http://localhost:5199
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

`?theme=light` / `?theme=dark` forces a theme (handy for shareable links / previews).
