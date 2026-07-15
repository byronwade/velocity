# 26. Velocity Target Product Primitives

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

These records consolidate the product concepts that should differentiate Velocity from both a conventional IDE and a chat-first coding assistant. They form the minimum durable control model above Code-OSS.

| Capability | How it works | Velocity translation | Implementation / sequencing |
| --- | --- | --- | --- |
| VEL-TARGET-01 — Project as shared company context | A Project binds repositories, environments, services, data, tests, deployments, design system, instructions, identities, policies, and history. | Make Project the top-level durable aggregate and derive every Lens from the same source/evidence graph. | Implement ProjectService, ProjectManifest, repository/environment registries, and migrations.<br>Phase: P1 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-02 — Mission | A Mission is a bounded desired outcome with scope, acceptance criteria, staffing, autonomy, budget, approvals, risk, target environment, and required evidence. | Replace chat threads/workstreams as the durable unit of intent. Every autonomous action must belong to a mission or explicit maintenance context. | Create Mission entity/editor, templates, lifecycle, and APIs.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-03 — Named coworker | A Coworker is a persistent human-facing collaborator with role, department, skills, model policy, autonomy, memory, and history. | Keep identity stable while sessions/models/providers change. Coworkers coordinate and may dispatch Specialists. | Create CoworkerProfile and policy binding separate from runtime sessions.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-04 — Specialist | A Specialist is a temporary subagent with a narrow role and no independent long-term product identity. | Use specialists for research, testing, migration, review, or alternative generation under a parent coworker. | Implement SpecialistTemplate and child session lifecycle.<br>Phase: P5 • Priority: P0 • Sources: VEL-02;CUR-SUB |
| VEL-TARGET-05 — Work order | A Work Order is an executable contract specifying objective, scope, criteria, tools, budget, cycles, permissions, stop conditions, parent, and required return artifacts. | Make this the unit scheduled to local/remote agent runtimes and the boundary for worktrees, terminals, browsers, credentials, and evidence. | Implement durable WorkOrder state machine and execution context.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-06 — Lens | A Lens is a representation of the same project—Preview, Code, System, Data, Verify, Ship, or tool-specific views. | Lenses must not fork product state. They navigate linked semantic resources and evidence with context-preserving transitions. | Implement LensService over native workbench editors/views and project graph.<br>Phase: P2 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-07 — Stable environment | Stable is the last accepted, known-good source/environment state and primary comparison baseline. | Back Stable with immutable commit/checkpoint identity and environment manifest, not a mutable label. | Create StablePointer and environment provisioning rules.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-08 — Candidate environment | Candidate is an isolated revision currently being changed and verified. | Bind source worktree, running services, terminal namespace, browser profile, data sandbox, evidence, and owner to one candidate ID. | Implement CandidateEnvironment aggregate and lifecycle.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-09 — Checkpoint | A Checkpoint is a coherent versioned unit of work with source revisions, evidence, risk, approvals, rollback point, and authoring work orders. | Use checkpoints as the only path for autonomous changes to advance Stable. | Define signed manifest, readiness gates, review editor, and accept/revise/reject transitions.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-10 — Evidence | Evidence includes tests, screenshots, recordings, traces, diffs, diagnostics, health checks, affected areas, and risk. | Normalize evidence into typed immutable artifacts with producer, environment, revision, timestamps, confidence, and retention. | Build EvidenceStore, ArtifactStore, index, and viewers.<br>Phase: P3 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-11 — Decision | A Decision is a genuine human or policy judgment with options, recommendation, consequences, and resulting authority grant. | Use Decision Sheets for protected actions, product tradeoffs, conflicts, approvals, and irreversible operations—never generic confirmation dialogs for complex choices. | Implement Decision entity, option effects, approvers, expiry, and audit.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-12 — Scope reservation | A reservation temporarily claims a file, symbol, route, service, schema, token, test, or feature area. | Use reservations to coordinate and predict conflict while Git worktrees guarantee source isolation. | Implement semantic leases and overlap analysis.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-13 — Artifact-level work pin | A pin attaches intent to a rendered element, source symbol, system node, data object, test, or evidence item and can auto-assign the best coworker. | Upgrade coordinate pins to revision-resilient semantic anchors and structured intent. | Implement AnnotationTarget, assignment router, and reanchoring.<br>Phase: P5 • Priority: P0 • Sources: VEL-01;VEL-12 |
| VEL-TARGET-14 — Follow Mode | Follow Mode tracks a coworker's actual active resources, tools, latest checkpoint, and activity history. | Make follow opt-in, interruptible, privacy-aware, and evidence-oriented; it must never fabricate cursor motion or reasoning. | Build presence/event subscription and workbench navigation adapter.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-15 — Attention inbox | The inbox contains only blockers, decisions, requested approvals, conflicts, failed gates, and review-ready checkpoints. | Use policy and deduplication to prevent routine agent activity from becoming notifications. | Implement AttentionItem classifier, routing, snooze/delegate, and audit.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-16 — Autonomy levels | Autonomy controls how far coworkers may inspect, edit, execute, access network/secrets, resolve failures, and merge/deploy without intervention. | Represent autonomy as capability policy plus budget/stop conditions, not a single vague slider. | Define named policy profiles and per-action evaluation.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-17 — Budget | Budgets constrain tokens, wall time, tool calls, retries, compute, browser time, cloud cost, external APIs, and maximum cycles. | Show predicted/actual usage and stop before overruns; budget changes are explicit directives or decisions. | Implement BudgetService and metering across providers/tools.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-18 — Candidate health | Health summarizes build, diagnostics, tests, browser, data, performance, security, and environment status for a candidate. | Calculate health from evidence with freshness and confidence, never from agent prose. | Build HealthPolicy and derived status with drill-down.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-19 — Evidence-driven progress | Progress is demonstrated by changed artifacts and verification state rather than narrative status updates. | The stage should show current source/runtime/evidence deltas and only concise action summaries. | Project orchestration events into artifact views and timeline.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-20 — Direct takeover | The human can enter editor, terminal, browser, SCM, debug, tests, database, API, or deployment tools at any time. | Taking over pauses or narrows agent capabilities safely and preserves isolated work; returning control creates a clear handoff. | Implement ownership transitions and shared-resource policies.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-21 — Model/provider abstraction | Coworker identity and mission state survive provider/model changes or fallback. | Route by capability, policy, privacy, cost, and availability; record effective provider/model per step. | Implement ProviderRegistry and ModelRouter.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-22 — Local-first operation | Core project work, source, evidence, and orchestration can run locally without requiring a hosted backend, while remote/cloud is optional. | Use local database/content-addressed artifacts and native processes; synchronize only when collaboration or remote execution is enabled. | Implement local control plane with optional sync/cloud adapters.<br>Phase: P4 • Priority: P0 • Sources: VEL-01;VEL-02 |
| VEL-TARGET-23 — No hidden chain-of-thought | The product exposes plans, actions, evidence, summaries, and decisions, not private model reasoning. | Design audit data around observable inputs, tool calls, outputs, edits, and outcomes. | Define user-visible event schemas and avoid storing hidden reasoning fields.<br>Phase: P4 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-24 — Reversible by default | Every autonomous edit or operation should have a rollback path proportional to impact. | Source uses commits/worktrees; browser is ephemeral; tasks/processes are cancellable; data/deploy actions require snapshots/migrations/rollback plans. | Implement rollback capability declarations per tool and block unsupported high-risk actions.<br>Phase: P5 • Priority: P0 • Sources: VEL-02 |
| VEL-TARGET-25 — Calm default, full depth on demand | Most expert controls remain hidden until context or user request makes them useful, while all native IDE capabilities remain reachable. | Ship opinionated Velocity layouts and commands without removing underlying VS Code power. | Use profiles, view containers, context keys, command palette, and layout restoration.<br>Phase: P2 • Priority: P0 • Sources: VEL-02;VS-UI |
| VEL-TARGET-26 — Velocity vertical-slice acceptance gate | A real project can open; a mission creates a coworker work order; an isolated worktree and native terminal run; source changes launch in a real browser; tests, console, network, screenshots, accessibility, and diffs become evidence; a checkpoint can be revised, accepted, merged, deployed, and rolled back. | Make this the first integrated milestone before broad feature expansion or visual polish claims. | Build one production-quality end-to-end reference app and automate the complete flow across platforms.<br>Phase: P4 • Priority: P0 • Sources: VEL-02;VOSS-01;VS-BROWSER;VS-TERM-B |


---

# 27. Target Service Architecture

## 27.1 Service boundaries

The product should be implemented as a small number of durable domain services that coordinate native Code-OSS services. These boundaries are intentionally independent of React components and model providers. Each service exposes typed commands/events, supports cancellation where relevant, owns a clear subset of state, and can be exercised in headless tests.

| Service | Primary responsibility | Key dependencies |
| --- | --- | --- |
| ProjectService | Open/import/create projects; load `.velocity` manifest; resolve repositories, roots, environments, policies, and project metadata. | Workspace/file/storage/configuration services. |
| RepositoryService | Discover repositories, revisions, remotes, branches, worktrees, status, and provider metadata. | Native Git/SCM; hosting adapters. |
| WorktreeService | Create, bind, lock, recover, prune, and validate isolated worktrees for work orders. | RepositoryService; file/terminal/language services. |
| MissionService | Create/update missions, scope, criteria, staffing, autonomy, budgets, target environments, and status. | ProjectService; PolicyEngine; Scheduler. |
| CoworkerService | Manage named coworker profiles, roles, skills, memory policy, model policy, and history. | ProviderRegistry; SkillRegistry; MemoryService. |
| WorkOrderService | Persist executable contracts and state transitions from draft through running, blocked, verifying, review, completed, cancelled, or failed. | MissionService; Scheduler; CandidateService. |
| Scheduler | Resolve dependencies, concurrency, resource availability, reservations, reviewer independence, budgets, and priorities. | WorkOrderService; BudgetService; ExecutionProviderRegistry. |
| SessionManager | Create/resume/pause/cancel/archive local, remote, or provider sessions and recover at tool boundaries. | ProviderRegistry; ToolBroker; durable event log. |
| ProviderRegistry | Describe models/providers, capabilities, modality, context, tool support, region, privacy, price, and health. | Provider adapters and organization policy. |
| ModelRouter | Select effective model/provider and fallback according to task, policy, budget, privacy, and availability. | ProviderRegistry; PolicyEngine; BudgetService. |
| ToolBroker | Expose typed tools, authorize calls, impose bounds, cancel execution, normalize results, and emit audit/evidence events. | Native tool adapters; PolicyEngine; CapabilityLeaseService. |
| ContextBroker | Retrieve revision-bound files, symbols, graph entities, diagnostics, evidence, docs, memories, browser/terminal context, and user references. | Search/language/project graph/evidence/memory services. |
| LanguageBroker | Expose symbol, definition, reference, rename, code action, formatting, diagnostics, and syntax operations to agents. | Native language feature services and parsers. |
| TerminalBroker | Create scoped native terminals/tasks, manage processes/prompts/ports, capture command records, and enforce command policy. | Code-OSS terminal/tasks/process services. |
| BrowserBroker | Create isolated integrated-browser sessions; expose CDP/Playwright tools; manage storage, permissions, sharing, remote proxy, and trace. | Integrated browser/debug/remote services. |
| DebugBroker | Launch/attach debug sessions, manage agent breakpoints, inspect state, evaluate under policy, and capture snapshots. | Native debug/DAP services. |
| TestBroker | Discover/select/run/debug tests, collect coverage/results, track flake history, and compute checkpoint gates. | Native testing API/controllers. |
| SourceControlBroker | Stage/commit/rebase/merge/compare/restore and create host-provider PRs under product policy. | Native SCM/Git and hosting adapters. |
| CandidateService | Bind worktree, environment, terminal namespace, browser profile, services, data sandbox, evidence, and owner into one candidate. | Worktree/Execution/Environment services. |
| EnvironmentService | Resolve local/container/SSH/WSL/cloud authorities, toolchains, dependencies, services, env manifests, and lifecycle. | Remote services; runner providers; tasks. |
| ServiceRegistry | Allocate logical services/ports and map them to process, candidate, worktree, authority, protocol, and browser routes. | Terminal/Task/Remote/Browser services. |
| PolicyEngine | Evaluate organization, workspace trust, project, mission, tool, resource, data, environment, and user authorization policy. | Policy store; context keys; identity/RBAC. |
| CapabilityLeaseService | Issue/revoke exact time- and scope-bounded grants for tools, tabs, credentials, domains, resources, and protected operations. | PolicyEngine; DecisionService; CredentialBroker. |
| CredentialBroker | Issue expiring credentials/browser auth state without exposing raw values to models; rotate and revoke. | Native secret/auth services; enterprise identity. |
| BudgetService | Meter and enforce token, model, tool, wall-time, CPU, memory, storage, browser, network, and cloud-cost budgets. | Provider/tool/runner events. |
| ArtifactStore | Persist content-addressed screenshots, traces, logs, profiles, reports, plans, build outputs, and exported artifacts. | Local filesystem/object store; encryption/retention. |
| EvidenceService | Normalize evidence, bind to revision/environment, enforce freshness, compute confidence, and determine checkpoint sufficiency. | ArtifactStore; test/browser/debug/terminal/SCM events. |
| CheckpointService | Create manifests, determine readiness, manage review state, accept/revise/reject, merge, advance Stable, and coordinate rollback. | Evidence/SCM/Decision/Deployment services. |
| DecisionService | Create decision sheets, options, recommendations, required approvers, effects, expiry, and recorded outcomes. | PolicyEngine; inbox/notification service. |
| AnnotationService | Manage artifact pins, comments, mentions, replies, assignments, resolution, semantic anchors, and reanchoring. | CollaborationService; project graph; work orders. |
| CollaborationService | Identity, roles, durable shared state, selective CRDT, synchronization, offline queue, and audit. | Auth/RBAC; collaboration transport. |
| PresenceService | Ephemeral cursors, selections, viewport/Lens state, coworker markers, spotlight/follow, and privacy redaction. | Collaboration transport; workbench/session events. |
| ProjectGraphService | Index files, symbols, components, routes, schemas, tests, tokens, packages, services, links, and dependencies. | Language/search/framework adapters/file watches. |
| DesignSystemService | Normalize components, tokens, variables, modes, libraries, code bindings, usage, lint, and migration actions. | ProjectGraph; browser/source mapping; code actions. |
| SourceMappingService | Resolve browser elements and visual frames to source components/styles/tokens/tests and preserve semantic identity. | CDP, source maps, framework instrumentation, graph. |
| AutomationService | Handle schedules/webhooks/events, create governed missions/work orders, deduplicate, rate-limit, and route outcomes. | Scheduler; provider integrations; policy. |
| DeploymentService | Plan/execute/verify deployments, manage environments and rollback, and record live release evidence. | Provider adapters; PolicyEngine; CheckpointService. |
| AuditService | Append signed observable events, support redaction/retention/export/SIEM, and protect access. | All domain/tool services. |
| VelocityApiService | Expose versioned local/cloud RPC/REST/CLI/extension APIs for projects, work, artifacts, evidence, decisions, and automations. | All domain services through scoped authorization. |

## 27.2 Native service adapter rule

Each Broker must call the native Code-OSS service or an approved external provider; it must not reimplement the underlying subsystem. For example, TerminalBroker wraps terminal/task/process services, BrowserBroker wraps the integrated browser/debug/CDP/Playwright stack, and SourceControlBroker wraps SCM/Git. The wrapper adds identity, policy, evidence, and domain semantics. It does not become a second terminal, browser, or Git client.

## 27.3 Event-driven coordination

Cross-tool orchestration should use a versioned event model. Services emit facts such as work order started, command completed, file revision changed, port ready, browser console error observed, test run finished, evidence invalidated, checkpoint review requested, decision resolved, or capability revoked. Derived views—stage markers, progress, inbox, timeline, candidate health, and audit export—subscribe to the same facts. UI components should not mutate one another directly.

```
User command / automation trigger
    → MissionService / WorkOrderService
    → PolicyEngine + Scheduler
    → CandidateService provisions worktree/environment
    → SessionManager starts provider session
    → ContextBroker supplies scoped context
    → ToolBroker authorizes native tools
    → Native services emit structured results
    → ArtifactStore + EvidenceService persist proof
    → CheckpointService evaluates readiness
    → Review / Decision / Merge / Deploy / Rollback
    → AuditService records observable lifecycle
```

## 27.4 Headless parity

Every core domain operation must be callable through the same service API from the desktop UI, command palette, tests, CLI, automations, and remote control plane. A feature that exists only as a React click handler is not complete. Headless parity enables reliable CI, cloud execution, migrations, accessibility automation, and product verification.