# CLAUDE.md

Guidance for working in this repository. Velocity is a **browser-native, agent-native workspace** —
a React SPA where the editor, terminal, browser, agent, design canvas, and studios are all views
over one in-memory workspace. Everything runs client-side; there is no backend or language server.

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

- **State** — zustand in `src/lib/store.ts` (tabs, recursive split-pane trees, chrome). Persisted
  to `localStorage`. Selective subscriptions keep re-renders cheap; `useSyncExternalStore` snapshots
  must be **stable references** (returning a fresh `[]` causes an infinite render loop).
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
  data, api, …) to a content component. Any pane can host any mode.

## Conventions

- TypeScript + tabs; match the surrounding file's style and comment density.
- Keep everything real — derive from the FS/services, never mock data in UI.
- Overlays open via `window` events (e.g. `velocity:command-palette`, `velocity:open-keybindings`);
  the keybinding service dispatches them from commands.
- Prettier is available in-browser (`src/services/format.ts`), lazy-loaded; house style is tabs,
  single quotes, width 100.
