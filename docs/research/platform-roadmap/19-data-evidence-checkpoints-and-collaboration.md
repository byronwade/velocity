# 28. Target Data Model

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

## 28.1 Core entities

The following model separates durable product truth from provider session details and native tool state. IDs must remain stable across restarts and provider changes. Revision-bound entities must reference immutable Git/object/environment identities. Mutable labels and UI coordinates are supplemental metadata, not primary identity.

| Entity | Minimum fields | Purpose / rule |
| --- | --- | --- |
| Project | projectId, name, manifestVersion, workspaceUri, repositories, environments, policies, stableCheckpointId, graphRevision | Top-level aggregate; owns missions, collaborators, history, and configuration. |
| RepositoryBinding | repositoryId, rootUri, remote/provider, defaultBranch, currentStableCommit, trust, roles | Connects a Project to one source-control repository. |
| EnvironmentDefinition | environmentId, kind, authority, manifest, services, dataClass, credentialScopes, policy | Named local/remote/container/cloud/production execution target. |
| Mission | missionId, title, objective, included/excluded scope, criteria, risk, autonomy, budget, staffing, state | Durable user outcome and acceptance contract. |
| Coworker | coworkerId, name, role, department, skills, modelPolicy, autonomyDefault, memoryPolicy, status | Persistent human-facing agent identity. |
| SpecialistTemplate | templateId, role, instructionsRef, skills, tools, modelPolicy, returnSchema | Reusable temporary subagent definition. |
| WorkOrder | workOrderId, missionId, assignee, parentId, objective, scope, criteria, tools, permissions, budget, state, attempts | Executable bounded unit scheduled to a session. |
| AgentSession | sessionId, workOrderId, provider, model, location, start/end, state, contextManifest, lastRecoveryPoint | Provider/runtime instance; replaceable and resumable. |
| CandidateEnvironment | candidateId, baseCheckpoint, worktreeBindings, authority, terminalNamespace, browserProfile, services, dataSandbox, owner | Isolation aggregate for source and runtime state. |
| ScopeReservation | reservationId, owner, semanticTargets, lease, overlapPolicy, priority, state | Coordination lease over files/symbols/routes/schemas/tokens/etc. |
| ResourceRef | resourceId, uri, kind, revision, semanticId, range/bounds, environment, provenance | Universal reference to files, symbols, elements, tests, artifacts, or external resources. |
| Plan | planId, mission/workOrder, assumptions, steps, dependencies, risks, alternatives, evidencePlan, revision | Reviewable plan artifact, distinct from hidden reasoning. |
| ToolCall | toolCallId, sessionId, tool, schemaVersion, inputRef, policyDecisionId, timing, status, resultRef, sideEffects | Observable agent/tool action. |
| CommandRun | commandRunId, terminal/task, executable/command, cwd, envHash, process, timing, exit, outputRefs, file/network effects | Structured terminal/task evidence. |
| BrowserRun | browserRunId, session/profile, routes, steps, storageMode, permissions, console/networkRefs, screenshots, trace, result | Structured browser verification or interaction record. |
| TestRun | testRunId, controller/profile, revision, environment, selectedTests, results, coverage, duration, artifacts | Structured test evidence. |
| Artifact | artifactId, contentHash, kind, mediaType, size, producer, revision, environment, classification, retention, storageUri | Content-addressed immutable artifact. |
| Evidence | evidenceId, kind, subjectRefs, revision, environment, producer, result, confidence, freshness, artifactRefs, supersedes | Normalized proof used by readiness policies. |
| Checkpoint | checkpointId, mission, candidate, base/head revisions, workOrders, changes, evidence, risks, approvals, rollback, state | Reviewable coherent proposal that may advance Stable. |
| ReviewStamp | reviewId, checkpointRevision, reviewer, scope, reviewedFiles/ranges/evidence, decision, timestamp, invalidationState | Fine-grained review/approval state. |
| Decision | decisionId, contextRefs, question, options, recommendation, requiredRoles, selectedOption, effects, expiry, audit | Explicit human/policy choice. |
| CapabilityLease | leaseId, grantee, capability, resource/domain/environment scope, conditions, issuedBy, expiry, revocation | Temporary authorization for tools, secrets, pages, or protected actions. |
| CommentThread | threadId, target, author, text, replies, mentions, assignment, status, revisionHistory, notifications | Durable collaborative annotation/work discussion. |
| PresenceState | participant, project, lens, resource, selection/bounds, viewport, activity, expiry, privacyClass | Ephemeral collaboration state; not historical truth unless sampled under policy. |
| MemoryRecord | memoryId, scope, subject, content, provenance, confidence, created/updated, expiry, visibility | Inspectable durable memory with explicit scope. |
| PolicyDecision | policyDecisionId, policyVersions, subject, action, resource, outcome, reason, requiredApproval, leaseId | Auditable authorization result. |
| Deployment | deploymentId, checkpoint, provider, environment, build, release, URL, health, approvals, rollbackPlan, status | Deployment lifecycle and production evidence. |
| AutomationDefinition | automationId, trigger, missionTemplate, permissions, budget, owner, dedupe, schedule/filter, enabled | Governed scheduled/event-triggered work. |
| AuditEvent | eventId, sequence, timestamp, actor, project, correlation, type, payloadRef, classification, signature | Append-only observable lifecycle event. |

## 28.2 Relationship rules

- A Mission may own many Work Orders; a Work Order has exactly one primary mission context, even if it references other missions.
- A named Coworker may own many Work Orders over time; an AgentSession belongs to one Work Order and may be replaced or resumed.
- A write-capable Work Order belongs to exactly one CandidateEnvironment at a time. A Candidate can contain multiple coordinated Work Orders only when their isolation and merge policy is explicit.
- Every Evidence item references immutable source/environment identities. Evidence without a revision, environment, producer, and timestamp cannot satisfy a checkpoint gate.
- A Checkpoint references exact candidate/base revisions and an evidence set. New source changes create a new checkpoint revision and trigger review/evidence invalidation.
- Stable is a pointer to an accepted Checkpoint manifest, not a mutable environment label. Runtime environments may drift and must be reconciled against the manifest.
- Capability leases never modify organization hard policy. A user can grant only authority they possess, for an explicitly scoped duration and resource set.
- Presence is ephemeral. Comments, decisions, work-order events, checkpoints, and audit records are durable and access-controlled.
- Artifacts are content-addressed and immutable. Metadata may be superseded, reclassified, or have retention changed without mutating the content identity.
- Provider/model/session identifiers are provenance, not business identity. The Project, Mission, Coworker, Work Order, Checkpoint, and Evidence remain usable if the provider disappears.

## 28.3 Storage recommendation

Use Git for source and versioned project configuration; a local transactional database—SQLite is already present in the fork's dependency graph—for domain objects, indexes, event positions, review state, and synchronization metadata; and a content-addressed artifact directory or object store for large immutable outputs. The local control plane should function without a hosted service. Collaboration, cloud runners, and cross-device access add synchronization services, but they should not replace local project authority or make the product unusable offline.

## 28.4 Schema evolution

Every durable entity and event requires a schema version, forward migration, safe read of older records, and export representation. Provider/tool payloads should be stored behind versioned normalized records with optional raw attachments, preventing vendor response formats from leaking into the domain model. Changes to checkpoint or policy semantics require explicit migration and re-validation rules.

# 29. Evidence and Checkpoint Protocol

## 29.1 Evidence principles

- Evidence is produced by native services or approved tools, not invented in agent prose.
- Evidence is bound to exact source revisions, environment identity, tool/provider versions, configuration, and timestamps.
- Freshness is dependency-aware. A source, base, environment, policy, credential, test-selection, or browser-profile change can invalidate evidence.
- Evidence has a subject and scope: file/symbol, component, route/flow, service, schema, deployment, or whole candidate.
- Evidence records result, confidence, limitations, redactions, and whether it is required, advisory, waived, or superseded.
- Large raw outputs remain artifacts; summaries are derived and link back to raw proof.
- Stable/Candidate comparison uses equivalent capture conditions or clearly discloses differences.
- A checkpoint may be reviewable while some evidence fails, but it cannot be marked ready unless policy allows and the waiver is an explicit decision.

## 29.2 Evidence types

| Evidence class | Contents | Gate semantics |
| --- | --- | --- |
| Source change | Git diff, multi-diff, commits, file metadata, rename/move detection, generated-versus-authored classification. | Always required for source-changing checkpoints. |
| Build/task | Resolved task, command run, environment hash, diagnostics, output, exit state, artifacts. | Required according to project build policy. |
| Diagnostics | Compiler, language server, linter, formatter, security, design-lint, and problem-matcher findings. | Compare new versus existing; severity thresholds. |
| Tests | Selected and required test profiles, result tree, failures, durations, retries, flake confidence, coverage. | Impact-driven plus mandatory gates. |
| Browser behavior | Routes/steps/assertions, console, network, dialogs, storage, screenshots, traces, accessibility snapshots. | Required for user-facing web behavior. |
| Visual | Stable/Candidate captures, viewport/mode matrix, perceptual diff, changed regions, accepted baselines. | Required for visual scope; deterministic capture rules. |
| Accessibility | Automated checks, accessibility tree, keyboard/focus path, contrast, zoom, reduced motion, manual review where required. | Risk/project-specific mandatory gates. |
| Debug | Launch/attach identity, breakpoints, stacks, variable snapshots, reproduced failure, observed fix. | Required when debugging is part of proof or reproduction. |
| Performance | Build/runtime timings, profiles, memory, network waterfall, bundle size, core metrics, baseline comparison. | Required for performance-sensitive changes. |
| Data/schema | Migration plan, schema diff, validation, sample results, rollback, backup/snapshot, compatibility. | Mandatory for persistent data changes. |
| Security | Dependency/secret/static/dynamic findings, permissions, network changes, threat model deltas, policy checks. | Mandatory for security-relevant scope. |
| API/contract | Schema diff, request/response fixtures, compatibility, consumer tests, documentation. | Required for externally consumed interfaces. |
| Deployment | Build provenance, release artifact, environment, health checks, rollout status, monitoring, rollback rehearsal. | Required before or after ship according to policy. |
| Human review | Reviewed ranges/evidence, product/UX/security/data/operator approvals, unresolved comments and decisions. | Derived from role and risk policy. |
| Cost/resource | Tokens, model calls, compute, wall time, external API cost, browser/runner usage, budget variance. | Advisory by default; required for budget-controlled missions. |

## 29.3 Checkpoint lifecycle

```
DRAFT
  ├─ source/environment still changing
  └─ evidence may be incomplete or stale
        ↓
VERIFYING
  ├─ required native checks are running
  ├─ failures return work to the responsible Work Order
  └─ new changes invalidate affected results
        ↓
READY_FOR_REVIEW
  ├─ manifest is immutable for this revision
  ├─ required evidence is fresh or explicitly waived
  └─ reviewers receive Stable/Candidate + source/evidence context
        ↓
IN_REVIEW
  ├─ comments, reviewed ranges, approvals, decisions
  ├─ any new candidate/base change creates a new review revision
  └─ request changes → REVISING
        ↓
APPROVED
  ├─ required roles and policies satisfied
  └─ merge/integration candidate still must pass final checks
        ↓
ACCEPTING
  ├─ rebase/merge, combined verification, manifest finalization
  └─ partial failure triggers compensation and does not advance Stable
        ↓
ACCEPTED → Stable pointer advances → optional deploy
or REJECTED / SUPERSEDED / ROLLED_BACK
```

## 29.4 Readiness algorithm

Checkpoint readiness should be deterministic enough to explain. The service evaluates project and mission policy against the exact checkpoint revision: required evidence types, target scopes, freshness, severity thresholds, test profiles, browser matrices, approvals, unresolved comments/decisions, base drift, conflicts, budget exceptions, protected files, data/deployment risk, and rollback capability. The result is a structured list of satisfied, failed, missing, waived, and stale gates. A model may summarize the result, but it may not decide that required evidence is unnecessary.

## 29.5 Review experience

| Review region | Default content |
| --- | --- |
| Summary | Mission intent, user-visible outcome, affected areas, risk, base/head revisions, coworker/work orders, budget, rollback. |
| Stable/Candidate | Synchronized running artifact, source, system, data, test, or deployment comparison appropriate to the change. |
| Change index | Files/hunks, semantic components/routes/schemas/tokens, visual regions, API/contracts, and dependencies ordered by risk/impact. |
| Evidence | Fresh required results first; failures/waivers prominent; raw artifacts reachable through deep links. |
| Discussion | Pinned notes, replies, review requests, resolved/unresolved threads, decisions, and revision directives. |
| Actions | Accept, request changes, reject, open tool, take over, rerun evidence, create decision, approve role-specific gate, rollback preview. |

## 29.6 Review invalidation

A review stamp is tied to immutable blobs/ranges/evidence. If an agent changes a reviewed file, only affected ranges and dependent evidence should be invalidated where possible. Whole-checkpoint approval must be invalidated when the base revision changes, a protected dependency changes, environment or policy changes materially, a merge conflict is resolved, required evidence is rerun with different results, or the checkpoint manifest changes. The UI must clearly separate previously reviewed unchanged content from new or invalidated content.

## 29.7 Rollback

Rollback is a plan, not a button label. Source-only local checkpoints may be abandoned by deleting the worktree. Merged checkpoints use revert or forward-fix commits. Deployed checkpoints require release rollback, health verification, and possible data compatibility checks. Database or external-system changes require backups, down migrations or compensating operations, and operator approval. Every checkpoint manifest should state its supported rollback mechanism and any irreversible effects before acceptance.

# 30. Collaboration and Conflict Model

## 30.1 Human collaboration

Human collaboration combines durable and ephemeral channels. Presence, cursor position, viewport, selection, and spotlight are ephemeral leases. Comments, mentions, assignments, decisions, reviews, and approvals are durable entities. Simultaneous human text editing may use Yjs or another CRDT through the existing collaboration seam, but only after identity, access control, offline/reconnect, file-service integration, undo semantics, save/SCM behavior, and large-file limits are defined. [VEL-09; FIG-DESIGN]

## 30.2 Agent collaboration

Agents do not collaborate by sharing one mutable text buffer. They collaborate through plans, work orders, reservations, immutable events, isolated worktrees, typed return artifacts, and integration checkpoints. A coordinator can fan out research, implementation, testing, or review work. Child sessions are bounded by scope and return contracts. The parent remains accountable for synthesis and cannot cite an unvalidated subagent claim as evidence.

## 30.3 Presence representation

| Participant | Spatial representation | Structured detail | Privacy rule |
| --- | --- | --- | --- |
| Human collaborator | Optional live cursor, selection outline, viewport/route/Lens, identity avatar. | Current resource, role, status, spotlight/follow controls. | User/project policy controls precision and retention. |
| Named coworker | Semantic marker on active artifact/resource; no synthetic mouse movement. | Objective, scope, current tool/resource, latest action, evidence, blocker, work-order state. | Only observable work events; no hidden reasoning. |
| Specialist/subagent | Usually nested under parent coworker; marker only when directly relevant. | Role, assigned scope, status, return artifact, budget. | Avoid visual clutter and false personality. |
| Automation/reviewer | Timeline/inbox/checkpoint marker rather than cursor. | Trigger, policy, findings, required response. | Identity and authority always explicit. |

## 30.4 Conflict classes

| Conflict | Detection | Resolution |
| --- | --- | --- |
| Textual Git conflict | Two candidates edit overlapping lines or one candidate updates over a changed base. | Native merge editor; agent may propose; human/owner policy resolves protected or ambiguous cases. |
| Semantic source conflict | Different files compile but express incompatible API, schema, state, or architectural changes. | Project graph/dependency analysis, combined build/tests, decision sheet, integration work order. |
| Design-system conflict | Agents change the same token, component contract, mode, or library in incompatible ways. | Reservation/usage graph, token/component diff, visual matrix, design-system owner review. |
| Runtime conflict | Processes bind same ports, share mutable service state, or use incompatible environment versions. | Per-candidate service registry, namespaces, container/data isolation, environment manifests. |
| Credential conflict | Two sessions use or rotate a shared credential, or one lease is revoked. | Credential broker, scoped sessions, version/expiry awareness, reauthorization. |
| Data conflict | Candidates mutate shared databases or migrations in incompatible order. | Per-candidate sandbox, migration graph, backups, integration environment, operator decision. |
| Review conflict | Different reviewers approve/reject different scopes or a new revision invalidates prior review. | Typed role approvals, scope-aware review stamps, clear invalidation and final policy resolution. |
| Policy conflict | Mission/user request contradicts organization/project policy. | Hard policy wins; create a visible denied decision with escalation path where allowed. |
| Instruction conflict | Rules, skills, docs, user directives, and external content disagree. | Explicit precedence, provenance, conflict report, ask only when unresolved and material. |
| Resource conflict | Parallel work exceeds model/API/browser/CPU/runner budget or capacity. | Scheduler throttling, priorities, queue, budget decisions, graceful cancellation. |

## 30.5 Reservation semantics

- Reservations use semantic targets when possible: symbol IDs, routes, API operations, schemas, components, tokens, tests, services, deployment targets, or data domains; file/path reservations are fallback.
- Reservations are leases with owner, mission/work order, purpose, start, expiry, priority, and overlap policy. They expire automatically and are released on completion/cancellation.
- Read access is normally non-exclusive. Write intent may be advisory, shared with coordination, or exclusive for protected scopes.
- Overlap generates a structured event before work begins or as plans change. The scheduler can serialize, split scope, ask coordinators to negotiate, or allow independent work with a mandatory integration step.
- Reservations reduce collisions but never substitute for worktrees, tests, review, or merge conflict handling.

## 30.6 Offline and synchronization strategy

The local desktop remains authoritative for local-only projects. In collaborative projects, a synchronization service replicates durable domain events/objects, comments, permissions, and selected CRDT documents. Presence uses expiring real-time channels. Git and artifacts synchronize through their appropriate transports rather than being embedded indiscriminately into the collaboration protocol. Clients maintain an offline queue for permitted durable actions and reconcile using object versions, event sequence, CRDT rules, or explicit conflicts. Protected decisions, approvals, and capability grants must not be silently accepted offline unless policy defines that authority.

## 30.7 Collaboration acceptance gate

The collaboration system is ready only when roles and invitation lifecycle, human presence, follow/spotlight, semantic comments, mentions/notifications, network text co-editing where supported, offline/reconnect, review-state synchronization, audit, privacy controls, and conflict handling work under latency, duplicate delivery, partial failure, and revoked access. The current demo invite and same-window text broadcast remain specification fixtures until that gate passes.