# ADR 0001 — Converge Velocity onto the Code-OSS platform

- **Status:** Accepted for planning and incremental implementation
- **Date:** 2026-07-15
- **Decision owners:** Velocity product and engineering
- **Related research:** [`../research/platform-roadmap/README.md`](../research/platform-roadmap/README.md)
- **Public sequencing:** [`../../ROADMAP.md`](../../ROADMAP.md)

## Context

Velocity currently has two complementary repositories:

- `byronwade/velocity` is the clearest executable expression of the product: a calm, artifact-first
  autonomous workspace with named coworkers, missions, work pins, Stable/Candidate comparison,
  Follow Mode, checkpoints, evidence, decisions, semantic design direction, and deterministic demo
  scenarios.
- `byronwade/Velocity-IDE` is a current Code-OSS fork with the mature workbench, editor model,
  extension host, language services, source control, terminal, tasks, debugging, testing, notebooks,
  remote-development architecture, accessibility infrastructure, integrated browser direction, and
  agent-platform dependencies required for a production developer environment.

The React/Tauri prototype deliberately uses lighter implementations: CodeMirror, a virtual shell over
its filesystem abstraction, sandboxed iframe previews, synthetic DevTools, local component/runtime
state, deterministic coworkers, fixture evidence, and incomplete persistence/collaboration. Those
choices are appropriate for product exploration and repeatable demos. Rebuilding the complete VS Code
surface and ecosystem around them would duplicate years of engineering and create permanent
compatibility, accessibility, performance, security, extension, and upstream-maintenance debt.

## Decision

**Velocity's production platform will be the `Velocity-IDE` Code-OSS fork.** The `velocity`
repository remains the product specification, interaction laboratory, deterministic demo harness,
and source of portable product-domain concepts while the differentiated product layer is ported.

Velocity product primitives will be implemented in the production platform as native services,
commands, editor inputs, workbench parts, views, context keys, policies, storage models, events, and
review workflows rather than as an embedded second IDE or a standalone React shell beside Code-OSS.

The production source of truth is:

1. workspace files and typed project/coworker/policy manifests;
2. Git revisions, branches, worktrees, patches, merge transactions, and rollback points;
3. environment, process, browser-profile, port, credential-lease, and deployment manifests;
4. typed evidence and immutable checkpoint metadata;
5. signed approvals and audit events.

Browser DOM mutations, chat transcripts, generated prose, local React state, and unversioned canvas
state are not authoritative.

## Product primitives to port

The following concepts define Velocity's differentiated product layer and must survive the migration:

- Project, Mission, Coworker, Specialist, and durable Work Order
- Stable, Candidate, environment isolation, and compare
- artifact-level work pins and semantic scope resolution
- bounded autonomy, budgets, permissions, approvals, and stop conditions
- Follow Mode and spatial presence
- Checkpoints, Evidence, Decisions, readiness gates, and verified rollback
- scope reservations, conflict detection, coordination, and handoff
- agent-first design systems, source-mapped inspection, and multi-surface verification
- attention inbox, command-first access, calm stage hierarchy, and progressive disclosure

The model/provider is infrastructure beneath a coworker's identity. Execution may be local or cloud,
short- or long-lived, and may use different agent runtimes without changing the product object.

## Reuse / extend / build / retire boundary

### Reuse from Code-OSS

Use native workbench layout, editor groups and inputs, text models, search, source control, terminal,
tasks, debug, tests, notebooks, extension host, remote authorities, settings/profiles/keybindings,
workspace trust, accessibility, telemetry controls, storage, and integrated-browser foundations.

### Extend in `Velocity-IDE`

Add Velocity services, commands, context keys, views, custom editor inputs, policy hooks, tool broker,
work-order orchestration, Stable/Candidate coordination, evidence/checkpoint stores, review surfaces,
semantic design scope, presence/follow behavior, and agent integrations.

### Build as portable domain infrastructure

Schemas and domain logic may originate in `velocity` when they are platform-neutral: coworker and
project manifests, work-order contracts, policy/evidence/checkpoint types, audit events, source-scope
models, deterministic fixtures, acceptance criteria, and migration tests.

### Retire from the production path

The following remain useful prototype/test fixtures but are not production foundations:

- the virtual filesystem shell presented as a real terminal;
- external-site iframe browsing as the primary browser;
- synthetic DOM-derived Elements/Network panels as production DevTools;
- browser-only visual edits that do not resolve to source;
- local-only collaboration as the final multiplayer architecture;
- fixture evidence and local component state as acceptance authority;
- a permanent chat-first shell or transcript as the default product model.

## First architecture gate

The first production milestone must prove one complete vertical slice:

1. open a real repository through the production workbench;
2. create a mission with scope, criteria, policy, budget, target environment, and required evidence;
3. staff a coworker and create an isolated write-capable work order;
4. allocate a Git worktree, process namespace, ports, browser profile, credential lease, and audit
   scope;
5. inspect and edit real files through native services;
6. run native terminal commands, tasks, diagnostics, tests, and debugging;
7. start the candidate application and exercise it in the integrated browser with CDP/Playwright;
8. collect typed diffs, diagnostics, tests, screenshots, traces, console/network findings,
   accessibility results, risk, and provenance;
9. propose a checkpoint only when readiness gates pass or waivers are explicit;
10. compare Stable and Candidate, revise or accept, merge transactionally, deploy optionally, and
    execute a verified rollback.

Independent panels are not sufficient evidence that the architecture works.

## Consequences

### Positive

- Velocity inherits the full editor, language, terminal, debug, test, SCM, extension, remote,
  notebook, accessibility, browser, and enterprise ecosystems instead of recreating them.
- Product differentiation stays concentrated in orchestration, evidence, collaboration, semantic
  design, and human/agent operating models.
- Native commands and context keys provide keyboard, menu, automation, accessibility, and headless
  parity.
- Upstream improvements and extension compatibility remain feasible.
- The current prototype keeps its value as a fast product laboratory and deterministic test fixture.

### Costs and risks

- Porting the product shell and domain services into Code-OSS is substantial work.
- The fork requires disciplined upstream synchronization and compatibility gates.
- Some prototype interactions will need redesign to fit native workbench semantics.
- Cross-repository ownership, schema sharing, and migration tests must be explicit.
- Internal Code-OSS APIs must be isolated; public/stable contribution points are preferred.

## Migration rules

- New production features identify their destination repository before implementation.
- Every epic cites the corresponding records in
  [`../research/platform-roadmap/feature-backlog.csv`](../research/platform-roadmap/feature-backlog.csv).
- Cross-repository schemas are versioned and tested; copy-paste drift is not acceptable.
- Product behavior is ported incrementally behind stable service interfaces and feature flags.
- The deterministic prototype remains runnable throughout migration and is used for interaction
  regression, scenario coverage, and stakeholder review.
- Code-OSS upgrades require build, smoke, extension, terminal, browser, agent, accessibility, and
  Velocity-specific test gates.
- A prototype feature is not marked production-complete until its native implementation, security
  boundary, persistence, accessibility, evidence, failure behavior, and rollback are validated.

## Agent-first design consequence

Velocity adopts Figma-derived collaboration and design-system behavior without making manual
layer-by-layer editing the primary product workflow. Humans specify semantic scope, desired outcomes,
constraints, references, and approval. Agents edit the source tokens, components, styles, routes,
data, services, tests, stories, and documentation; every accepted visual change is source-backed and
verified across the affected matrix.

## Review triggers

Revisit this decision only if one of the following becomes true:

- the Code-OSS fork can no longer be maintained or distributed under acceptable terms;
- required product behavior is structurally impossible in the workbench despite validated extension
  and contribution approaches;
- a different mature open platform provides equivalent editor, extension, terminal, debug, test,
  remote, accessibility, browser, and upstream ecosystems at materially lower migration cost;
- the product strategy explicitly abandons the requirement for VS Code-class depth and extension
  compatibility.

Until then, rebuilding those platform capabilities in the prototype is architectural divergence, not
progress toward production.
