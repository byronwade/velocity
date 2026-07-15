# 31. Phased Roadmap P0–P8

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

## 31.1 Sequencing model

Phases are dependency milestones, not calendar commitments. A later-phase feature may be prototyped early, but it must not dictate an architecture that bypasses earlier foundations. The feature catalog assigns each capability a first target phase and a criticality priority. The distribution below is intentionally weighted toward P4–P6 because that is where native tooling becomes an autonomous, collaborative, agent-first product.

| Phase | Milestone | Catalog records | Priority mix |
| --- | --- | --- | --- |
| P0 | Convergence and architectural foundation | 1 | P0 1 • P1 0 • P2 0 • P3 0 |
| P1 | Native workbench product shell | 23 | P0 14 • P1 6 • P2 2 • P3 1 |
| P2 | Complete native development loop | 64 | P0 36 • P1 23 • P2 4 • P3 1 |
| P3 | Real browser and evidence substrate | 63 | P0 33 • P1 17 • P2 13 • P3 0 |
| P4 | Provider-neutral autonomous vertical slice | 95 | P0 76 • P1 12 • P2 5 • P3 2 |
| P5 | Parallel work, checkpoints, and collaboration | 97 | P0 73 • P1 19 • P2 3 • P3 2 |
| P6 | Agent-first design system and semantic canvas | 71 | P0 44 • P1 20 • P2 6 • P3 1 |
| P7 | Cloud, remote, enterprise, automation, and distribution | 38 | P0 14 • P1 16 • P2 5 • P3 3 |
| P8 | Ecosystem scale and optimization | 5 | P0 0 • P1 2 • P2 2 • P3 1 |

## P0 — Convergence and architectural foundation

### Deliverables

- Approve the Code-OSS convergence ADR and freeze conflicting production architecture work in the prototype.
- Establish upstream merge cadence, security ownership, product configuration, branding, build/signing channels, and licensing/service audit.
- Create shared domain packages for IDs, commands, events, project manifest, mission/work-order/checkpoint schemas, policies, and test fixtures.
- Define the native contribution map: prototype component/service → reuse, extend, build, retire, or fixture.
- Create CI baselines for Code-OSS core, Velocity product tests, extension compatibility, accessibility, performance, and cross-platform packaging.

### Exit criteria

- A branded Velocity-IDE build opens reliably on supported desktop platforms.
- Architecture and source-of-truth decisions are documented and enforced by package/layer boundaries.
- Upstream update can be applied in a repeatable branch/CI process.
- No new production feature depends on the prototype virtual shell, iframe browser, or deterministic runtime.

## P1 — Native workbench product shell

### Deliverables

- Implement ProjectService and `.velocity` manifest; open/import real repositories and workspace roots.
- Port the calm workstream/project shell into native workbench parts, editor inputs, view containers, commands, context keys, Quick Access, and layout profiles.
- Use native files, text models, editor groups, Explorer, Search, Problems, Output, settings, keybindings, themes, accessibility, and restoration.
- Port mission/coworker/checkpoint data as read-only or local deterministic domain objects first, preserving scenario fixtures for UI tests.
- Create the first Lens navigation: Code, Preview placeholder/native browser entry, Review, and contextual tool opening.

### Exit criteria

- A project can be opened and navigated entirely through native Code-OSS services.
- Every visible Velocity action is a command with context-key authorization and keyboard accessibility.
- Layout persists/restores without a parallel split-tree or DOM event bus.
- Prototype and native shell have visual/interaction comparison snapshots for key flows.

## P2 — Complete native development loop

### Deliverables

- Adopt native terminal/xterm/node-pty, shell profiles/integration, terminal tabs/groups/editors, persistence, links, and process control.
- Integrate native Git/SCM, diff/merge, branches, status, history, staging, commit, and worktree operations.
- Discover and run repository tasks; integrate problem matchers, debug configurations, Test Explorer, coverage, ports, and remote authorities.
- Create ProjectGraphService foundation using files, search, language symbols, references, tasks, tests, packages, routes, schemas, and tokens.
- Create structured CommandRun, TestRun, diagnostic, and source-change events; add basic local artifact storage.

### Exit criteria

- A human can perform a complete professional development loop in Velocity without falling back to the prototype.
- Terminal parity gate passes for real shells and representative local/remote environments.
- SCM, task, debug, and test outputs are revision/environment-bound and navigable.
- Agent features remain disabled or readonly if native authorization/evidence adapters are not complete.

## P3 — Real browser and evidence substrate

### Deliverables

- Adopt the native integrated browser editor, Chromium DevTools, browser debugging, storage modes, permissions, history/favorites, and remote proxy.
- Create BrowserBroker, per-project/session profiles, service/port routing, screenshots, console/network capture, Playwright traces, and accessible locators.
- Implement ArtifactStore and EvidenceService with content hashes, classification, redaction, retention, revision/environment identity, and viewers.
- Create Stable/Candidate comparison editors for source and browser evidence, initially driven by manual candidates.
- Build deterministic capture profiles for viewports, themes/modes, locale/timezone, reduced motion, and authentication contexts.

### Exit criteria

- External and local web applications run in real integrated browser sessions with normal browser semantics.
- Browser evidence can be reproduced or inspected and is never simulated from HTML strings.
- Evidence invalidates correctly when source/environment changes.
- Credentialed human pages cannot be accessed by agents without explicit shared-tab capability.

## P4 — Provider-neutral autonomous vertical slice

### Deliverables

- Implement Mission, Coworker, WorkOrder, CandidateEnvironment, AgentSession, ProviderRegistry, ModelRouter, SessionManager, ContextBroker, ToolBroker, PolicyEngine, CapabilityLease, Budget, and durable events.
- Wrap native file/search/language/terminal/task/SCM/test/browser tools; implement cancellation, bounds, schemas, provenance, approvals, and audit.
- Create default worktree, terminal namespace, browser profile, ports, and credential isolation for write-capable work orders.
- Implement plan, queued directives, pause/cancel/revise/resume, tool progress, provider fallback, and recovery at tool boundaries.
- Complete the first real vertical slice from mission through checkpoint proposal with source/browser/test evidence.

### Exit criteria

- A provider can be swapped without changing mission, work-order, tool, evidence, or checkpoint semantics.
- Every tool call is authorized outside the model and associated with one work order/candidate.
- The vertical-slice acceptance gate passes on a real repository and survives cancellation/restart.
- No autonomous change reaches Stable directly.

## P5 — Parallel work, checkpoints, and collaboration

### Deliverables

- Implement production CheckpointService, readiness policy, multi-diff/evidence review, review stamps, revisions, accept/revise/reject, merge queue, rollback plans, and Stable pointer.
- Run multiple isolated work orders with scheduler, reservations, combined integration candidate, conflict prediction, quotas, cleanup, and reviewer independence.
- Implement identity/RBAC, invitations, durable comments, mentions, notifications, human presence, spotlight/follow, coworker markers, and collaboration synchronization.
- Integrate network CRDT for selected human text documents only after save/SCM/offline semantics are proven.
- Add typed Decisions and role-specific approvals; bind capability grants and policy exceptions to decisions.

### Exit criteria

- Parallel-agent acceptance gate passes under overlaps, stale bases, process/browser leaks, and runner/session failures.
- Checkpoint acceptance is atomic and advances Stable only after final combined verification.
- Human collaboration works under latency/reconnect/revoked access and has accessible non-spatial views.
- Review invalidation is correct at file/hunk/evidence and whole-checkpoint levels.

## P6 — Agent-first design system and semantic canvas

### Deliverables

- Implement SourceMappingService from browser elements to source components/styles/tokens/routes/tests using source maps, framework instrumentation, component metadata, and graph analysis.
- Implement DesignSystemService for components, props/variants, CSS/design tokens, variables/collections/modes/aliases, libraries/packages, usage, code bindings, and lint.
- Upgrade Design Lens to source-backed component/route/device matrices, Inspect, design alternatives, visual comparison, annotations, and semantic scope selection.
- Add agent-directed visual transformations, codemods, batch design fixes, responsive/mode matrices, accessibility and visual gates, component playgrounds, and persistent Canvas artifacts.
- Support whole-product transformations as staged, parallel, reviewable work—not one opaque global edit.

### Exit criteria

- A user can select an instance/component/route/token/product scope, state intent, and receive durable source changes verified across required matrices.
- No accepted design change exists only in browser DOM or a separate design document.
- Component/token mappings are diagnosable, versioned, and portable across supported frameworks.
- Agent-first design acceptance gate passes on representative multi-route design-system projects.

## P7 — Cloud, remote, enterprise, automation, and distribution

### Deliverables

- Generalize execution authorities for SSH/WSL/containers/tunnels/cloud VMs/customer VPC; implement remote browser, artifacts, caches, handoff, quotas, and teardown.
- Ship web/review client, synchronization, headless CLI, REST/RPC/extension APIs, scheduled/event automations, CI integrations, PR/review/approval agents, and provider integrations.
- Implement enterprise policy, identity, secret broker, network filtering, plugin/extension/MCP governance, audit export, retention, data residency, and update channels.
- Complete extension gallery strategy, compatibility tiers, signing, curated Velocity plugins, enterprise mirrors, and migration/export tooling.
- Integrate deployment providers and production operator workflows with typed approvals and rollback.

### Exit criteria

- Local and remote work orders share one protocol and evidence model.
- Enterprise administrators can centrally govern providers, tools, network, extensions/plugins/MCP, data, approvals, and retention.
- Headless and UI behavior are service-parity equivalents.
- Cloud teardown, credential revocation, audit export, and failure recovery pass operational tests.

## P8 — Ecosystem scale and optimization

### Deliverables

- Open a certified plugin/skill/template/tool marketplace and developer program with conformance suites.
- Optimize context retrieval, graph indexing, terminal/browser resource usage, parallel scheduling, caches, and upstream patch footprint.
- Add design/library analytics, reliability analytics, cost/quality routing, automation portfolios, and organization-level insights with privacy controls.
- Expand framework/platform adapters, mobile/native/browser design systems, and additional SCM/cloud/deploy ecosystems.
- Continuously retire obsolete custom code as upstream Code-OSS absorbs equivalent functionality.

### Exit criteria

- The platform can scale feature depth without increasing core fork divergence or weakening trust.
- Marketplace capabilities are permissioned, signed, observable, and revocable.
- Quality, cycle time, reliability, and intervention metrics improve without hiding risk or pressuring unsafe autonomy.

## 31.2 Phase discipline

A phase may ship incrementally, but its exit criteria must remain visible. Product demos may use deterministic fixtures, yet release notes and UI labels must distinguish fixtures, preview infrastructure, and production-ready behavior. The roadmap intentionally prioritizes correctness of the vertical loop over breadth of studios: a native tool that is reachable through the command palette is more valuable than a polished duplicate panel with simulated data.

# 32. Work Packages and Dependency Graph

## 32.1 Dependency spine

```
Upstream / Product Foundation
        ↓
Native Workbench + Project Service
        ↓
Native Files / SCM / Terminal / Tasks / Debug / Tests
        ↓
Integrated Browser + Artifact/Evidence Store
        ↓
Policy + ToolBroker + Provider Runtime + Work Orders
        ↓
Worktrees + Candidate Environments + Checkpoints
        ↓
Parallel Scheduler + Collaboration + Review
        ↓
Semantic Source Mapping + Design System + Agent-First Canvas
        ↓
Cloud / Automation / Enterprise / Marketplace
```

| Package | Workstream | Phase | Dependencies | Primary output |
| --- | --- | --- | --- | --- |
| WP-01 | Fork governance and upstream cadence | P0 | None | ADR, patch ownership map, upstream merge automation, security update SLA, release branches. |
| WP-02 | Product configuration and branding | P0–P1 | WP-01 | Velocity product.json, identifiers, URLs, services, license/attribution, themes, packaging. |
| WP-03 | Core domain schemas and IDs | P0 | WP-01 | Versioned Project/Mission/Coworker/WorkOrder/Evidence/Checkpoint/Decision schemas. |
| WP-04 | Project service and manifest | P1 | WP-03 | Open/import projects, repository/environment discovery, `.velocity` schema and migrations. |
| WP-05 | Native workbench shell and commands | P1 | WP-02, WP-04 | Lenses, layouts, command/context system, project stage, native views/editors, restoration. |
| WP-06 | Prototype port/retirement matrix | P0–P2 | WP-01 | Per-component/service migration plan; fixture extraction; deletion criteria. |
| WP-07 | Native terminal adoption | P2 | WP-05 | PTY/xterm terminal, profiles, shell integration, tasks, links, persistence, accessibility. |
| WP-08 | Native SCM and worktree foundation | P2–P4 | WP-04 | Git/SCM integration, worktree service, diff/merge, commit/rollback primitives. |
| WP-09 | Tasks/debug/tests/ports integration | P2 | WP-05, WP-07 | Repository-native dev loop, structured events, Problems/coverage/ports. |
| WP-10 | Project graph and semantic index | P2–P6 | WP-04 | Files/symbols/references/routes/components/tests/schemas/tokens/services graph. |
| WP-11 | Integrated browser adoption | P3 | WP-05, WP-09 | Native browser tabs, DevTools, debug, storage, permissions, remote proxy. |
| WP-12 | Browser automation and evidence | P3–P4 | WP-11 | CDP/Playwright tools, screenshots, console/network, traces, accessibility, profiles. |
| WP-13 | Artifact and evidence platform | P3 | WP-03, WP-09, WP-12 | Content-addressed artifacts, normalized evidence, freshness, retention, viewers. |
| WP-14 | Policy, trust, capability leases | P3–P4 | WP-03, WP-04 | Workspace/organization/project/mission/tool policy, approvals, audit decisions. |
| WP-15 | Credential and egress broker | P4–P7 | WP-14 | Secret leases, browser auth, provider credentials, network filtering, redaction. |
| WP-16 | Provider registry and model router | P4 | WP-03, WP-14 | Provider adapters, model capabilities, fallback, privacy/cost policy. |
| WP-17 | Context and tool brokers | P4 | WP-07–WP-14 | Typed native tools, context retrieval, cancellation, bounds, provenance, audit. |
| WP-18 | Work-order orchestration | P4 | WP-03, WP-08, WP-14, WP-16, WP-17 | Scheduler, sessions, budgets, plans, directives, pause/cancel/recovery. |
| WP-19 | Candidate environments | P4–P5 | WP-08, WP-11, WP-15, WP-18 | Worktree/process/browser/port/data/environment isolation and cleanup. |
| WP-20 | Checkpoint and review platform | P5 | WP-08, WP-13, WP-19 | Manifests, readiness, Stable/Candidate compare, review state, accept/revise/reject. |
| WP-21 | Parallel work and integration queue | P5–P6 | WP-18–WP-20 | Reservations, overlap prediction, fan-out, quotas, combined verification, merge queue. |
| WP-22 | Identity, collaboration, comments, presence | P5–P6 | WP-03, WP-05, WP-14 | RBAC, invitations, sync, pins, mentions, notifications, follow/spotlight, optional CRDT. |
| WP-23 | Source mapping and framework adapters | P5–P6 | WP-10–WP-12 | DOM/accessibility/source/component/style/token identity and diagnostics. |
| WP-24 | Design-system service and Design Lens | P6 | WP-10, WP-13, WP-20, WP-23 | Components, variants, tokens, variables/modes, libraries, inspect, design lint, matrices. |
| WP-25 | Canvas and alternatives | P6 | WP-13, WP-18, WP-24 | Persistent source-linked canvases, alternative candidates, publish/export. |
| WP-26 | Remote/cloud execution providers | P6–P7 | WP-15, WP-18, WP-19 | SSH/container/tunnel/cloud runner protocol, caches, remote browser, artifacts, teardown. |
| WP-27 | Automation, CLI, and APIs | P7 | WP-18, WP-20, WP-26 | Headless CLI, JSON events, REST/RPC/extension API, schedules/webhooks/CI. |
| WP-28 | Enterprise governance and audit | P7 | WP-14, WP-15, WP-22, WP-27 | Central policies, SIEM/audit, residency, retention, organization admin. |
| WP-29 | Extension/plugin/MCP/skill ecosystem | P5–P8 | WP-14, WP-17, WP-27 | Manifests, registry, signing, permissions, compatibility tiers, certification. |
| WP-30 | Deployment and rollback providers | P6–P7 | WP-13, WP-15, WP-20 | Build/release/deploy health, approvals, production evidence, rollback plans. |
| WP-31 | Accessibility and performance gates | P0–P8 | All | Continuous keyboard/screen-reader/contrast/zoom/reduced-motion/performance testing. |
| WP-32 | Cross-platform and remote E2E suite | P1–P8 | All | macOS/Windows/Linux, WSL/SSH/container/cloud, failure/reconnect/security scenarios. |

## 32.2 Recommended parallelization

After P0, four streams can proceed in parallel with strict interfaces: (1) native workbench/product shell, (2) terminal/SCM/tasks/debug/tests, (3) browser/evidence, and (4) domain schemas/policy/provider runtime. They converge at the P4 vertical slice. Collaboration and semantic design should not independently invent source, browser, or evidence models while those foundations are unsettled. Cloud and marketplace work should use the same execution/tool/policy contracts rather than create provider-specific shortcuts.

## 32.3 Architecture ownership

- One owner for upstream/fork health, release, product configuration, and core workbench integration.
- One owner for native execution: terminal, tasks, debug, tests, ports, remote authorities, and process lifecycle.
- One owner for browser/runtime evidence: integrated browser, Playwright/CDP, source maps, visual/a11y/network evidence.
- One owner for orchestration/trust: domain model, scheduler, tools, context, providers, policy, budgets, credentials, audit.
- One owner for collaboration/review: checkpoints, decisions, comments, presence, follow, RBAC, synchronization.
- One owner for semantic design: project graph, components/tokens/libraries, source mapping, Design Lens, canvas.
- Cross-cutting accessibility, security, data governance, performance, QA, and upstream compatibility are release responsibilities, not optional advisory tracks.