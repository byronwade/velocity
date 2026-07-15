# 3. Repository Audit: Velocity and Velocity-IDE

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

## 3.1 `byronwade/velocity`: the product specification in executable form

The custom `velocity` application is a React 18/Vite/Tauri local-first prototype with CodeMirror 6, Zustand, project/workstream UI, a service container, project graph, preview renderer, command and keybinding systems, multiple tool modes, and an extensive product vocabulary. Its strongest value is conceptual integration: the user can move between Conversation, Work, and Review; see Code, Terminal, Preview, and Design; open on-demand studios; place work on artifacts; manage coworkers; compare candidate states; and treat the running product as the center of work. [VEL-01; VEL-02; VEL-03; VEL-13]

Several seams are intentionally ready for replacement. The `AgentBackend` interface can stream text, tools, completions, and file changes, but the default LocalAgent is rule-based. The coworker runtime is deterministic and resettable. Collaboration shares text among same-window views and exposes a future Yjs extension factory, but does not yet provide networked multiplayer. Deployment, persistence, criteria verification, real Git worktrees, production credentials, and cloud execution are simulated or out of scope. [VEL-08; VEL-09; VEL-12; VEL-13]

### Current terminal

The current shell is a thoughtful virtual command interpreter over the same in-memory/file-service abstraction used by the editor and Explorer. It supports quoted tokenization, pipes, redirects, command chaining, environment variables, globs, history, per-pane cwd, and a useful set of filesystem/text commands. The terminal UI supports input history, tab completion, Ctrl+L, and Ctrl+C cancellation of the current input. This is valuable for deterministic demos and tests, but it is not a PTY, does not run the user's actual shell or toolchain, and cannot provide process control, shell integration, native terminal applications, tasks, remote sessions, persistence, or security isolation. The footer's `zsh` label should not survive into production while the process is virtual. [VEL-04; VEL-05]

### Current browser

The current browser renders local workspace previews through `srcDoc` and attempts external URLs in sandboxed iframes. It implements navigation history, bookmarks, zoom, a start page, simple shortcuts, console interception through `postMessage`, a DOM-derived Elements tree, and a resource-list Network view. The source itself acknowledges that most external sites block framing. The DevTools representation is not Chromium DevTools, the Network rows are derived from markup rather than actual requests, and the local preview is not a real browser session with normal origin, service worker, cookies, downloads, permissions, authentication, debugging, or CDP automation. [VEL-06; VEL-07]

### Current design studio

The Design Studio already points in the correct strategic direction. It renders the real project preview across desktop, tablet, and mobile artboards; indexes routes and components from the shared graph; lists pages, layers, and assets; supports pan/zoom; and reads/writes CSS custom-property tokens back to source. Its weakness is implementation depth, not product concept. Route/component frames are partly schematic, source mapping is limited, collaboration is not networked, and direct token editing still exposes a manual-control model that should become secondary to agent-driven semantic changes. [VEL-10; VEL-11]

## 3.2 `byronwade/Velocity-IDE`: the production-grade substrate

The second repository is a Code-OSS development tree reporting version 1.129.0 in its package manifest. It includes the mature workbench and dependencies required for a modern production IDE: xterm and numerous addons, `node-pty`, Playwright, Chrome Remote Interface, remote tunnels and SSH, sandbox runtime, ripgrep, SQLite, WebSocket, tree-sitter, debug/test infrastructure, and SDKs or packages for Anthropic, GitHub Copilot, Claude Agent SDK, and Codex. Its product configuration still identifies the application as Code - OSS and includes Microsoft/GitHub-oriented service configuration that must be rebranded, audited, licensed, and replaced where necessary. [VOSS-01; VOSS-02]

The fork's terminal implementation demonstrates the gulf between the prototype shell and production parity. `TerminalInstance` coordinates xterm, process management, shell launch configuration, reconnection properties, environment collections, shell integration, command detection, accessibility, drag/drop, context keys, editor hosting, terminal statuses, workspace trust, remote/workspace services, and platform-specific behavior. This should be reused rather than reproduced. [VOSS-03]

## 3.3 Current-to-target gap matrix

| Area | Current `velocity` | Available in `Velocity-IDE` / upstream | Required target |
| --- | --- | --- | --- |
| Editor | CodeMirror, in-memory/shared document model, custom tabs. | Native text models, editor groups, diff/merge, language services, extension ecosystem. | Port Velocity project context and annotations into native editor services. |
| Terminal | Virtual interpreter with a bounded command set. | Real PTY/xterm, shell profiles/integration, persistence, tasks, links, remote, accessibility. | Use native terminal; add per-work-order isolation, policy, evidence, and ownership. |
| Browser | Local `srcDoc`; external iframe fallback; simplified pseudo-DevTools. | Integrated browser, DevTools, debug attachment, storage/permissions, remote proxy, agent tools, Playwright/CDP dependencies. | Use real browser sessions; add Stable/Candidate, profile isolation, trace/evidence, source mapping. |
| Agent | Rule-based local backend seam; deterministic coworker simulation. | Agent/session architecture and multiple provider SDKs available in the fork/upstream direction. | Build provider-neutral runtime, ToolBroker, scheduler, memory, policies, budgets, recovery. |
| Collaboration | Same-window shared docs; no network CRDT; demo invites/presence. | Workbench services and extension points, but Velocity collaboration remains product work. | Build identity, roles, presence, follow, comments, selective CRDT, audit, offline/reconnect. |
| SCM/versioning | Product vocabulary for Stable/Candidate/checkpoints; worktrees mocked. | Native Git/SCM, diff/merge, branches/worktrees, history. | Back product concepts with immutable commits, worktrees, review state, and merge transactions. |
| Evidence | Visual cards and deterministic scenario data. | Native Problems, tests, debug, output, browser, SCM, task events. | Normalize evidence and make checkpoint readiness derived from source-revision-bound results. |
| Persistence | Primarily in-memory/local browser storage and deterministic scenarios. | Native storage, file service, SQLite dependency, working-copy backup, workspace state. | Design a local-first durable event/object/artifact model with optional synchronization. |
| Extensions/remote | Prototype modes and service interfaces. | Extension host/API, remote authorities, SSH/tunnels/containers/web. | Preserve compatibility and expose governed Velocity APIs rather than a closed tool set. |

## 3.4 Immediate repository actions

- Write and approve an Architecture Decision Record declaring `Velocity-IDE` the production base and `velocity` the prototype/specification source.
- Create a porting inventory mapping every differentiated prototype component/service to a native Code-OSS contribution, reuse point, or retirement decision.
- Stop adding production-only infrastructure to the prototype unless it is deliberately designed as portable core logic or a tested specification fixture.
- Create a clean Velocity product layer in the fork: product configuration, theme/tokens, commands/context keys, project service, mission/coworker schemas, and one native Lens/editor integration.
- Establish upstream synchronization, ownership, security-update cadence, Code-OSS test baselines, and extension-compatibility CI before the fork diverges further.
- Remove or replace Microsoft/GitHub service assumptions that are not licensed, branded, or appropriate for Velocity distribution; document each retained external service.

# 4. Product Thesis and Non-Negotiable Constraints

> **Velocity is not an IDE with an AI sidebar. It is a shared, evidence-driven project environment in which humans direct outcomes and agents execute bounded work across native development tools.**

## 4.1 Product thesis

Traditional IDEs organize work around files, editors, terminals, and tool panels. Chat-first AI IDEs add a conversational layer that can edit those resources. Figma organizes around a shared visual artifact, multiplayer presence, comments, branches, and systemized design assets. Velocity's opportunity is to combine the execution depth of an IDE with the shared-artifact and review model of collaborative design—while making the running product, system behavior, data, and evidence the primary interface.

The user should be able to say what must change, point to the affected artifact or semantic scope, define acceptance criteria, choose autonomy and risk boundaries, observe real work if desired, review evidence, and accept or redirect. File editing remains immediately available, but it is no longer the only representation of progress. Chat remains an optional control surface and audit detail, not the product's center.

## 4.2 Non-negotiable constraints

- Source-level truth: every durable product change resolves to code, configuration, assets, schemas, migrations, tests, or other versioned source. Browser-only or canvas-only mutations are previews, never accepted state.
- Isolation: parallel autonomous writes do not share a mutable checkout, browser profile, terminal process tree, credentials, or unscoped ports.
- Evidence before acceptance: plans and prose do not prove success. Checkpoints cite exact source revisions and fresh verification artifacts.
- Reversibility: every tool declares rollback behavior, and high-impact operations without a credible rollback path require explicit exceptional approval.
- Human authority: protected actions, unresolved product tradeoffs, credential sharing, production changes, and policy exceptions remain explicit decisions.
- Provider independence: coworkers, missions, evidence, and checkpoints survive model or vendor changes.
- No simulated claims: a UI label cannot claim zsh, deployment, collaboration, tests, or autonomous completion unless the underlying behavior is real.
- Calm by default: full VS Code depth remains available through commands and contextual surfaces, but the default project stage shows only material artifact state and attention.
- Accessibility and remote parity: every core workflow must work with keyboard/screen reader and across supported local/remote authorities.
- Inspectable customization: instructions, rules, skills, tools, MCP servers, plugins, policies, and model choices are visible, versioned where appropriate, permissioned, and testable.

## 4.3 Figma-inspired but not Figma-authored

Velocity should borrow Figma's real-time presence, follow/spotlight, pinned comments, branch review, side-by-side and overlay comparison, version history, shared libraries, variables/modes, developer inspection, change comparison, annotations, and design linting. It should not require users to manipulate vectors, frames, constraints, layers, and individual style properties as the primary way to build software. A person may point to one element or select a semantic group, but the durable operation is an agent-authored source change that propagates across all relevant instances, routes, modes, platforms, tests, and documentation.

## 4.4 Cursor-inspired but not chat-bound

Velocity should adopt Cursor's planning, autonomous tools, queued steering, checkpoints, browser automation, worktree isolation, parallel agents, cloud execution, rules, skills, subagents, MCP, plugins, automations, review agents, approval agents, and headless CLI. It should not make a scrolling conversation the only way to understand state. Each tool action becomes a structured event; each durable output becomes an artifact or evidence item; each autonomous change becomes a candidate checkpoint; and each genuine question becomes a Decision Sheet or targeted request.