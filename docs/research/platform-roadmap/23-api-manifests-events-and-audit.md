# Appendix A. API and Manifest Sketches

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

The following interfaces are architectural sketches, not a final public API. They illustrate the separation among durable domain objects, provider sessions, native tools, policy, and evidence.

## A.1 Project manifest

```
// .velocity/project.json
{
  "schemaVersion": "1.0",
  "projectId": "proj_checkout",
  "name": "Commerce Platform",
  "repositories": [
    { "id": "web", "root": ".", "role": "application", "defaultBranch": "main" },
    { "id": "design", "root": "../design-system", "role": "design-system" }
  ],
  "environments": [
    {
      "id": "local",
      "kind": "local",
      "services": [
        { "id": "web", "task": "dev", "ready": { "port": 3000 } },
        { "id": "api", "task": "dev:api", "ready": { "port": 4000 } }
      ]
    }
  ],
  "evidencePolicies": {
    "ui-change": ["build", "diagnostics", "tests:impacted", "browser:flow",
                  "visual:responsive", "accessibility", "console", "network"]
  },
  "protectedScopes": [
    { "match": "environment:production", "requires": ["operator", "decision"] },
    { "match": "path:infra/**", "requires": ["maintainer", "security-review"] }
  ],
  "rules": ["./rules/architecture.md", "./rules/design-system.md"],
  "skills": ["velocity://skills/web-ui", "velocity://skills/test-browser"]
}
```

## A.2 Durable work order

```
export interface WorkOrder {
  id: WorkOrderId;
  missionId: MissionId;
  assignee: { kind: "coworker" | "specialist"; id: string };
  parentWorkOrderId?: WorkOrderId;

  objective: string;
  scope: SemanticScope[];
  excludedScope: SemanticScope[];
  acceptanceCriteria: Criterion[];
  evidencePlan: EvidenceRequirement[];

  tools: ToolCapability[];
  permissionEnvelope: PermissionEnvelope;
  autonomy: AutonomyProfileId;
  budget: Budget;
  stopConditions: StopCondition[];
  returnContract: ArtifactContract[];

  candidateId?: CandidateId;
  state: WorkOrderState;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
```

## A.3 Provider adapter

```
export interface AgentProvider {
  readonly descriptor: ProviderDescriptor;

  createSession(input: {
    workOrder: WorkOrder;
    contextManifest: ContextManifest;
    model: ResolvedModel;
    eventSink: AgentEventSink;
  }): Promise<AgentSessionHandle>;

  resumeSession(input: {
    sessionId: AgentSessionId;
    recoveryPoint: RecoveryPoint;
    eventSink: AgentEventSink;
  }): Promise<AgentSessionHandle>;

  cancelSession(sessionId: AgentSessionId, reason: CancelReason): Promise<void>;
}

export interface AgentSessionHandle {
  readonly id: AgentSessionId;
  sendDirective(directive: Directive): Promise<void>;
  pause(mode: "safe-point" | "immediate"): Promise<RecoveryPoint>;
  waitForCompletion(signal: AbortSignal): Promise<SessionOutcome>;
}
```

## A.4 Tool broker

```
export interface ToolBroker {
  listTools(context: AgentExecutionContext): Promise<ToolDescriptor[]>;

  invoke<I, O>(request: {
    context: AgentExecutionContext;
    toolId: string;
    schemaVersion: string;
    input: I;
    idempotencyKey?: string;
    signal: AbortSignal;
  }): Promise<ToolResult<O>>;
}

export interface ToolDescriptor {
  id: string;
  title: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  sideEffects: ("read" | "write" | "execute" | "network" | "credential" | "production")[];
  rollback: "none" | "automatic" | "compensating" | "manual";
  defaultRisk: RiskClass;
  supportsCancellation: boolean;
  supportsIdempotency: boolean;
  evidenceProduced: EvidenceKind[];
}
```

## A.5 Policy evaluation

```
export interface PolicyEngine {
  evaluate(request: ActionRequest): Promise<PolicyDecision>;
}

export interface ActionRequest {
  actor: ActorRef;
  projectId: ProjectId;
  missionId?: MissionId;
  workOrderId?: WorkOrderId;
  action: string;
  capability: string;
  resource: ResourceRef | EnvironmentRef | DomainRef;
  risk: RiskAssessment;
  requestedDuration?: number;
  context: {
    workspaceTrust: "trusted" | "untrusted";
    organizationPolicyVersion?: string;
    projectPolicyVersion: string;
    autonomyProfile?: string;
    existingLeases: CapabilityLease[];
  };
}

export type PolicyDecision =
  | { outcome: "allow"; lease: CapabilityLease; reasons: string[] }
  | { outcome: "deny"; reasons: string[]; appeal?: DecisionTemplate }
  | { outcome: "ask"; request: ApprovalRequest; reasons: string[] };
```

## A.6 Evidence record

```
export interface EvidenceRecord {
  id: EvidenceId;
  kind: EvidenceKind;
  subjects: ResourceRef[];
  sourceRevision: RevisionSet;
  environment: EnvironmentFingerprint;
  producer: ProducerRef;
  toolVersions: Record<string, string>;
  startedAt: string;
  completedAt: string;

  result: "pass" | "fail" | "warning" | "unknown";
  confidence: number;
  limitations: string[];
  freshnessDependencies: FreshnessDependency[];
  artifacts: ArtifactRef[];
  redactions: RedactionSummary;
  supersedes?: EvidenceId[];
}
```

## A.7 Checkpoint manifest

```
export interface CheckpointManifest {
  id: CheckpointId;
  revision: number;
  projectId: ProjectId;
  missionId: MissionId;
  candidateId: CandidateId;

  base: RevisionSet;
  head: RevisionSet;
  commits: CommitRef[];
  workOrders: WorkOrderId[];
  changedResources: ResourceRef[];
  semanticImpact: SemanticImpact[];

  evidence: EvidenceId[];
  readiness: GateEvaluation[];
  risks: RiskAssessment[];
  decisions: DecisionId[];
  approvals: ReviewStampId[];
  unresolvedComments: CommentThreadId[];

  rollback: RollbackPlan;
  state: CheckpointState;
  manifestHash: string;
  createdAt: string;
}
```

## A.8 Native command namespace

```
velocity.project.open
velocity.project.import
velocity.mission.create
velocity.mission.edit
velocity.mission.pause
velocity.coworker.add
velocity.coworker.follow
velocity.coworker.setAutonomy
velocity.workOrder.open
velocity.workOrder.pause
velocity.workOrder.cancel
velocity.workOrder.redirect
velocity.annotation.add
velocity.annotation.assign
velocity.checkpoint.open
velocity.checkpoint.rerunEvidence
velocity.checkpoint.accept
velocity.checkpoint.requestChanges
velocity.checkpoint.reject
velocity.decision.open
velocity.decision.resolve
velocity.candidate.compareStable
velocity.candidate.openTerminal
velocity.candidate.openBrowser
velocity.candidate.takeOver
velocity.ship.preview
velocity.ship.deploy
velocity.rollback.preview
velocity.rollback.execute
```

## A.9 Tool result envelope

```
{
  "toolCallId": "tc_01J...",
  "toolId": "browser.runFlow",
  "schemaVersion": "1.0",
  "status": "succeeded",
  "startedAt": "2026-07-15T16:20:00Z",
  "completedAt": "2026-07-15T16:20:14Z",
  "policyDecisionId": "pd_...",
  "capabilityLeaseId": "lease_...",
  "result": {
    "assertions": [{ "name": "Checkout completes", "status": "pass" }],
    "consoleErrors": 0,
    "failedRequests": 0
  },
  "sideEffects": {
    "files": [],
    "processes": [],
    "networkDomains": ["localhost:3000", "localhost:4000"]
  },
  "artifactRefs": ["artifact_trace", "artifact_screenshot"],
  "evidenceRefs": ["evidence_browser_flow"],
  "redactions": { "count": 2, "classes": ["cookie", "authorization-header"] }
}
```

# Appendix B. Event and Audit Schema

## B.1 Event envelope

```
export interface VelocityEvent<T = unknown> {
  schemaVersion: "1.0";
  id: EventId;
  sequence: number;
  timestamp: string;

  projectId: ProjectId;
  missionId?: MissionId;
  workOrderId?: WorkOrderId;
  candidateId?: CandidateId;
  checkpointId?: CheckpointId;
  sessionId?: AgentSessionId;
  correlationId: string;
  causationId?: EventId;

  actor: ActorRef;
  type: string;
  classification: "public" | "project" | "confidential" | "restricted";
  payload: T | ArtifactRef;
  redaction?: RedactionSummary;
  signature?: string;
}
```

## B.2 Event families

| Family | Representative event types | Purpose |
| --- | --- | --- |
| Project | project.opened, manifest.loaded, repository.discovered, environment.changed, trust.changed, graph.updated | Project lifecycle and source/environment context. |
| Mission | mission.created, mission.updated, mission.paused, mission.completed, mission.cancelled | User outcome contract and lifecycle. |
| Coworker | coworker.added, assigned, followed, paused, resumed, archived, modelPolicy.changed | Human-facing agent identity and control. |
| Work order | workOrder.created, planned, queued, started, blocked, redirected, verifying, completed, failed, cancelled | Executable contract lifecycle. |
| Session | session.created, provider.selected, model.selected, paused, resumed, recovered, crashed, archived | Provider/runtime lifecycle; not business identity. |
| Context | context.requested, item.selected, item.redacted, budget.exceeded, memory.read, memory.written | What observable context entered a run. |
| Tool | tool.requested, policy.evaluated, approval.requested, tool.started, progress, completed, failed, cancelled | Authorized action lifecycle. |
| File/source | file.read, workspaceEdit.proposed, workspaceEdit.applied, revision.changed, format.applied, conflict.detected | Source operations and changes. |
| Terminal/task | terminal.created, command.started, command.completed, process.ready, task.completed, port.opened, terminal.disposed | Process and command evidence. |
| Browser | browser.created, navigated, shared, access.revoked, action.completed, console.observed, network.observed, screenshot.captured, trace.completed | Browser interaction and evidence. |
| Debug/test | debug.started, breakpoint.added, snapshot.captured, testRun.started, testResult.updated, coverage.completed | Verification services. |
| Artifact/evidence | artifact.stored, evidence.created, evidence.invalidated, gate.evaluated, evidence.waived | Proof lifecycle. |
| Checkpoint | checkpoint.created, submitted, review.requested, revised, approved, accepted, rejected, superseded, rolledBack | Stable/Candidate lifecycle. |
| Review/decision | comment.created, reply.added, review.marked, approval.granted, approval.invalidated, decision.created, decision.resolved | Human collaboration and authority. |
| Presence | presence.joined, presence.updated, follow.started, follow.stopped, spotlight.started, presence.expired | Ephemeral collaboration; sampled only if policy permits. |
| Security | capability.granted, capability.revoked, credential.issued, network.denied, secret.redacted, policy.denied, trust.violation | Trust and security control-plane facts. |
| Deployment | deployment.planned, started, health.updated, completed, failed, rollback.started, rollback.completed | Release and production lifecycle. |
| Automation | automation.triggered, deduplicated, rateLimited, work.created, result.routed, disabled | Scheduled/event-driven work. |

## B.3 Audit design rules

- Store observable user inputs, plans, selected context references, tool calls, policy decisions, outputs, edits, evidence, approvals, and outcomes. Do not store hidden model chain-of-thought.
- Use correlation and causation IDs so a checkpoint can be traced to missions, work orders, sessions, tool calls, command/browser/test runs, decisions, and artifacts.
- Store large or sensitive payloads as separately permissioned artifacts; events carry hashes/references and redaction summaries.
- Assign data classification and retention at event/artifact creation, with organization policy able to shorten, extend, seal, export, or delete where legally permitted.
- Use monotonic project sequence numbers or equivalent ordering. Network delivery can be duplicated or out of order; consumers must be idempotent.
- Sign or hash-chain security-, approval-, checkpoint-, and deployment-critical events when tamper evidence is required.
- Separate product telemetry from project audit. Project content and tool payloads are not product analytics by default.

## B.4 Example event

```
{
  "schemaVersion": "1.0",
  "id": "evt_01J2...",
  "sequence": 1842,
  "timestamp": "2026-07-15T16:20:14.317Z",
  "projectId": "proj_checkout",
  "missionId": "mission_fix_checkout",
  "workOrderId": "wo_frontend_01",
  "candidateId": "cand_01",
  "sessionId": "session_01",
  "correlationId": "corr_checkout_fix",
  "causationId": "evt_tool_requested",
  "actor": { "kind": "coworker", "id": "maya", "sessionId": "session_01" },
  "type": "browser.flow.completed",
  "classification": "project",
  "payload": {
    "browserRunId": "browser_run_01",
    "revision": { "repository": "web", "commit": "8cf..." },
    "environmentHash": "sha256:env...",
    "result": "pass",
    "assertions": 7,
    "consoleErrors": 0,
    "failedRequests": 0,
    "artifactRefs": ["artifact_trace", "artifact_checkout_png"],
    "evidenceRefs": ["evidence_checkout_flow"]
  },
  "redaction": { "count": 3, "classes": ["cookie", "authorization-header"] }
}
```