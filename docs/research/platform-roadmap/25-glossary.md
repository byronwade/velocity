# Appendix E. Glossary

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

| Term | Definition |
| --- | --- |
| AgentExecutionContext | Immutable identity and authorization context propagated through every tool/native service for one session/work order/candidate. |
| Agent session | A runtime/provider instance executing one Work Order. It is replaceable and not the human-facing coworker identity. |
| Artifact | An immutable content-addressed output such as screenshot, trace, report, profile, build, plan, or exported file. |
| Attention inbox | A filtered set of blockers, decisions, approvals, conflicts, failed gates, and review-ready checkpoints requiring human attention. |
| Autonomy profile | A named capability policy controlling inspect/write/execute/network/secret/production authority, budgets, and stop conditions. |
| Candidate | An isolated source and runtime state under active work, bound to worktree, processes, browser profile, environment, and evidence. |
| Capability lease | A time-, resource-, and action-scoped authorization issued after policy evaluation or approval and revocable at any time. |
| Checkpoint | An immutable reviewable proposal containing exact source revisions, semantic impact, evidence, risks, approvals, and rollback. |
| Code-OSS | The open-source codebase underlying Visual Studio Code. Product distributions add branding, services, extensions, and policies. |
| ContextBroker | Service that selects revision-bound files, symbols, graph facts, evidence, docs, memories, and user references for a work order. |
| Coworker | A persistent named human-facing agent identity with role, skills, policy, memory, and work history. |
| CRDT | Conflict-free replicated data type used for concurrent collaborative editing. Recommended selectively for human co-editing, not universal agent merging. |
| Decision Sheet | A structured human/policy choice with question, options, consequences, recommendation, approvers, and resulting effects. |
| Design token | A reusable source-backed design value such as semantic color, spacing, typography, radius, elevation, or motion. |
| Evidence | Revision- and environment-bound proof produced by tools, tests, browser, diagnostics, debug, deployment, or review. |
| Evidence freshness | Whether evidence still applies after source, base, environment, policy, configuration, credential, or dependency changes. |
| Follow Mode | An opt-in view that tracks a human or coworker's actual active artifact, resources, tools, evidence, and blockers. |
| Lens | A representation of the same Project—Preview, Code, System, Data, Verify, Ship, Review, or a specialized tool view. |
| Mission | A durable desired outcome with scope, criteria, staffing, autonomy, risk, budget, environment, and evidence requirements. |
| ModelRouter | Service selecting model/provider based on capability, privacy, cost, latency, availability, policy, and explicit overrides. |
| Native tool | A tool implemented through Code-OSS services or an approved provider, not through screen scraping or a parallel mock subsystem. |
| PolicyEngine | Service combining organization policy, workspace trust, project rules, mission autonomy, user authority, risk, and active leases. |
| Presence | Ephemeral collaborator state such as cursor, selection, viewport, Lens, activity, and follow/spotlight information. |
| Project | Top-level shared aggregate binding repositories, environments, design system, tests, collaborators, policies, missions, Stable, and history. |
| Project graph | Incremental semantic index of files, symbols, components, routes, schemas, tests, tokens, packages, services, and dependencies. |
| Provider adapter | A normalized integration for a model/agent runtime or execution provider that does not own Velocity domain state. |
| ResourceRef | Revision-aware universal reference to a file, symbol, range, browser element, test, artifact, schema, service, or external resource. |
| Review stamp | A reviewer/approval record bound to an immutable checkpoint revision and specific file/range/evidence scope. |
| Scope reservation | A lease indicating intended ownership of files, symbols, components, routes, schemas, tokens, services, or other semantic scopes. |
| Semantic scope | A durable selection expressed through project graph identities rather than only paths or screen coordinates. |
| Source mapping | Resolution from rendered/browser/canvas elements to source components, styles, tokens, routes, tests, and owning files. |
| Specialist | A temporary bounded subagent with a narrow role, tools, budget, and return contract, nested under a coworker/work order. |
| Stable | The last accepted, known-good checkpoint pointer and comparison baseline; not simply the currently running mutable environment. |
| ToolBroker | The only authorized gateway through which agents invoke files, terminal, browser, tests, SCM, debug, MCP, and product tools. |
| Tool conformance | Requirements for typed schema, permission, cancellation, bounds, provenance, side effects, rollback, evidence, and audit. |
| Velocity-IDE | The reviewed Code-OSS fork recommended as Velocity's production editor/workbench/execution substrate. |
| Work order | A bounded executable contract with objective, semantic scope, criteria, tools, permissions, budget, stop conditions, and required artifacts. |
| Worktree | A Git working directory attached to a branch/commit, used as the default source-isolation boundary for concurrent autonomous writes. |
| Workspace Trust | Code-OSS safety boundary that limits execution and extension behavior for untrusted folders; foundational to Velocity policy. |

## E.1 Closing implementation rule

> **When a feature can be implemented by wrapping a native Code-OSS service with Velocity identity, policy, evidence, and workflow semantics, do that. Build a new subsystem only when the differentiated product requires a capability that Code-OSS does not own.**