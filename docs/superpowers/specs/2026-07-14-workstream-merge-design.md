# Workstream shell × full tool depth — merge & design

**Date:** 2026-07-14
**Status:** Approved to build (user chose "on-demand tools via command palette" + "branch → merge to main")
**Owner:** Byron Wade
**Branch:** `agent/revamp-workstream-ui-v2` (off `agent/revamp-workstream-ui`) → merge into `main`

## Goal

Make `main` the **workstream-first** app (the revamp's new workflow + layout) while preserving the
**full depth of the original tools** — the IDE/editor, terminal, browser, design, and every studio —
inside the new paradigm. Design bar: smooth, minimal borders, calm, easy to read and use.

## Starting point (what the revamp already gives us)

The revamp (`516215a`, one commit on `main`) is sound and stays the foundation:

- New shell `src/workbench/VelocityWorkbench.tsx` — sidebar of workstreams (Needs attention / In
  progress / Recent), and per-workstream **Conversation / Work / Review** views.
- **Real tools mounted**, not mocked: `EditorMode`, `TerminalMode`, `BrowserMode`, `DesignStudio`,
  `AgentThread`, each with a per-workstream `paneId`.
- **Keeps** the VS Code keybinding engine, Command Palette, Quick Open, Todo Index, Chord Status,
  Keyboard Shortcuts (all still booted in `App.tsx`).
- Its own root `src-tauri/` (flat `src/` layout). This supersedes the abandoned `apps/web` monorepo
  Tauri experiment.

Mocked seams stay mocked (workstream persistence, real git worktrees, criteria verification, cost).
That is future backend work and out of scope here.

## Gaps to close

1. **Only 4 of 14 tools reachable.** The old app had 14 modes (`src/modes/registry.tsx`): agents,
   editor, terminal, browser, **builder, database, api, observe, design, test, ship, home, mission,
   library**. The Work view surfaces only Code / Terminal / Preview / Design.
2. **No file Explorer.** The file tree lived in `src/components/Sidebar.tsx` (Explorer / Search /
   Source Control / Agents / Deployments), which the new shell doesn't mount. The Code artifact can
   show already-open files as tabs but has no tree to open new ones — its empty state literally says
   "Open a file from the Explorer."
3. **Design polish.** `workbench.css` (603 lines) needs a pass for the "minimal borders, smooth,
   calm" bar: replace hard 1px borders with hairlines/elevation, unify radii/spacing, quiet the
   surfaces.

## Design

### 1. On-demand tools (the chosen model)

The Work view stays minimal — **the 4 core surfaces are the only permanent tabs**: Code, Terminal,
Preview, Design. The other **9 studios appear only when needed**:

- **Summoned via the command palette** (⌘K → "Open Database", "Open API runner", "Run tests", …).
  Each studio registers a command in `registerAppCommands.ts` that dispatches
  `velocity:open-tool { tool }`.
- **Surfaced by agent activity** (the plumbing, ready for real tool-use later): a store action
  `openTool(workstreamId, toolId)` the agent layer can call so a studio foregrounds itself when the
  agent's work touches it. Today it's driven by ⌘K + programmatic calls; wiring it to real agent
  tool-use is future backend work.

**Mechanism.** `ArtifactView` holds `core` (fixed 4) + `openTools` (a per-workstream ordered set).
A summoned tool is appended as a **dismissible tab** after the core 4 and activated; dismissing it
returns focus to the last core surface. Studios render generically through the existing registry:
`MODE_DEFS[toolId].Content` with `paneId={`work:${id}:${toolId}`}`. No studio is rewritten — they're
the same real components, just mounted on demand. When no tool is summoned, the bar shows exactly the
4 core surfaces — nothing extra.

### 2. File Explorer in the Code artifact

Give the Code surface a slim, collapsible **file tree** on its left (reusing the tree logic from
`Sidebar.tsx`, extracted into a lean `WorkFiles` component — no activity rail, matching "no icon
rail"). Clicking a file binds it into the editor pane via the existing `editor.bindPane` /
`openFileInActivePane` path. Collapses to nothing so the editor can be full-width. Search / Source
Control / Deployments remain reachable via ⌘K, not as a permanent rail.

### 3. Design pass — "minimal borders, smooth, calm"

**Anchor to the existing approved token system** (`tokens.css` / `app.css`, the Geist/v0 family).
`workbench.css` already consumes it — 216 `var(--…)` refs (`--fg`, `--line`, `--panel`, `--muted`,
`--elev-1`, `--ease`, …), only ~22 stray hex to fold back into tokens. So this is a *refinement of
the same look*, not a new visual language.

- **Borders → hairlines + elevation.** `--line`/`--line-2` are referenced 52× — the "borders
  everywhere." Soften at the **token level** first (hairline via `color-mix`, ~8–10% ink) so one
  change propagates; lean on background steps and `--elev-*` shadows to separate regions instead of
  outlines.
- **Consistent geometry.** One radius scale, one spacing scale; align sidebar, header, composer,
  artifact bar. Fold the 22 stray hex back into tokens.
- **Quiet surfaces.** Fewer boxes-in-boxes; generous padding; muted labels; a single restrained
  accent. Smooth transitions on hover/active/layout switches.
- **Light + dark** both tuned (`data-theme`).
- Verify against the reference feel: ChatGPT/Cursor-calm, not IDE-busy.

## Non-goals

- No backend/persistence/worktree/criteria-verification work (stays mocked, as the branch frames).
- No rewrite of the individual tools/studios — reuse them as-is.
- No new modes; only re-surface the existing 14.

## Validation

- `npm run typecheck` + `npm run build` clean.
- Browser-drive the app: create/select a workstream; switch Conversation/Work/Review; open each core
  surface; summon 2–3 studios via ⌘K and dismiss them; open a file from the new tree and edit it;
  toggle light/dark; collapse the sidebar to 0.
- Screenshot the native Tauri window (existing PowerShell capture method) for the before/after design.

## Delivery

Sequencing (per review): **plumbing (tools + tree) → design pass → screenshot checkpoint → merge.**

Build on `agent/revamp-workstream-ui-v2`, validate, do the design pass, then **show the user a
before/after screenshot of what's about to hit `main` and get one explicit yes** (this honors their
standing "review designs by screenshot" demand; it does not conflict with the "branch → merge"
git choice) — then **merge into `main` and push**.

Pre-build verifications (before generalizing "reuse studios as-is"): mount **Database** and
**Builder** with only a `paneId` and confirm they render standalone (don't blank out or depend on the
old shell/Explorer). If a studio hard-depends on the old chrome, adapt that studio minimally.
