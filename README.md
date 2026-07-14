# Velocity

A fast, browser-native, agent-native workspace — an AI code editor, terminal, real browser,
live editor, and app builder over one in-memory workspace. Built as a React + Vite SPA and
shipped as a native desktop app by wrapping that frontend in [Tauri](https://tauri.app) (a
tiny native WebView shell, no Electron).

![Velocity](docs/screenshots/editor.png)

## Monorepo layout

```
apps/
  web/    # the Velocity app — React + Vite SPA; also the Tauri desktop frontend (src-tauri/)
  site/   # marketing site (Next.js)
```

Tooling: **pnpm workspaces + Turborepo**. The desktop shell lives in
[`apps/web/src-tauri`](apps/web/src-tauri) — a small Rust/Tauri host that loads the built web
app in a native window.

## Develop the app

```bash
pnpm install
pnpm --filter web dev      # http://localhost:5199
pnpm --filter web build    # production build → apps/web/dist (also the fastest full typecheck)
```

## Run it as a native desktop app

Requires the Rust toolchain ([rustup](https://rustup.rs)). On Linux also install the WebKitGTK
dev packages (`libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`).

```bash
cd apps/web
pnpm desktop           # tauri dev — native window over the Vite dev server (hot reload)
pnpm desktop:build     # tauri build — native binary + platform installers
```

Tauri starts the Vite dev server for you (`beforeDevCommand`) and, for release builds, runs
`pnpm build` first (`beforeBuildCommand`), then bundles `apps/web/dist` into the native shell.
Window and bundle config live in [`apps/web/src-tauri/tauri.conf.json`](apps/web/src-tauri/tauri.conf.json).

## CI

- **[`.github/workflows/check.yml`](.github/workflows/check.yml)** — builds the web app (the
  Tauri frontend) and the marketing site on every PR/push.
- **[`.github/workflows/release.yml`](.github/workflows/release.yml)** — on a `v*` tag,
  cross-compiles the Tauri desktop app for macOS, Windows, and Linux and attaches the
  installers to a draft GitHub Release (via `tauri-apps/tauri-action`).

## Architecture

See [`CLAUDE.md`](CLAUDE.md) for the app internals — the zustand workspace store, the DI
service container, the in-memory filesystem, the CodeMirror editor host, the VS Code-style
keybinding engine, the sucrase-powered live preview, and the project graph.
