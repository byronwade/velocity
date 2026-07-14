# Velocity

Velocity is an open-source, local-first developer workstream environment. It keeps a feature's
conversation, implementation surfaces, acceptance criteria, evidence, and meaningful activity in
one place.

The interface is intentionally closer to ChatGPT and Cursor than a traditional multi-rail IDE:
one collapsible workstream sidebar and one active piece of work. The sidebar closes completely;
there is no residual icon rail.

## Product model

Every workstream has three views over the same context:

- **Conversation** — the outcome, work brief, agent thread, project scope, and a persistent composer.
- **Work** — the conversation beside the existing CodeMirror editor, terminal, live browser, or
  design canvas. Changing tools does not create a new project context.
- **Review** — definition-of-done criteria beside behavior or diff evidence, with explicit accept
  and send-back decisions.

An attention inbox contains only blockers, requested decisions, and review-ready work. Activity,
branch, worktree, budget, model, and evidence are progressive details instead of permanent chrome.

## Current prototype

This phase focuses on making the desktop product flow tangible before building orchestration and
persistence behind it.

Implemented now:

- Responsive ChatGPT-style workstream sidebar, search, new-work flow, and attention inbox.
- Conversation, Work, and Review layouts with a shared active workstream.
- Existing editor, terminal, browser preview, design canvas, command palette, and keyboard shortcut
  system embedded in the new shell.
- Interactive criteria selection, behavior/diff switching, activity details, accept/send-back
  transitions, light/dark appearance, and model settings.
- A real Ollama model picker and streaming agent transport.
- A Tauri 2 desktop scaffold with local Ollama access restricted to port `11434`.

Prototype seams that are intentionally still local or seeded:

- Workstream metadata, criteria, evidence, and activity examples are in-memory design fixtures.
- New workstreams live for the current app session; durable project/worktree orchestration comes
  next.
- The browser build's filesystem and shell remain the existing in-memory implementations.

## Ollama

Start Ollama normally:

```bash
ollama serve
```

Open **Settings → Ollama**, test `http://localhost:11434`, and choose an installed model. In the
Tauri app, requests use the native HTTP plugin, so Ollama does not need a permissive browser CORS
setting. The desktop capability allowlist accepts only:

- `http://localhost:11434/*`
- `http://127.0.0.1:11434/*`

When using the Vite browser preview instead of Tauri, allow only that development origin:

```bash
OLLAMA_ORIGINS='http://localhost:5199' ollama serve
```

## Architecture

- **React 18 + TypeScript + Vite** for the workbench UI.
- **Tauri 2** for the desktop shell and native local HTTP transport.
- **Zustand** for existing editor and shell state.
- A service container in `src/services/container.tsx` for filesystem, editor, terminal, browser,
  agent, graph, preview, and design services.
- The new product shell in `src/workbench/VelocityWorkbench.tsx`, with its workstream model in
  `src/workbench/model.ts`.
- Desktop configuration and capabilities in `src-tauri/`.

## Develop

```bash
npm install
npm run dev             # browser preview at http://localhost:5199
npm run typecheck       # TypeScript validation
npm run build           # production web assets
npm run desktop:dev     # Tauri development app
npm run desktop:build   # native desktop bundle
```

Tauri development and builds require the Rust toolchain and the platform prerequisites documented
by Tauri. `?theme=light` and `?theme=dark` can force a theme for browser previews.
