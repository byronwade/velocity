# CLAUDE.md

Guidance for working in this repository. Velocity is an **autonomous software-development
workspace** — a React SPA shipped as a **Tauri 2** desktop app, where named AI coworkers
continuously build a shared project while the human directs, observes, and approves. Everything runs
client-side; there is no backend or language server (persistence and real worktrees are still mocked
— see the merge spec under `docs/superpowers/specs/`).

**The default app is the Phase-1 prototype in `src/velocity/`** (`VelocityApp`, mounted by
`src/App.tsx`). It is deterministic and provider-free: a `CoworkerRuntime` (`src/velocity/runtime.ts`)
produces every state transition, bound to React via `useSyncExternalStore`. The design target is
**v0.app / Geist / shadcn** — enforce the token layer in `src/styles/tokens.css` (one radius /
control-height / dialog / popover spec) rather than redesigning. Standing rules: **no content
shifting** (transient UI overlays; verify with `getBoundingClientRect`), and **always deliver a
screenshot** for a UI change (drive the built app in Playwright). The earlier workstream shell
(`src/workbench/`) is legacy but still owns the shared services the prototype's IDE and tools render.

Key `src/velocity/` files: `model.ts` (types + `LayoutState` + `WORK_INTENTS`), `runtime.ts` (the
deterministic runtime + `pickCoworker` auto-assign), `workspace.ts` (the multi-project manager;
`runtime` is a Proxy to the active tab), `Stage.tsx` (split panes, the `IDELens` file tree, the
`WorkComposer`/comment threads), `surfaces.tsx` (rails, docked `ToolDrawer`, command bar),
`Dock.tsx`, `TabBar.tsx`, `SettingsSheet.tsx`, and `velocity.css`. Work is directed via **comments,
not chat**: "New work" arms placement → click the app → describe → auto-assign. The Browser
(`src/modes/BrowserMode.tsx`) is a real in-app browser with DevTools.

## Commands

```bash
npm run dev        # Vite dev server → http://localhost:5199
npm run build      # production build (also the fastest full typecheck of app code)
npm run typecheck  # tsc --noEmit
npm run preview    # serve the production build on :5199
```

Always run `npm run typecheck` and `npm run build` before committing. Prefer verifying UI changes
by driving the built app in a headless browser (Playwright) over asserting on code alone.

## Architecture

- **Product shell** — `src/workbench/VelocityWorkbench.tsx` is the top-level UI: the workstream
  sidebar plus the Conversation / Work / Review views. The Work view keeps four core surfaces
  (Code, Terminal, Preview, Design) as fixed tabs and surfaces the nine studios **on demand** as
  dismissible tabs. Every surface is the matching `src/modes/*` component, mounted per-workstream via
  the `SURFACES` registry; a tool is opened by dispatching `velocity:open-tool` (from a ⌘K "Go to
  Tool" command in `registerAppCommands.ts`, and later from the agent). Workstream data lives in
  `src/workbench/model.ts` (in-memory fixtures); the Code-surface file tree is
  `src/workbench/WorkFiles.tsx` and binds files with `editor.bindPane`.
- **State** — zustand in `src/lib/store.ts` (tabs, recursive split-pane trees, chrome). Persisted
  to `localStorage`. The split-pane tree still backs the low-level pane/editor plumbing, but the
  product shell above is the workbench, not the old pane rail. Selective subscriptions keep
  re-renders cheap; `useSyncExternalStore` snapshots must be **stable references** (returning a fresh
  `[]` causes an infinite render loop).
- **Services** — a DI container (`src/services/container.tsx`) vends `fs`, `editor`, `shell`,
  `browser`, `agent`, `graph`, `preview`, `design`, and more behind interfaces. Non-React callers
  use `getServices()`.
- **Filesystem** — an in-memory FS (`src/services/filesystem.ts`) is the single source of truth the
  editor, Explorer, terminal, and preview all read/write.
- **Editor** — CodeMirror 6 host (`src/editor/CodeMirrorHost.tsx`); shared `TextDocument` backs
  every pane on the same file. Editor prefs drive a reconfigurable compartment.
- **Keybindings** — `src/keybindings/` is a VS Code-style engine: `commands.ts` (registry),
  `keys.ts` (physical-key match), `when.ts` (context expressions), `service.ts` (defaults + user
  overrides + chord dispatch), `defaults.ts` (VS Code keymap), `registerAppCommands.ts` (handlers).
  Add a user action as a **command** and bind it in `defaults.ts` — don't add ad-hoc `keydown`
  listeners.
- **Live preview** — `src/services/preview.ts` transpiles the workspace TS/TSX with **sucrase** and
  runs it against vendored React (`public/vendor/`) in a sandboxed iframe. CSP-safe, no CDN.
- **Project graph** — `src/lib/graph.ts` + `src/services/graph.ts` derive typed nodes/edges from
  static analysis of the FS; the map, command palette, and design canvas are views over it.
- **Modes** — `src/modes/registry.tsx` maps each mode (editor, terminal, browser, builder, design,
  database, api, observe, test, ship, home, mission, library) to a `{ paneId }` content component.
  The workbench mounts these as the Work-view surfaces (four core + nine on-demand studios); each is
  self-contained and reads from the services, so it renders standalone.

## Conventions

- TypeScript + tabs; match the surrounding file's style and comment density.
- Keep everything real — derive from the FS/services, never mock data in UI.
- Overlays open via `window` events (e.g. `velocity:command-palette`, `velocity:open-keybindings`);
  the keybinding service dispatches them from commands.
- Prettier is available in-browser (`src/services/format.ts`), lazy-loaded; house style is tabs,
  single quotes, width 100.
