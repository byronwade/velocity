# Roadmap

The feature checklist for Velocity — what's shipped and what's next, grouped by area.

**Format contract (do not break — a website consumes this file):** every feature is one checklist
item of the shape `- [x|_] **slug** — Name. One-sentence description. _(shipped YYYY-MM-DD | planned · phase N)_`.
The **slug** is the same stable id used in [CHANGELOG.md](CHANGELOG.md), so shipped items can be
joined to their changelog details. Checked = shipped. Never delete an item — a dropped feature moves
to the Dropped section at the bottom with a reason.

This file is the curated public epic layer. The complete research-backed inventory is the
[457-record feature backlog](docs/research/platform-roadmap/feature-backlog.csv), and the phase 0–8
architecture, dependencies, and exit gates live in the
[Platform Research & Integration Roadmap](docs/research/platform-roadmap/README.md).

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

## Architecture & platform convergence

- [ ] **platform-convergence** — Use `Velocity-IDE` as the production Code-OSS platform while this repository remains the product specification, prototype laboratory, and deterministic demo harness. _(planned · phase 0)_
- [ ] **native-velocity-services** — Port Missions, Coworkers, Work Orders, Stable/Candidate, Follow Mode, Checkpoints, Evidence, Decisions, and semantic design scope into native workbench services and contributions. _(planned · phase 0)_
- [ ] **source-authority** — Make files, Git revisions, worktrees, environment manifests, and typed evidence authoritative instead of browser DOM state, transcripts, or local component state. _(planned · phase 0)_
- [ ] **durable-project-manifest** — Define a versioned project manifest for environments, commands, policies, coworkers, evidence requirements, integrations, and deployment targets. _(planned · phase 0)_
- [ ] **event-audit-log** — Record typed, append-only product, tool, policy, checkpoint, and collaboration events with correlation and causation IDs. _(planned · phase 0)_
- [ ] **environment-isolation** — Give each write-capable work order an isolated worktree, process namespace, browser profile, port registry, credential lease, resource budget, and evidence scope. _(planned · phase 0)_
- [ ] **extension-compatibility-contract** — Define which VS Code extension, workbench, editor, SCM, terminal, debug, test, notebook, and remote APIs Velocity preserves. _(planned · phase 0)_
- [ ] **upstream-sync-strategy** — Isolate Velocity changes, continuously rebase against Code-OSS, contribute generic fixes upstream, and gate upgrades with compatibility suites. _(planned · phase 0)_

## Directing work

- [x] **comments-as-work** — Place work on the app; comments are the assignment mechanism (no chat). _(shipped 2026-07-15)_
- [x] **auto-assign** — Deterministic best-fit routing of work to coworkers by department and load. _(shipped 2026-07-15)_
- [x] **work-items-chip** — All open work pins in one dock popover. _(shipped 2026-07-15)_
- [x] **agents-as-files** — Coworkers as versionable files: `.velocity/coworkers/<id>.md` (name, role, department, model, autonomy, scope, budget) mirrors the active project's team; editing a file in the IDE applies live. _(shipped 2026-07-15)_
- [x] **mission-timeline** — A mission timeline in the Verify lens: landed checkpoints, merges, failures, and handoffs on a vertical rail, fed live by the heartbeat. _(shipped 2026-07-15)_
- [ ] **semantic-work-orders** — Turn a pin or mission into a durable work order with objective, scope, acceptance criteria, tools, budget, permissions, target environment, evidence requirements, and stop conditions. _(planned · phase 4)_
- [ ] **artifact-scope-resolver** — Resolve user-selected UI regions, routes, components, design tokens, services, schemas, and tests back to source-backed semantic scope. _(planned · phase 6)_
- [ ] **intent-to-plan** — Generate an inspectable plan and dependency graph before execution, with automatic decomposition into bounded work orders. _(planned · phase 4)_

## Coworkers & agent platform

- [x] **coworker-prototype** — Named coworkers with scopes, budgets, autonomy, states; missions; decision sheets; deterministic runtime behind the `CoworkerRuntime` seam. _(shipped 2026-07-12)_
- [x] **heartbeat** — Live deterministic progress: coworkers advance, land checkpoints, pick up next tasks. _(shipped 2026-07-15)_
- [x] **workers-panel** — Monochrome divided-list Workers panel with subagents and live tools. _(shipped 2026-07-15)_
- [x] **follow-mode** — Follow a coworker's work live. _(shipped 2026-07-14)_
- [x] **collaboration** — Human teammates: invites, live cursors, presence. _(shipped 2026-07-14)_
- [ ] **real-coworker-runtime** — First provider-backed coworker: Claude Agent SDK in a Node sidecar, `cwd` = a worktree, hooks → checkpoints, `canUseTool` → decision sheets. _(planned · phase 4)_
- [ ] **provider-neutral-runtime** — Keep coworker identity and policy independent from execution provider, model, local/cloud location, or agent protocol. _(planned · phase 4)_
- [ ] **ai-gateway** — Vercel AI Gateway as the model layer: model strings, per-key budgets wired to the credits UI, BYOK. _(planned · phase 4)_
- [ ] **ai-sdk-runtime** — Second runtime on Vercel AI SDK `ToolLoopAgent` for non-Anthropic models via Gateway. _(planned · phase 5)_
- [ ] **worktree-per-coworker** — Real git worktree + branch per concurrent write-capable work order, with shadow-git checkpoints for rollback. _(planned · phase 5)_
- [ ] **typed-tool-broker** — Route every file, terminal, browser, test, Git, deployment, and integration action through typed schemas, policy evaluation, cancellation, progress, and audit envelopes. _(planned · phase 4)_
- [ ] **permission-policy-engine** — Evaluate workspace trust, role, autonomy, mission policy, tool risk, path scope, secret scope, network scope, spend, and approval requirements before execution. _(planned · phase 4)_
- [ ] **approval-tokens** — Represent protected actions as signed, expiring approvals bound to the exact tool call, arguments, work order, environment, and risk summary. _(planned · phase 4)_
- [ ] **context-index** — Build a source-aware context graph over files, symbols, Git history, diagnostics, tasks, tests, browser routes, design tokens, evidence, and prior accepted decisions. _(planned · phase 4)_
- [ ] **rules-and-skills** — Support repository, user, team, and coworker rules plus versioned skills that can be discovered, reviewed, and scoped. _(planned · phase 5)_
- [ ] **subagent-orchestration** — Let manager coworkers dispatch bounded specialists with explicit contracts, budgets, toolsets, return artifacts, and parent-child traceability. _(planned · phase 5)_
- [ ] **mcp-tools** — Expose Velocity's native tools as MCP servers and allow approved third-party MCP servers in a coworker's toolbelt. _(planned · phase 6)_
- [ ] **acp-client** — Support the Agent Client Protocol so Claude Code, Codex, Gemini, OpenHands, and other compatible runtimes can be hired as coworkers. _(planned · phase 8)_
- [ ] **cloud-agent-execution** — Run selected work orders in isolated cloud environments with streamed activity, artifacts, resumability, spend limits, and local handoff. _(planned · phase 7)_
- [ ] **automation-triggers** — Start missions from schedules, Git events, issue trackers, monitoring alerts, inbox rules, or API calls under explicit policy. _(planned · phase 7)_
- [ ] **pull-request-review-agent** — Review pull requests with repository context, tests, security policy, evidence, inline findings, and optional fix work orders. _(planned · phase 7)_

## Review, evidence & shipping

- [x] **deploy-targets** — Ship to Vercel / Netlify / Cloudflare. _(shipped 2026-07-14)_
- [x] **compare-sources** — Compare candidate vs Stable / Live / Preview / Branch. _(shipped 2026-07-14)_
- [x] **checkpoint-diff-to-ide** — Click a checkpoint's changed file to open it in the IDE; heartbeat checkpoints reference real workspace files. _(shipped 2026-07-15)_
- [ ] **real-diffs** — Compute checkpoint diffs, file status, and blame from the real Git worktree and immutable source revision. _(planned · phase 3)_
- [ ] **typed-evidence-store** — Persist source diffs, diagnostics, tests, screenshots, recordings, traces, console/network findings, accessibility results, risk, and provenance as typed evidence. _(planned · phase 3)_
- [ ] **checkpoint-readiness-gates** — Block checkpoint proposal until required evidence, acceptance criteria, policy checks, and freshness constraints are satisfied or explicitly waived. _(planned · phase 3)_
- [ ] **stable-candidate-transactions** — Advance Stable only through an auditable merge transaction that binds source revision, environment, evidence, approvals, and rollback point. _(planned · phase 5)_
- [ ] **verified-rollback** — Restore source, environment, data migration state, configuration, and deployment to a tested checkpoint with a post-rollback health check. _(planned · phase 5)_
- [ ] **blast-radius-analysis** — Show affected files, symbols, routes, tests, schemas, services, design tokens, users, and deployment surfaces before acceptance. _(planned · phase 5)_
- [ ] **review-invalidation** — Invalidate stale evidence automatically when source, dependencies, environment, policy, or acceptance criteria change. _(planned · phase 5)_
- [ ] **deployment-evidence** — Attach build logs, preview URL, health checks, release metadata, monitoring status, and rollback instructions to every ship decision. _(planned · phase 7)_

## Browser

- [x] **real-browser** — Chrome-style in-app browser running the live workspace preview. _(shipped 2026-07-14)_
- [x] **browser-devtools** — Elements / Console / Network DevTools docked in the pane. _(shipped 2026-07-15)_
- [x] **device-preview** — Desktop / tablet / mobile viewport toggle. _(shipped 2026-07-15)_
- [x] **devtools-console-input** — Evaluate JS in the live preview from the DevTools Console tab, with echoed input and results. _(shipped 2026-07-15)_
- [ ] **integrated-chromium-browser** — Replace iframe/synthetic DevTools production paths with a real integrated Chromium browser and native DevTools. _(planned · phase 3)_
- [ ] **cdp-playwright-automation** — Give agents typed browser tools for navigation, locators, clicks, forms, downloads, screenshots, accessibility, tracing, console, network, and debugger attachment. _(planned · phase 3)_
- [ ] **browser-profile-isolation** — Allocate separate cookies, storage, permissions, cache, downloads, credentials, and service-worker state per work order and environment. _(planned · phase 3)_
- [ ] **browser-port-binding** — Bind each browser session to the correct worktree process, port, route, environment, and preview revision through a shared service registry. _(planned · phase 3)_
- [ ] **browser-evidence-capture** — Turn screenshots, videos, traces, DOM snapshots, console errors, network failures, performance data, and accessibility scans into checkpoint evidence. _(planned · phase 3)_
- [ ] **visual-edit-source-translation** — Convert approved visual changes into source edits across tokens, components, styles, stories, tests, and documentation instead of persisting browser-only mutations. _(planned · phase 6)_
- [ ] **external-browser-auth** — Support real authentication, redirects, popups, downloads, permissions, and secure handoff between embedded and external browser contexts. _(planned · phase 7)_
- [ ] **child-webview-browser** — Keep a Tauri child-webview implementation as a desktop fallback where the Code-OSS integrated browser is unavailable. _(planned · phase 7)_

## IDE, terminal & development tools

- [x] **workstream-shell** — CodeMirror editor, terminal, live preview, design canvas, nine on-demand studios. _(shipped 2026-07-12)_
- [x] **ide-file-tree** — File tree beside the editor. _(shipped 2026-07-15)_
- [x] **ide-search-replace** — Searchable tree + full find & replace. _(shipped 2026-07-15)_
- [x] **real-terminal** — Workspace shell over the shared filesystem with bash/zsh/pwsh/node session presets. _(shipped 2026-07-14)_
- [x] **docked-tools-panel** — Bottom-docked developer tools panel. _(shipped 2026-07-15)_
- [ ] **native-workbench-shell** — Rebuild Velocity's calm stage, lenses, rails, dock, review surfaces, and command flows as native Code-OSS workbench parts, views, editors, context keys, and layout state. _(planned · phase 1)_
- [ ] **native-editor-groups** — Map Velocity panes, Stable/Candidate comparison, Follow Mode, diffs, browser sessions, notebooks, and design surfaces onto native editor groups and serializable editor inputs. _(planned · phase 1)_
- [ ] **command-context-graph** — Register every user and agent action as a command with context keys, keybindings, menus, discoverability, telemetry, and headless parity. _(planned · phase 1)_
- [ ] **workspace-trust** — Gate execution, extensions, tasks, debugging, terminals, browser automation, credentials, and agents on native workspace trust and policy. _(planned · phase 1)_
- [ ] **settings-profiles-sync** — Support user/workspace/language settings, profiles, keymaps, themes, snippets, settings sync, and policy-managed configuration. _(planned · phase 1)_
- [ ] **extension-host** — Preserve VS Code extension compatibility and expose Velocity product primitives through stable extension APIs where appropriate. _(planned · phase 1)_
- [ ] **native-search-index** — Use native text, file, symbol, reference, call hierarchy, semantic, and Git-aware search rather than prototype-only scans. _(planned · phase 2)_
- [ ] **native-scm-platform** — Use native source-control providers, staging, diffs, blame, history, branches, worktrees, conflicts, merge/rebase, and repository discovery. _(planned · phase 2)_
- [ ] **pty-terminal** — Use the native Code-OSS xterm/node-pty terminal platform with profiles, process control, persistence, links, images, accessibility, and remote authorities. _(planned · phase 2)_
- [ ] **terminal-shell-integration** — Detect commands, prompts, cwd, exit codes, durations, environment mutations, marks, and command output ranges for users and agents. _(planned · phase 2)_
- [ ] **terminal-agent-tools** — Expose create, write, resize, interrupt, kill, wait, read-output, inspect-command, and open-link operations through the policy-controlled tool broker. _(planned · phase 2)_
- [ ] **task-system** — Support workspace tasks, problem matchers, compound tasks, dependencies, background readiness, presentation controls, and agent invocation. _(planned · phase 2)_
- [ ] **debug-platform** — Support launch/attach, breakpoints, variables, watches, call stacks, debug console, data breakpoints, compound sessions, and agent-assisted debugging. _(planned · phase 2)_
- [ ] **test-platform** — Support test discovery, run/debug, profiles, coverage, continuous runs, result history, flaky-test evidence, and checkpoint gates. _(planned · phase 2)_
- [ ] **ports-and-services** — Discover, label, forward, reserve, health-check, and bind ports and long-running services to worktrees, terminals, browsers, and evidence. _(planned · phase 2)_
- [ ] **lsp** — Use native language services and extension-host providers for completions, diagnostics, navigation, rename, refactors, formatting, code actions, inlay hints, semantic tokens, and call hierarchy. _(planned · phase 2)_
- [ ] **notebooks** — Support notebook editors, kernels, outputs, rich renderers, diffs, variables, and agent-generated execution evidence. _(planned · phase 7)_
- [ ] **remote-development** — Support SSH, containers, tunnels, Codespaces-compatible authorities, remote terminals, remote extensions, and remote agent execution. _(planned · phase 7)_
- [ ] **sandpack-preview** — Keep Sandpack as a self-hosted browser-only fallback for small projects; production desktop previews run the project's real dev server. _(planned · phase 2)_

## Collaboration & agent-first design

- [ ] **networked-collaboration** — Add authenticated multiplayer sessions with presence, cursors, selections, comments, roles, reconnect, offline recovery, and audit history. _(planned · phase 5)_
- [ ] **selective-text-crdt** — Use CRDT synchronization for simultaneous human text editing while preserving Git/worktree/patch transactions for autonomous agent work. _(planned · phase 5)_
- [ ] **scope-reservations** — Reserve files, symbols, routes, components, schemas, services, tests, design tokens, and environments with expiring ownership and conflict visibility. _(planned · phase 5)_
- [ ] **conflict-detection** — Detect overlapping source, semantic, runtime, schema, migration, design-system, and deployment changes before merge. _(planned · phase 5)_
- [ ] **native-follow-mode** — Follow a human or coworker across editor, terminal, browser, test, SCM, design, and review surfaces without forcing chat or stealing control. _(planned · phase 5)_
- [ ] **branch-review-history** — Provide Figma-style branch review and version history translated into Git revisions, candidate environments, checkpoints, comments, and merge decisions. _(planned · phase 5)_
- [ ] **semantic-design-scope** — Let humans select a route, component family, design token set, interaction flow, or whole-product outcome while agents perform source-level edits across the affected system. _(planned · phase 6)_
- [ ] **design-token-graph** — Index variables, CSS custom properties, themes, typography, spacing, motion, assets, component props, and usage sites as a source-backed graph. _(planned · phase 6)_
- [ ] **component-route-matrix** — Render real routes and components across devices, themes, states, data fixtures, locales, and accessibility modes for agent inspection and evidence. _(planned · phase 6)_
- [ ] **source-mapped-inspection** — Inspect rendered elements and trace them to owning components, styles, tokens, props, data, tests, and recent changes. _(planned · phase 6)_
- [ ] **design-system-governance** — Enforce approved variables, component APIs, accessibility constraints, visual regression thresholds, and migration plans across agent changes. _(planned · phase 6)_
- [ ] **design-alternatives** — Generate isolated, source-backed visual alternatives that can be compared, partially adopted, revised, or discarded without manual layer editing. _(planned · phase 6)_

## Native desktop

- [x] **real-fs-tauri** — Open any real project folder in the Tauri build. _(shipped 2026-07-12)_
- [x] **notifications-chime** — Chime + desktop notification on checkpoint (web-standard). _(shipped 2026-07-15)_
- [ ] **native-notifications** — Tauri notification plugin: proper installed-app banners with OS-played sound while backgrounded. _(planned · phase 1)_
- [ ] **persistence** — Durable project, layout, session, coworker, mission, policy, evidence, and review state instead of in-memory fixtures/localStorage. _(planned · phase 0)_
- [ ] **tray-badge** — System tray icon with a "checkpoints waiting" badge. _(planned · phase 1)_
- [ ] **global-shortcut** — System-wide "summon Velocity" hotkey. _(planned · phase 1)_
- [ ] **window-state** — Remember window size/position and restore multi-window/editor layouts. _(planned · phase 1)_
- [ ] **auto-updater** — Signed in-app updates with staged rollout, rollback, compatibility checks, and release evidence. _(planned · phase 7)_

## Security, governance & ecosystem

- [ ] **os-keychain-secrets** — Store provider keys, tokens, certificates, and integration credentials in the OS keychain or approved enterprise secret store. _(planned · phase 0)_
- [ ] **credential-leases** — Issue scoped, time-bound credentials to a specific work order, tool, host, repository, and environment instead of exposing long-lived secrets. _(planned · phase 4)_
- [ ] **capability-sandbox** — Enforce filesystem, process, network, browser, extension, secret, deployment, and external-service boundaries per agent session. _(planned · phase 4)_
- [ ] **enterprise-policy** — Provide centrally managed model, tool, extension, network, data-retention, approval, spend, telemetry, and deployment policy. _(planned · phase 7)_
- [ ] **audit-export** — Export tamper-evident activity, approval, tool, source, evidence, and deployment records for compliance and incident review. _(planned · phase 7)_
- [ ] **telemetry-privacy-controls** — Make telemetry categories inspectable, minimized, disableable, and policy-controlled with local diagnostics separated from product analytics. _(planned · phase 7)_
- [ ] **plugin-marketplace** — Support signed Velocity extensions, coworker definitions, skills, MCP servers, policies, evidence processors, and deployment adapters. _(planned · phase 8)_
- [ ] **headless-cli** — Expose missions, work orders, tools, evidence, checkpoints, review, automation, and policy through a scriptable CLI and machine-readable protocol. _(planned · phase 8)_

## Quality, accessibility & upstream compatibility

- [ ] **production-vertical-slice** — Prove repository open → mission → isolated worktree → native edit/terminal/browser/test → evidence → checkpoint → merge → deploy → verified rollback. _(planned · phase 4)_
- [ ] **cross-platform-terminal-matrix** — Validate shells, PTYs, signals, resizing, Unicode, accessibility, persistence, tasks, remote authorities, and agent control on Windows, macOS, and Linux. _(planned · phase 2)_
- [ ] **browser-compatibility-matrix** — Validate navigation, authentication, permissions, storage, downloads, popups, DevTools, automation, profiles, traces, and evidence across supported platforms. _(planned · phase 3)_
- [ ] **accessibility-parity** — Meet keyboard, screen-reader, contrast, zoom, reduced-motion, accessible-view, terminal, editor, browser, diff, test, and review requirements. _(planned · phase 1)_
- [ ] **performance-budgets** — Define and enforce startup, interaction, search, editor, terminal, browser, agent, evidence, memory, CPU, network, and storage budgets. _(planned · phase 1)_
- [ ] **failure-injection-suite** — Test process crashes, provider failures, network loss, stale evidence, secret denial, port conflicts, merge conflicts, corrupt state, and interrupted deployments. _(planned · phase 4)_
- [ ] **extension-compatibility-suite** — Continuously test representative language, SCM, debug, test, notebook, remote, theme, keymap, and productivity extensions against Velocity. _(planned · phase 1)_
- [ ] **upstream-upgrade-gates** — Require Code-OSS build, smoke, extension, agent, browser, terminal, accessibility, and Velocity-specific suites before accepting upstream updates. _(planned · phase 0)_

## Research & docs

- [x] **integrations-research** — Focused real-runtime stack report covering Vercel AI, Tauri native capabilities, agent SDKs, MCP/ACP, worktrees, and native execution. _(shipped 2026-07-15)_
- [x] **platform-research-roadmap** — Source-controlled VS Code, Cursor, and Figma research corpus with production architecture, phases P0–P8, acceptance gates, source registry, and a 457-record feature backlog. _(shipped 2026-07-15)_

## Dropped

- **work-chat** — The New Work chat panel. Dropped 2026-07-15: directing work belongs on the app itself (comments-as-work), not in a chat thread.
