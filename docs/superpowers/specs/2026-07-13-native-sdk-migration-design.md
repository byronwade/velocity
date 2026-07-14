# Velocity → Native SDK Monorepo — Migration Design

**Date:** 2026-07-13
**Status:** In progress — Stages 0–4, 5.1–5.3, 6, 7, and 8 (docs) shipped on branch
`native-sdk-migration` (PR #3). Remaining: 5.4 (filesystem-backed files via SDK Cmd/Sub
effects). Each shipped stage is render-verified via the automation harness; web + site build
clean, desktop passes `native check --strict`.
**Owner:** Byron Wade

## Goal

Convert Velocity from a React + Vite browser SPA into a monorepo whose **desktop app is
built on the Vercel Native SDK** (`@native-sdk/cli`), with a Next.js marketing site and a
shared native UI library alongside it. Long-term target: a fast, tiny, single-binary,
Cursor-style native AI code editor — no browser/DOM/React in the shipped desktop binary.

The existing React app is **preserved** as `apps/web` (the parity reference), not deleted.

## Verified ground truth (2026-07-13, this machine)

- `@native-sdk/cli` **0.5.1** installs cleanly and runs (`native --version` OK).
- `native init` offers `--template ts-core | zig-core` and `--frontend native|next|vite|react|svelte|vue`.
- **ts-core is real:** app logic can be written as a TypeScript *subset* (`src/core.ts`,
  Model/Msg/update), transpiled ahead-of-time to Zig by `@native-sdk/core`. Subset-checker
  errors are NS1001–NS1060. We use this path (not raw Zig) for app logic.
- Native UI views are declarative Native markup (`.native` files) on the `UiApp` loop.
- `native doctor` on this host: target `windows-x86_64-gnu`; software GPU available
  (no custom GPU renderer required); **Zig missing** (needed for `native dev`/`build`/real
  binaries); WebView2 present (Chromium/CEF not wired on Windows — irrelevant, we go native).
- **`native check` validates core + markup + app.zon WITHOUT Zig** → primary verification
  lever until Zig is installed; real binaries come from CI (Stage 6).
- Authoritative docs live in the CLI: `native skills get core --full`, `native skills get
  native-ui`, `native skills get ts-core`, `native skills get automation`, `native skills get zig`.
  Treat these as authoritative over memory (SDK is pre-1.0).

## Target layout

```
velocity/
  apps/
    web/        # existing React app, moved verbatim (git mv, history preserved)
    desktop/    # NEW Native SDK app: app.zon, src/app.native, src/core.ts
    site/       # Next.js marketing site (Stage 7)
  packages/
    ui-native/  # shared .native primitives + token map
  package.json          # root (pnpm workspaces)
  pnpm-workspace.yaml
  turbo.json
```

Tooling: **pnpm + Turborepo**.

## App model (desktop)

Elm/TEA architecture:
- `src/core.ts` — `Model`, `Msg` discriminated union (on `kind`), `initialModel()`,
  `update()` as one exhaustive `switch`, optional `subscriptions()`. Stay inside the ts-core
  subset (no array methods — switch/ternary/spread). Effects are data (`Cmd`, `Sub`).
- `src/app.native` (+ `packages/ui-native`) — declarative markup views.
- `app.zon` — id/name, `display_name = "Velocity"`, `platforms = .{"macos","linux","windows"}`,
  1200×800 window with `gpu_surface`.

Style tokens by NAME only (`background="surface"`, `radius="md"`); icons from the built-in
compile-checked set only.

## Staged plan (drive one at a time; `native check` gate + commit each; push at marked points)

0. **Toolchain + feasibility** — install Zig 0.16 nightly; `native init` a throwaway;
   confirm `native check` (and, if Zig cooperates on Windows, `native dev`). De-risks all.
1. **Monorepo skeleton** — pnpm+turbo; `git mv` app → `apps/web`; verify it still builds.
2. **Scaffold `apps/desktop`** — `native init --template ts-core`; rewrite `app.zon`;
   replace demo; `native check --strict` clean.
3. **`packages/ui-native`** — shared primitives (SettingRow, Card, SectionHeader,
   SidebarItem, Toolbar, StatusBar, EmptyState) + token map; verify composition mechanism vs docs.
4. **App shell + Settings screen** — Cursor-style two-column settings; first real milestone.
   `native check --strict` clean. **→ PUSH + draft PR.**
5. **Native editor** (multi-step): (1) native code/text surface + document model in core.ts;
   (2) workbench chrome (activity rail, file tree, tabs, status bar, ⌘K); (3) agent/chat pane;
   (4) FS reads/writes as Cmd/Sub effects + app.zon capabilities. Track parity vs `apps/web`.
6. **CI packaging** — `.github/workflows/release.yml` matrix (macOS/Windows/Linux):
   install toolchain (+Zig), `native check --strict` + `native test` + `native package`,
   upload binaries (attach to Release on tags). Add fast `check.yml` per PR.
7. **Marketing site** (`apps/site`) — Next.js; landing/features/download.
8. **Docs & cleanup** — rewrite root README; finalize this doc as parity/status; confirm
   `native check --strict`, `pnpm build`, site build green. **→ FINAL PUSH; PR out of draft.**

## Findings during execution (supersede earlier assumptions)

- **Zig 0.16.0 installs on Windows via winget** (`zig.zig`), and `native build` produces
  real `.exe`s here (~4 MB). So Zig is available; the no-Zig fallback is a backup, not the plan.
- **`native build` success ≠ a working app.** It compiles the binary but does not prove the
  view renders. The authoritative per-stage gate is now **`native build -Dautomation=true`
  + launch + `native automate` snapshot**, asserting `dispatch_errors=0`, `widget_nodes>0`,
  and no `error event=` lines. Automation works headless on Windows (verified).
- **Cross-file markup `<import>` is NOT supported by the zero-config ts-core build.** The
  runtime embeds only `src/app.native` (`app_runner/ts_core_main.zig: @embedFile("app.native")`)
  as a bare MarkupView that doesn't resolve imports; importing a component file renders an
  empty view with `error event=... name=MarkupImport`. Import paths also may not escape the
  view-root dir (`../` is a hard error). **Decision:** UI primitives live as **in-file
  `<template>`s in `app.native`** (folded ui-native into the app, per advisor). A shared
  `packages/ui-native` / `src/components/*.native` is deferred until multiple view files
  justify `native eject` + `CompiledMarkupImports`.
- `native check`'s markup step also can't resolve cross-file imports; use `native markup
  check <root> --strict` for markup and `native build`+automation for the real gate.

## Risks

- **Zig 0.16.0 is nightly/unreleased** — Windows install may be fiddly. If `native dev`
  won't build here, fall back to `native check` as the gate + CI (Stage 6) for real binaries.
- **Scale** — Stages 5+ are a genuine rebuild of editor/terminal/agent against a new
  paradigm (no shared code with the React app); many sessions. Stages 0–4 are the achievable,
  high-value near-term arc and the point at which the pattern is proven end-to-end.

## Definition of done

Monorepo (web/desktop/site + ui-native) on pnpm+turbo; `apps/desktop` a real Native SDK app
passing `native check --strict` with the Settings screen + native editor shell driven by
Model/update; CI builds mac/win/linux binaries on tag and checks every PR; Next.js site
builds and links to releases; docs current; React app preserved as `apps/web`.

## Commit / push conventions

- Commit after each stage; push only at marked checkpoints (Stage 4, Stage 8).
- Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- No model identifier in any pushed artifact.
