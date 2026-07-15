# 33. Quality Gates and Acceptance Tests

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

## 33.1 Definition of done

A feature is not complete because its UI renders or a happy-path demo works. Completion requires real native behavior, durable state, authorization, cancellation, failure handling, restart/reconnect, accessibility, performance, telemetry/audit classification, documentation, migration, and automated tests at the appropriate layer. The following gates are release constraints for the platform milestones.

| Gate | Required behaviors | Target |
| --- | --- | --- |
| Repository/product base | Build, package, launch, update, rollback, and rebase upstream on macOS/Windows/Linux; product services/branding/licenses correct; no Microsoft-only assumption silently required. | P0–P1 |
| Native editor/workbench | Real projects, text models, Explorer/Search/Problems/Output/commands/keybindings/settings/layout/restoration/accessibility operate without prototype duplicates. | P1 |
| Terminal | Real shells, profiles, PTY/xterm, splits/tabs/editors, shell integration, tasks, process signals, persistence, links/ports, remote, accessibility, work-order isolation, cleanup. | P2 |
| SCM/worktrees | Multi-repo status, diffs, staging/commit, branches/worktrees, rebase/merge/conflict, history, review state, rollback, host adapter behavior. | P2–P5 |
| Tasks/debug/tests | Detection/configuration, compounds, problem matchers, background readiness, DAP launch/attach, breakpoints/evaluation policy, test discovery/run/debug/coverage, ports. | P2–P3 |
| Browser | Real external/local browsing, DevTools, debug, storage/permissions/history, remote proxy, downloads/uploads/dialogs, source mapping, CDP/Playwright, profiles, tab sharing, cleanup. | P3–P5 |
| Evidence | Revision/environment binding, content hashes, redaction, retention, freshness/invalidation, raw artifacts, summary accuracy, Stable/Candidate equivalence, export. | P3–P5 |
| Agent runtime | Provider interchange, plans, bounded context/tools, policies, approvals, worktree/runtime isolation, steering, cancellation, recovery, budgets, evidence, checkpoint proposal. | P4 |
| Checkpoints/review | Readiness, immutable revision, multi-domain comparison, comments, review stamps, invalidation, approvals, merge transaction, Stable pointer, rollback. | P5 |
| Parallel agents | Concurrent sessions, conflicts, reservations, stale bases, quotas, integration candidate, combined verification, crashed runners, leaked resources, reviewer independence. | P5–P6 |
| Collaboration | Identity/RBAC, invitations, presence, follow, comments/mentions/notifications, CRDT where enabled, offline/reconnect, privacy, audit, revoked access. | P5–P6 |
| Agent-first design | Element-to-source mapping, component/token scopes, source edits, route/viewport/mode matrices, visual/a11y/design lint, alternatives, review, no browser-only accepted mutation. | P6 |
| Remote/cloud | SSH/WSL/container/tunnel/cloud parity, provisioning, caching, browser, artifacts, handoff, quotas, teardown, credentials, network policy, recovery. | P6–P7 |
| Enterprise/ecosystem | Central policy, audit/SIEM, retention/residency, extension/plugin/MCP/skill governance, signing, marketplace/mirror, CLI/API/automation parity. | P7–P8 |

## 33.2 Vertical-slice end-to-end scenario

| Step | Acceptance behavior |
| --- | --- |
| Open project | Open a representative full-stack repository with existing `.vscode` tasks/launch configs/tests, a design system, and Git history. Confirm workspace trust and project import. |
| Create mission | Define a user-visible bug or feature, semantic scope, acceptance criteria, target environment, autonomy profile, budget, and required evidence. |
| Staff coworker | Select or auto-route a named coworker. Inspect the effective rules, skills, provider/model policy, tools, permissions, and planned evidence. |
| Plan | Agent reads only scoped context, uses search/language graph, identifies files/tests/routes, records assumptions and risks, and presents an editable plan. |
| Provision candidate | Create isolated worktree, terminal namespace, browser profile, services/ports, credentials, and evidence scope. Verify no Stable or peer-session contamination. |
| Reproduce | Run repository task/server, open candidate browser, exercise the failing flow, capture console/network/screenshot/trace/debug/test evidence. |
| Change | Apply source-level edits through native text/workspace tools; preserve human working tree; run formatter/code actions under repository policy. |
| Verify | Run impacted tests, required broader tests, diagnostics/build, browser flow, visual and accessibility matrix; handle one induced failure and retry within bounds. |
| Checkpoint | Create immutable manifest with source diff, evidence, risks, resource/cost summary, rollback, and any waivers/decisions. |
| Review | Use synchronized Stable/Candidate browser, source multi-diff, evidence deep links, comments, reviewed ranges, and request-changes flow. |
| Revise | Send a source-linked directive; agent resumes from candidate/checkpoint; new changes invalidate only affected review/evidence; rerun required gates. |
| Accept | Rebase/update, resolve an induced conflict, run combined verification, record typed approval, merge atomically, and advance Stable. |
| Deploy | Create a preview or production release under policy, capture deployment health evidence, then exercise an approved rollback or source revert. |
| Restart/recover | Restart the application during execution/review and confirm durable recovery, no duplicate tool execution, resource reconciliation, and accurate state. |

## 33.3 Cross-platform terminal matrix

| Environment | Required shell/process cases | Velocity-specific cases |
| --- | --- | --- |
| macOS | zsh/bash, login/non-login profiles, Unicode, signals, PATH/env, persistent sessions, terminal editor. | Worktree cwd, command evidence, browser localhost routing, secret redaction, cleanup. |
| Windows | PowerShell, Command Prompt, Git Bash where available, ConPTY behavior, paths/drive letters, signals, elevation boundary. | Worktree paths, shell quoting, port ownership, policy prompts, WSL handoff. |
| Linux | bash/zsh/fish, process groups, signals, Unicode, remote/local profiles, containers. | Sandbox modes, package tasks, service readiness, process tree cleanup. |
| WSL | Linux shell through remote authority, Windows/WSL path links, ports, extension placement. | Candidate isolation per distro, browser proxy, source/evidence URIs. |
| SSH/Container | Reconnect, revive, remote cwd/env, server lifecycle, tunneling, file links. | Remote worktrees, credential leases, artifact upload, runner failure recovery. |

## 33.4 Browser matrix

- HTTP/HTTPS/file and localhost navigation; multiple tabs/groups/windows; favorites/history; clear storage; global/workspace/ephemeral policies.
- Authentication, cookies, localStorage, IndexedDB, cache, service workers, redirects, popups/new tabs, downloads, uploads, dialogs, beforeunload, permissions.
- Chrome DevTools and `editor-browser` debug launch/attach; source maps; console/network; errors; breakpoints; page reload/restart.
- Playwright accessible locators and complex scripts; screenshots/area/full-page; traces; viewport/device/locale/timezone/theme/reduced-motion/geolocation.
- Remote authority proxying and correct `localhost` identity for Stable, each Candidate, SSH/container/cloud, and agent-initiated tabs.
- Explicit human-tab sharing, visible grant, revocation, matching-domain request, autopilot decline, personal-cookie isolation, enterprise domain filters.
- Visual determinism: fonts/assets/readiness, animation suppression, clock/randomness fixtures where configured, stable capture metadata, perceptual thresholds.
- Source mapping and semantic pin reanchoring across rebuild, route navigation, responsive layout, and component refactors.

## 33.5 Security and failure injection

| Test | Expected outcome |
| --- | --- |
| Prompt injection | Place malicious instructions in repository docs, terminal output, browser page, issue text, MCP result, generated artifact, and test failure. Verify policy/tool boundaries remain authoritative. |
| Secret handling | Seed test secrets in env, terminal, logs, browser storage, source, and MCP. Verify no prompt/artifact/audit leak; validate redaction and scoped lease revocation. |
| Network egress | Attempt allowed, denied, wildcard, redirected, DNS/IP, package-registry, browser, terminal, MCP, and cloud-runner destinations. |
| Destructive commands | Attempt delete outside worktree, privilege elevation, force push, remote change, production data write, encoded command, recursive operation, and unsafe paste. |
| Cross-session access | Try to read another worktree, terminal buffer, browser tab/profile, artifact, port, credential, comment, or project via guessed IDs and stale leases. |
| Crash/replay | Crash provider, renderer, extension host, terminal host, browser, remote runner, database, and network mid-tool. Confirm idempotent recovery and no duplicate side effects. |
| Stale evidence | Change source, base, environment, policy, dependency, browser auth, or test profile after a pass; verify correct evidence/review invalidation. |
| Supply chain | Install unsigned/changed extension, plugin, skill, MCP server, cloud image, and dependency; verify provenance, policy, quarantine, and emergency disablement. |
| Collaboration revocation | Remove a collaborator while online/offline, during follow, comment editing, CRDT editing, approval, and browser share; verify immediate authority loss. |
| Rollback failure | Induce partial merge, deployment, migration, and cleanup failures; verify compensation, alerts, preserved Stable, and explicit operator decision. |

## 33.6 Accessibility gate

Every user-visible workflow must be fully operable by keyboard and expose an accessible textual representation. This includes project/mission creation, coworker state, artifact pins, Follow Mode, Stable/Candidate comparison, source review, evidence, decisions, approvals, terminal/browser sharing, and rollback. High-contrast themes, 200%+ zoom, reduced motion, screen-reader optimized terminal/diff/browser context, focus order, announcements, and non-color state indicators are release requirements. Spatial presence and visual diffs require equivalent lists, descriptions, and navigation commands.

## 33.7 Performance budgets

| Area | Budget principle |
| --- | --- |
| Workbench startup | Velocity contributions activate lazily; project metadata/indexes load incrementally; no full repository model or provider startup blocks first useful paint. |
| Editor interaction | Typing, cursor, scrolling, diff, and command palette remain within upstream performance expectations regardless of agent/collaboration activity. |
| Indexing | File/symbol/graph/token indexes are incremental, cancellable, observable, and bounded by excludes, size, and remote constraints. |
| Terminal/browser | Hidden sessions do not consume unbounded renderer/CPU/memory; scrollback/traces/logs spill to bounded artifacts; session cleanup is verified. |
| Agents | Context/tool/result sizes, concurrency, retries, model calls, and event rendering are budgeted; UI consumes summaries and pagination, not entire traces. |
| Collaboration | Presence updates are rate-limited/ephemeral; CRDT and durable event synchronization handle large projects and reconnect without blocking editing. |
| Evidence | Content-addressed deduplication, retention, thumbnails/summaries, lazy raw-artifact loading, and background comparison prevent review stalls. |

# 34. Product and Engineering Metrics

## 34.1 Measurement principles

Metrics should answer whether Velocity helps users reach verified outcomes with less coordination and lower risk. They must not reward raw agent activity, token consumption, number of files changed, or reduced human review in isolation. Every metric needs a precise denominator, segmentation by mission/risk/project type, confidence interval where appropriate, and protection against pressure to weaken gates.

| Metric | Definition | Interpretation / guardrail |
| --- | --- | --- |
| Verified mission completion rate | Missions reaching accepted checkpoint with all required evidence, divided by missions entering execution. | Primary outcome; segment by mission type/risk and exclude cancelled-by-user from naive failure interpretation. |
| First-pass checkpoint readiness | Review-ready checkpoints that pass all required gates without revision, divided by submitted checkpoints. | Measures planning/execution quality; avoid gaming by delaying submission indefinitely. |
| Review efficiency | Human review time and number of navigation/actions per accepted change, segmented by change size/risk. | Target lower effort while preserving defect detection and satisfaction. |
| Evidence sufficiency defects | Accepted checkpoints later found to have missing, stale, misleading, or non-reproducible evidence. | Critical trust metric; each incident drives gate/invalidation improvements. |
| Rollback success rate | Rollbacks completing within policy without additional unplanned damage, divided by rollback attempts. | Must include source, deployment, and data categories separately. |
| Agent containment incidents | Unauthorized path/domain/environment/credential/cross-session attempts or successful escapes. | Target zero successful escapes; near misses inform policy/tool design. |
| Conflict rate | Parallel work orders producing textual, semantic, runtime, data, or design-system conflicts. | Use to improve reservations/scheduling, not to discourage useful parallelism. |
| Combined verification regression | Individual work orders pass but integrated candidate fails. | Measures coordination and integration quality. |
| Human intervention profile | Interventions by type: product decision, permission, missing context, correction, tool failure, provider failure, conflict, takeover. | Aim to eliminate avoidable friction, not legitimate authority. |
| Time to first artifact change | From work-order start to first observable source/runtime/evidence change. | Better than time to first prose response; segment by task. |
| Time to verified checkpoint | From work-order start to immutable review-ready checkpoint. | Primary cycle-time metric with quality guardrails. |
| Terminal/tool reliability | Successful launches, cancellations, reconnects, cleanup, task/debug/test/browser tool completion, and structured result capture. | Platform health prerequisite. |
| Browser verification reliability | Deterministic replay rate, locator stability, screenshot variance, console/network capture completeness, auth/profile isolation. | Measures real UI evidence quality. |
| Source-mapping coverage | Rendered elements/components/routes with valid source/component/token/test mappings. | Core design-platform leading indicator. |
| Design-system drift | Raw values, detached/copied components, invalid tokens, outdated library versions, inaccessible contrast, and inconsistent patterns. | Report change over time; do not auto-fix without scope/evidence. |
| Extension compatibility | Certified/tested extension pass rate by Velocity/upstream version and environment. | Protects ecosystem value and fork discipline. |
| Upstream divergence | Patch count/size, merge conflicts, time to absorb security/stable releases, upstreamable changes. | Guardrail against an unmaintainable fork. |
| Resource efficiency | Tokens, model cost, CPU, memory, storage, browser minutes, cloud runner time per verified mission. | Optimize subject to quality, privacy, and latency. |
| User trust/satisfaction | Confidence in evidence, understanding of current state, perceived control, usefulness of decisions, willingness to accept checkpoints. | Use qualitative research and task-specific surveys, not one generic NPS. |
| Accessibility success | Keyboard/screen-reader task completion and accessibility defect escape rate across core workflows. | Release-blocking for core flows. |

## 34.2 Operational dashboards

- Project health: Stable revision, open missions, candidate health, blockers, stale evidence, conflicts, deployments, automation failures, and rollback readiness.
- Platform health: provider/model availability, tool error rates, terminal/browser/session leaks, queue/resource saturation, runner provisioning, artifact storage, synchronization, and extension-host stability.
- Trust/security: policy denials, approval volume by risk, secret redactions, network denials, prompt-injection detections, unsigned component attempts, stale leases, and audit export failures.
- Quality: build/test/browser/design/security gate results, accepted defect escapes, review invalidation, flake rates, visual determinism, and evidence reproduction.
- Fork/ecosystem: upstream lag, patch conflicts, extension compatibility, marketplace signing, deprecations, migration completion, and customer channel adoption.

# 35. Risks and Mitigations

| Risk | Failure mode | Mitigation | Severity |
| --- | --- | --- | --- |
| Maintaining two production shells | Work continues in both repositories and features diverge. | Approve convergence ADR, freeze production duplication, establish port/retire map and shared domain packages. | High |
| Unmaintainable Code-OSS fork | Deep invasive changes make upstream updates slow and insecure. | Modular contributions, patch budget, upstream tests, ownership, frequent rebases, upstream generic changes. | High |
| Extension marketplace/service licensing | Assuming Microsoft Marketplace or proprietary services can be redistributed. | Legal/product audit; use permitted gallery/mirror; explicit compatibility tiers; replace service endpoints. | High |
| Agent safety theater | UI prompts imply safety while tools retain broad host access. | Enforce policy outside model, real isolation, least privilege, egress controls, secret broker, failure injection. | Critical |
| Browser credential leakage | Agent accesses personal or cross-project session state. | Per-agent partitions, explicit shared-tab leases, visibility/revoke, enterprise policy, redaction. | Critical |
| Evidence theater | Agent summaries or stale artifacts are accepted as proof. | Native evidence ingestion, immutable revision/environment binding, freshness/invalidation, raw artifact links. | Critical |
| Parallel-agent conflicts | Worktrees prevent overwrites but not semantic incompatibility. | Plans/reservations, graph overlap, integration candidate, combined verification, merge queue. | High |
| CRDT misuse | Universal live shared editing creates hard-to-review agent mutations and Git conflicts. | CRDT only for explicit human co-editing; agent work through worktrees/commits/checkpoints. | High |
| Design/source divergence | Canvas/browser edits become a second product truth. | Temporary preview only; source resolution and durable source patch required before checkpoint. | Critical |
| Framework source mapping fragility | Rendered elements cannot reliably map to source across frameworks/builds. | Adapter architecture, runtime IDs/source maps, diagnostics, fallback scope, supported-framework tiers. | High |
| Model/provider lock-in | Domain state encodes vendor sessions/tools/prompts. | Provider-neutral work orders/tools/events/evidence; adapter conformance; export/import; fallback policy. | High |
| Cost/resource runaway | Parallel agents, browsers, cloud VMs, and retries consume unbounded resources. | Budgets, quotas, scheduler, idle timeout, retry caps, usage evidence, hard stops. | High |
| Prototype expectations exceed infrastructure | Polished deterministic scenarios are mistaken for production readiness. | Clear preview labels, acceptance gates, fixture isolation, release documentation, no simulated claims. | High |
| Poor default UX from VS Code complexity | Porting all IDE depth creates a noisy, intimidating product. | Calm profiles, contextual tools, command-first reachability, attention policy, user testing, accessibility. | Medium |
| Hidden data retention | Prompts, logs, screenshots, traces, caches, and cloud artifacts outlive expectations. | Classification, local-first defaults, retention UI/policy, encryption, export/delete, provider contracts. | Critical |
| Plugin/MCP/skill supply chain | Third-party capabilities gain files/network/secrets/terminal access. | Signing, manifests, capability grants, sandboxing, curated registry, updates/revocation, audit. | Critical |
| Remote/cloud inconsistency | Local and cloud sessions behave differently or cannot reproduce results. | Shared execution protocol, environment manifests, artifacts, conformance suites, explicit capability negotiation. | High |
| Data/deployment irreversibility | Agents modify production data or services without safe rollback. | Protected actions, operator role, preview/runbooks, backups, compensation, health gates, Decision Sheets. | Critical |
| Collaboration authorization bugs | Presence/comments/CRDT/review leak across projects or revoked users. | Scoped IDs, RBAC/ABAC, server authorization, lease expiry, revocation tests, encrypted transport/storage. | Critical |
| Performance degradation | Indexing, presence, evidence, agent events, and browser sessions degrade editing. | Lazy activation, incremental indexes, pagination, process isolation, budgets, performance CI, upstream benchmarks. | High |
| Accessibility regression | Spatial/visual workflow excludes keyboard or screen-reader users. | Non-spatial equivalents, native services, accessibility ownership, automated/manual gates. | High |
| Over-automation reduces understanding | Users accept large changes without grasping impact. | Semantic scope preview, change index, evidence, required review, risk-based approvals, takeover. | High |
| Metrics drive unsafe behavior | Teams optimize acceptance speed or intervention reduction by weakening gates. | Balanced metrics, guardrails, qualitative review, no individual surveillance, policy-owned definitions. | Medium |