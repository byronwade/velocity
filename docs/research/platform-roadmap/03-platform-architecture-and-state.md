# 5. Recommended Platform Architecture

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

## 5.1 Architectural principle

Velocity should be implemented as a product distribution and orchestration layer inside the Code-OSS architecture. The workbench remains responsible for editors, files, search, SCM, terminal, tasks, debugging, testing, notebooks, extensions, remote authorities, browser tabs, settings, keybindings, accessibility, and window lifecycle. Velocity adds durable project concepts, orchestration, permissions, evidence, collaboration, semantic artifact navigation, Stable/Candidate review, and agent-first design. This separation keeps the fork close enough to upstream to inherit security and platform improvements while giving Velocity a coherent product model.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Velocity Product Layer                                                     │
│ Project • Mission • Coworker • Work Order • Lens • Inbox • Follow • Ship  │
├────────────────────────────────────────────────────────────────────────────┤
│ Review & Collaboration                                                     │
│ Stable/Candidate • Checkpoints • Evidence • Decisions • Comments • Presence│
├────────────────────────────────────────────────────────────────────────────┤
│ Orchestration & Policy                                                     │
│ Scheduler • ToolBroker • ContextBroker • ModelRouter • Budget • Approvals  │
├────────────────────────────────────────────────────────────────────────────┤
│ Native Code-OSS Workbench                                                  │
│ Editors • Files • Search • SCM • Terminal • Tasks • Debug • Tests • Browser│
├────────────────────────────────────────────────────────────────────────────┤
│ Execution Authorities                                                      │
│ Local • Worktree • Sandbox • Container • SSH/WSL • Cloud Runner • Web      │
├────────────────────────────────────────────────────────────────────────────┤
│ Durable State                                                              │
│ Git • Project DB • Event Log • Artifact/Evidence Store • Policy • Secrets  │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Layer responsibilities

| Layer | Responsibilities | Must not own |
| --- | --- | --- |
| Velocity product layer | Project identity, missions, coworkers, work orders, Lens navigation, attention, follow, ship/rollback, product terminology. | Text-buffer correctness, PTY emulation, Git implementation, browser rendering, debugger/test adapter protocols. |
| Review/collaboration | Stable/Candidate, checkpoint manifests, evidence, review state, comments, decisions, approvals, presence, follow, history. | Mutable source truth, unversioned DOM edits, provider-specific session internals. |
| Orchestration/policy | Planning, scheduling, tool authorization, isolation, context retrieval, model routing, budgets, recovery, automation. | Rendering IDE primitives or bypassing native service permissions. |
| Native Code-OSS workbench | Files/editors/search/language, terminal/tasks/debug/test, SCM, browser, extensions, remote, settings, keybindings, accessibility. | Velocity's mission semantics, business approvals, cross-tool evidence policy. |
| Execution authorities | Processes, containers, remote hosts, cloud VMs, browser targets, credentials, network, resource limits. | Long-lived product truth or silent automatic promotion to Stable. |
| Durable state | Git revisions, object/event records, artifacts, policies, encrypted secrets, synchronization metadata. | Ephemeral view state or hidden model reasoning. |

## 5.3 Native integration pattern

Velocity-specific capabilities should enter the workbench through the same mechanisms used by mature Code-OSS features: commands, context keys, menu contributions, editor inputs, view containers, tree/data providers, markers, decorations, status entries, storage services, URI schemes, timeline providers, authentication sessions, and extension APIs. The production architecture should remove custom DOM event channels such as `velocity:open-tool` where native command/service invocation is available. A command-first design allows UI buttons, keyboard shortcuts, agents, automations, extensions, deep links, and tests to invoke the same authorized operation.

## 5.4 Provider-neutral agent architecture

A provider adapter receives a structured work order and returns a stream of user-visible plan/action/tool/result events. It never receives direct unrestricted access to files, shell, browser, or secrets. All operations pass through the ToolBroker, which applies the work-order capability envelope, workspace trust, organization policy, project policy, path/domain/environment scope, budget, approvals, and audit. A provider can be replaced without changing checkpoint, evidence, worktree, browser, terminal, or review semantics.

| Component | Contract |
| --- | --- |
| ProviderRegistry | Advertises provider, models, modalities, context limits, tool-call support, regions, retention/training terms, price metadata, health, and enterprise eligibility. |
| ModelRouter | Selects a model/provider from task needs and policy; supports explicit override, fallback, and no-fallback rules. |
| SessionManager | Creates, resumes, pauses, cancels, archives, and recovers local/remote agent sessions under a work order. |
| Scheduler | Orders work, respects dependencies, concurrency, reservations, budgets, environment capacity, and reviewer independence. |
| ToolBroker | Presents typed tools, authorizes every call, applies cancellation/limits, records provenance, and normalizes results. |
| ContextBroker | Retrieves revision-bound files, symbols, graph entities, diagnostics, evidence, docs, memories, and user references within token/privacy limits. |
| PolicyEngine | Combines hard organization policy, workspace trust, project policy, mission autonomy, user capability leases, and tool risk. |
| EvidenceCoordinator | Collects native tool results and determines checkpoint freshness, sufficiency, confidence, and required gates. |

## 5.5 Why not embed the React prototype as a webview

Embedding the entire existing product shell inside a Code-OSS webview would preserve visuals quickly but recreate the same architectural split: native editors, terminal, browser, search, SCM, and accessibility would exist outside the webview while the product state and navigation lived inside it. That would force message bridges for every action, fragment keyboard focus and restoration, duplicate layout state, weaken extension interoperability, and make native review/diagnostic services second-class. Custom editors/webviews remain appropriate for narrowly structured canvases or evidence visualizations; they are not the correct container for the whole product.

# 6. Source of Truth, State Boundaries, and Environment Isolation

## 6.1 Authoritative state hierarchy

| State class | Authoritative representation | Examples | Review/rollback mechanism |
| --- | --- | --- | --- |
| Source | Git objects plus file content and metadata. | Code, config, assets, docs, schemas, migrations, tests. | Commit/diff/merge/revert/worktree. |
| Environment | Versioned environment manifest plus runtime identity. | Toolchain, dependencies, container image, services, variables, ports. | Recreate environment; compare manifests; terminate leases. |
| Product orchestration | Typed durable entities and append-only events. | Mission, coworker, work order, reservation, checkpoint, decision. | Versioned object transitions; audit; compensation. |
| Evidence | Immutable typed artifacts bound to revision and environment. | Test run, screenshot, trace, diagnostics, profile, deployment result. | Re-run; invalidate on dependency change; retain hashes. |
| Collaboration | Durable comments/decisions plus ephemeral presence; selective CRDT for shared human text. | Pins, threads, followers, human cursors, collaborative notes. | Thread history; CRDT reconciliation; role/audit controls. |
| View state | Native workbench/editor/browser/terminal layout state. | Open editors, zoom, active Lens, panel size, selected artifact. | Workspace/profile restoration; safe reset. |
| Secrets | Encrypted credential stores and expiring capability leases. | Git token, cloud role, database credential, browser auth state. | Revoke/expire/rotate; no Git or prompt persistence. |

## 6.2 Candidate environment boundary

A Candidate is not merely a branch name. It is an aggregate that binds a base revision, worktree, process tree, terminal group, port/service registry, browser profile, optional data sandbox, credentials, environment fingerprint, active work orders, evidence, and checkpoint history. Every resource must carry the Candidate ID so that `localhost`, file URIs, terminal output, browser cookies, diagnostics, test results, and screenshots cannot be confused with Stable or another agent's work.

## 6.3 Worktree as source-isolation default

Git worktrees are the correct default boundary for parallel autonomous writes because they preserve native repository semantics, share object storage, integrate with existing language/build/test tools, and yield ordinary commits/diffs. They do not solve every conflict: two agents can still make semantically incompatible changes in different worktrees. Velocity therefore combines worktrees with semantic scope reservations, planned-change previews, dependency analysis, base-drift tracking, and a combined integration candidate before acceptance.

## 6.4 Browser and terminal isolation

A worktree without runtime isolation is insufficient. Two agents may launch identical package scripts, bind the same port, read the wrong environment file, use shared cookies, or inspect one another's pages. The terminal factory must inject work-order identity, cwd, environment, policy, and process ownership. The service registry allocates ports and maps logical service names. The browser factory creates the correct storage partition, network policy, remote authority, and shared-page capability. Cleanup verifies that processes, tunnels, ports, browser partitions, temporary credentials, and worktrees are released or deliberately retained.

## 6.5 Selective CRDT, not universal CRDT

A CRDT such as Yjs is appropriate when multiple humans intentionally edit the same text document or collaborative note simultaneously. It is not the right universal merge primitive for agents making cross-file semantic changes. Agents should produce patches/commits in isolated branches, because those units are reviewable, testable, attributable, reversible, and compatible with the entire Git ecosystem. Network CRDT integration should begin with human co-editing and presence, then expand only where the conflict semantics are well understood. [VEL-09]