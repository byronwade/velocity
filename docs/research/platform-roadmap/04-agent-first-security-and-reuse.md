# 7. Agent-First Design Model

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

> **The canvas is a control, inspection, and evidence surface. It is not a second editable product document.**

## 7.1 Interaction model

A user may select a rendered element, component frame, route, device artboard, token, design-system package, or whole-product scope. The selection resolves to semantic identities: accessibility locator, DOM node, source component, style/token references, route, owning files, tests, stories, and dependent instances. The user then states intent—such as reduce visual density, apply the new brand palette, make this responsive pattern universal, or remove an inconsistent component—and provides constraints. Velocity previews impact and delegates source-level work to an agent.

## 7.2 Scope ladder

| Scope | User meaning | Required source/evidence behavior |
| --- | --- | --- |
| Rendered instance | Change or investigate this occurrence. | Resolve to source; decide whether local prop/content or shared component change is appropriate. |
| Component variant | Change one supported state across all instances. | Modify typed props/variant recipes/stories/tests and verify all consumers. |
| Component family | Transform a reusable UI concept. | Update component APIs, tokens, docs, migrations, and route matrices. |
| Route or flow | Change a page or user journey. | Modify connected components/data/actions and verify behavior across flow states. |
| Design token/semantic variable | Change a system value. | Show aliases and every affected component/mode/platform; verify contrast and regressions. |
| Product/system | Apply a broad design or interaction policy. | Plan staged work, parallelize by safe scopes, integrate, and verify a representative plus risk-based full matrix. |

## 7.3 Source resolution pipeline

- Capture the rendered element's DOM, accessibility node, computed style, box model, screenshot crop, route, viewport, browser/session identity, and candidate revision.
- Use source maps, framework instrumentation, component explorer metadata, runtime IDs, and static graph analysis to identify source components and styles.
- Trace style provenance through CSS rules, utility classes, design tokens, theme modes, component props, and package/library boundaries.
- Build an impact set containing instances, routes, stories, tests, packages, documentation, accessibility requirements, and downstream consumers.
- Present the proposed semantic scope and expected affected surfaces before broad changes begin.
- Execute in source, rebuild, re-resolve the mapping, and prove that the requested intent is represented by durable source changes.

## 7.4 Design iteration loop

| Step | Output |
| --- | --- |
| Observe | Stable/Candidate visual, DOM, accessibility, token, runtime, console, network, and interaction state. |
| Select | A revision-bound semantic scope, not only screen coordinates. |
| Direct | Intent, constraints, examples, modes/viewports, quality bar, and protected invariants. |
| Plan | Affected source, component/token strategy, alternatives, risk, migrations, tests, and evidence matrix. |
| Change | Transactional source edits in an isolated worktree; no accepted browser-only state. |
| Verify | Clean build, route/flow matrix, visual diff, accessibility, console/network, tests, and design lint. |
| Review | Stable/Candidate synchronized comparison, source multi-diff, evidence, risk, and rollback. |
| Accept or revise | Merge and advance Stable, or send source-linked directives back to the work order. |

## 7.5 Manual controls that remain appropriate

Velocity may retain direct controls for navigation, viewport/device selection, zoom/pan, selection, annotations, comparison opacity, mode/theme switching, temporary prop exploration, and high-level intent parameters. It may also permit expert source or token editing in takeover mode. It should not encourage direct arbitrary manipulation of every underlying layer when the durable change must be coordinated through code, tests, and design-system rules.

# 8. Security, Trust, Permissions, and Governance

## 8.1 Threat model

| Threat | Example | Required mitigation |
| --- | --- | --- |
| Prompt injection from project content | README, issue, web page, terminal output, generated file, or MCP response tells the agent to ignore policy or exfiltrate secrets. | Provenance/taint labels, instruction hierarchy, tool authorization outside the model, default-deny protected actions. |
| Over-broad terminal execution | Agent runs destructive, privileged, encoded, or production commands in the wrong directory/environment. | Real sandbox/worktree, command risk classifier, cwd/path policy, approvals, process ownership, audit, rollback plan. |
| Browser credential leakage | Agent inherits personal cookies or shares an authenticated tab beyond intended scope. | Per-agent ephemeral partitions, explicit tab-sharing leases, visible indicator, revocation, storage encryption, no prompt cookie exposure. |
| Network exfiltration | Tools send source, secrets, or customer data to unapproved domains. | Unified egress policy across browser/terminal/MCP/tools, DNS/IP/port controls, audit, payload limits, enterprise defaults. |
| Supply-chain compromise | Extension, plugin, skill, MCP server, package script, or cloud image is malicious. | Signing, provenance, curated registries, workspace trust, capability manifests, sandboxing, version pins, scanning. |
| Cross-agent contamination | One agent reads another worktree, terminal, browser, credentials, ports, or evidence. | ExecutionContext propagation, isolated roots/partitions, authorization on every lookup, cleanup tests. |
| Stale or fabricated evidence | Agent reports tests passed against an old revision or summarizes without actual execution. | Evidence bound to commit/environment/tool versions; freshness rules; direct ingestion from native services; reproducible artifacts. |
| Unsafe merge/deploy | A candidate is accepted despite conflicts, changed base, failed gates, or missing approvals. | Checkpoint readiness engine, review invalidation, protected merge/deploy transaction, rollback verification. |
| Collaboration authorization failure | Viewer or invited user gains edit, secret, terminal, or production rights. | RBAC/ABAC, project/environment scopes, least privilege, expiring invitations, audit, organization policy. |
| Data retention/privacy failure | Logs, prompts, screenshots, traces, or model context retain sensitive data too long. | Classification, minimization, redaction, local-first defaults, retention policy, export/delete controls, provider governance. |

## 8.2 Permission evaluation order

```
DENY if workspace is untrusted for the requested execution capability
DENY if organization policy prohibits provider, model, tool, domain, path, environment, or action
DENY if project policy or protected-resource policy prohibits the action
DENY if the work order's scope or autonomy envelope does not include the capability
REQUEST DECISION if the action is protected, ambiguous, irreversible, credentialed, or over budget
GRANT a time/scoped CapabilityLease for the exact tool/action/resource
EXECUTE through the native service or approved external tool
RECORD observable inputs, action, result, revisions, evidence, and policy decision
REVOKE on completion, cancellation, timeout, scope change, or user request
```

## 8.3 Autonomy profiles

| Profile | Allowed by default | Requires decision / prohibited |
| --- | --- | --- |
| Inspect | Read source, search, symbols, diagnostics, readonly docs/evidence. | No writes, process execution, browser interaction, secrets, network beyond approved docs. |
| Draft | Write only in isolated worktree; run safe local tasks/tests; use ephemeral browser. | Credentialed pages, external writes, production, destructive commands, merge/deploy. |
| Standard autonomous | Draft capabilities plus bounded network/package operations and approved project services. | Protected files, secrets outside assigned scopes, production, irreversible data operations, Stable advancement. |
| Elevated project | Explicitly approved broader tools/environments for a mission with stronger audit and rollback. | Organization-denied actions, unapproved production, policy bypass, unrestricted personal credentials. |
| Operator | Human-owned production/deployment/data actions with agent assistance and mandatory previews. | Automatic action beyond the granted runbook/decision scope. |

## 8.4 Secret and identity architecture

Secrets should remain in OS-backed or enterprise secret stores and be issued to execution contexts as expiring, least-privilege leases. The model receives a reference or tool capability, not the secret value. Terminal environments, browser storage, remote runners, and MCP servers receive only the scopes required for the current work order. All persisted output passes through secret redaction; raw local logs, if retained, are sealed and access-controlled. Git commits, settings, rule files, prompts, screenshots, and evidence metadata must never contain raw credentials.

## 8.5 Enterprise governance

- Provider/model allowlists, data residency, retention/training restrictions, permitted regions, fallback policy, and maximum context class.
- Extension/plugin/MCP/skill registries, signature and publisher requirements, capability restrictions, version pins, and emergency disablement.
- Agent terminal/browser/network policies, allowed domains, package registries, remote authorities, production environments, and credential scopes.
- Required review roles and evidence gates by risk, repository, path, service, data classification, or deployment target.
- Audit export, SIEM integration, retention, legal hold, privacy deletion, incident investigation, and redaction policy.
- Update channels, version support, upstream security patch deadlines, extension compatibility, and controlled feature previews.

# 9. Reuse, Extend, Build, Retire

| Decision | Capabilities | Rationale |
| --- | --- | --- |
| Reuse largely unchanged | Text models/editor groups; files/search; settings/keybindings; language services; Explorer; SCM/Git; diff/merge; native terminal/xterm/PTY; tasks/debug/tests; Problems/Output; notebooks; extension host; remote authorities; accessibility. | These are mature infrastructure systems with years of platform-specific behavior and ecosystem compatibility. |
| Extend natively | Workbench layouts/Lenses; browser metadata and evidence; terminal ownership/run records; SCM review state; timeline; decorations; Quick Access; status/attention; native integrated browser tools; source maps/semantic graph. | Velocity needs project/work-order identity, policy, evidence, and calmer presentation without duplicating primitives. |
| Build as Velocity services | Project/Mission/Coworker/WorkOrder; scheduler; ToolBroker; ContextBroker; policy/capability leases; budgets; model routing; candidate environments; evidence/checkpoints/decisions; collaboration/presence/follow; semantic design; automation; audit. | These are the differentiated product and trust model. |
| Integrate via adapters | Model providers; Git hosts; cloud runners; CI; deployment platforms; issue trackers; Figma import/API; databases; observability; MCP servers; identity/secret systems. | Keep core semantics provider-neutral and replaceable. |
| Retire from production | CodeMirror production editor; virtual shell; iframe external browser; synthetic DevTools/network; deterministic agent/coworker runtime; fake deploy/criteria/cost; localStorage-only bookmarks/persistence as authoritative state. | They cannot meet native parity, security, reliability, remote, evidence, or collaboration requirements. |
| Retain as specification/tests | Prototype scenarios, visual product shell, deterministic coworker state, virtual filesystem/shell, generator fixtures, design token demo. | They are useful for UX reference, storybook-like scenarios, unit tests, demos, and regression fixtures. |


---