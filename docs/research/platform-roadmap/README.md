# Velocity Platform Research & Integration Roadmap

**Code-OSS / VS Code, Cursor, and Figma-derived collaboration**

Repository audit • feature architecture • security model • phased implementation plan

Research snapshot: **15 July 2026**  
457 capability records • 69 primary sources


---

# Document Control

| Field | Value |
| --- | --- |
| Purpose | Define a production architecture and implementation roadmap for bringing VS Code-class IDE depth, Cursor-class agent execution, and Figma-class collaboration into Velocity. |
| Repositories reviewed | `byronwade/velocity` (autonomous workspace prototype) and `byronwade/Velocity-IDE` (Code-OSS fork). |
| Research cut-off | Official documentation and repository state reviewed through 15 July 2026. |
| Meaning of “all features” | First-party/core capability families, platform primitives, and user-facing workflows. It does not enumerate every command, setting, language extension, marketplace extension, experimental flag, or vendor-only service endpoint. |
| Recommended production base | The `Velocity-IDE` Code-OSS fork, with Velocity product primitives ported into native workbench services and contributions. |
| Recommended source of truth | Files, Git revisions/worktrees, environment manifests, typed evidence, and signed checkpoint metadata—not browser DOM mutations, chat transcripts, or local component state. |
| Primary design rule | Humans direct, constrain, compare, and approve semantic outcomes; agents make source-level changes across the system. |

## Repository integration

This directory is the durable, source-controlled version of the research package. It separates the exhaustive capability catalog from the curated root [Roadmap](../../../ROADMAP.md):

- `ROADMAP.md` tracks public product epics and shipped/planned status.
- [`feature-backlog.csv`](feature-backlog.csv) is the complete 457-record capability inventory used for planning, estimation, and issue generation.
- The documents below preserve the reasoning, target architecture, acceptance gates, and source registry behind those epics.
- [`../../architecture/0001-platform-convergence.md`](../../architecture/0001-platform-convergence.md) records the accepted production-platform decision.

## Document set

1. **This file** — executive decision, scope, methodology, and the recommended vertical slice.
2. [Repository, product, and architecture](01-repository-product-and-architecture.md) — repository audit, product constraints, platform architecture, state boundaries, agent-first design, security, and reuse/retire decisions.
3. [VS Code workbench, editor, files, and Git](02-vscode-workbench-editor-files-and-git.md) — workbench composition, editor groups, language intelligence, files, settings, commands, source control, branches, and worktrees.
4. [VS Code terminal, debug, test, and observability](03-vscode-terminal-debug-test-and-observability.md) — native terminal, shell integration, tasks, debugging, testing, ports, and operational surfaces.
5. [VS Code extensions, remote, browser, and enterprise](04-vscode-extensions-remote-browser-and-enterprise.md) — extensibility, remote development, notebooks, accessibility, governance, and the integrated browser/agent platform.
6. [Cursor agent platform](05-cursor-agent-platform.md) — AI editing, context, tools, browser/design workflows, parallel agents, cloud execution, automation, review, customization, governance, plugins, and CLI.
7. [Figma collaboration and design](06-figma-collaboration-and-design.md) — multiplayer presence, comments, branching, review, history, design systems, variables, inspection, and Dev Mode translated into an agent-first model.
8. [Velocity primitives, services, and evidence](07-velocity-primitives-services-and-evidence.md) — target product primitives, service boundaries, data model, checkpoint/evidence protocol, and conflict model.
9. [Delivery roadmap, quality, and metrics](08-delivery-roadmap-quality-and-metrics.md) — phases P0–P8, work packages, acceptance tests, performance and accessibility gates, metrics, risks, non-goals, and open decisions.
10. [API, events, sources, and glossary](09-api-events-sources-and-glossary.md) — manifest/API sketches, audit-event schema, backlog summary, primary-source registry, and glossary.
11. [Feature backlog CSV](feature-backlog.csv) — 457 implementation-ready capability records with product, domain, translation, implementation path, phase, priority, and source IDs.

## Planning rule

The research inventory is intentionally broader than the root roadmap. Promote a record or group of records into `ROADMAP.md` only when it becomes a public product epic. Implementation specs should cite the relevant backlog IDs, accepted architecture decision, target phase, and measurable exit gates.



---

# 1. Executive Decision

> **Velocity should become the product and orchestration layer of the existing Code-OSS fork—not a second independent IDE implemented beside it.**

The repository review shows two complementary assets. The `velocity` repository is the clearest expression of the intended product: a project-centered autonomous workspace with named coworkers, missions, artifact-level work pins, Stable/Candidate comparison, evidence, checkpoints, decisions, Follow Mode, and a calm workstream-first interface. Its current editor, terminal, browser, collaboration, persistence, deployment, and coworker runtime are intentionally prototype-grade. The `Velocity-IDE` repository is a current Code-OSS fork with the mature workbench, native text model, extension host, source control, task/debug/test systems, xterm/node-pty terminal stack, remote-development architecture, browser automation dependencies, and agent SDK foundations needed for production. [VEL-01; VEL-02; VEL-03; VOSS-01; VOSS-03]

Rebuilding VS Code breadth in the React/Tauri prototype would create years of duplicate work and permanent incompatibility with the editor, language, terminal, debugging, testing, remote, accessibility, and extension ecosystems. The correct convergence path is to port Velocity's differentiated product primitives into the Code-OSS workbench as services, commands, editor inputs, views, context keys, policies, and review workflows. The prototype remains valuable as a product specification, interaction laboratory, deterministic demo harness, and visual reference; it should not remain the production execution substrate.

## 1.1 The ten decisions that determine the roadmap

- Use `Velocity-IDE` as the production runtime and upstream-tracking base. Treat `velocity` as the product specification and prototyping branch until its distinctive concepts have been ported.
- Keep files, Git revisions, worktrees, environment manifests, and typed checkpoint metadata authoritative. Browser DOM state, chat history, local React state, and generated prose are never the source of truth.
- Use the native Code-OSS terminal stack—real PTYs, xterm, profiles, shell integration, tasks, links, ports, process control, persistence, remote authorities, and accessibility. Retire the virtual shell from production.
- Use the native integrated Chromium browser plus CDP/Playwright and real DevTools. Retire the external-site iframe model and synthetic Elements/Network implementation from production.
- Represent a named coworker as a persistent product identity and policy. Represent actual execution as short-lived, bounded work orders and agent sessions that can change model, provider, or location.
- Isolate every write-capable concurrent work order with a Git worktree, terminal/process namespace, browser profile, credential lease, port/service registry, resource budget, and evidence scope.
- Make agent mutations transactional and reviewable. A successful tool call is not acceptance; a source-backed checkpoint with required evidence is the unit that may advance Stable.
- Use CRDT synchronization selectively for simultaneous human text collaboration and presence. Use patches, commits, worktrees, reviews, and merge transactions for autonomous agent work.
- Adopt Figma's collaboration, following, comments, branch review, design systems, variables, Dev Mode, and change-comparison ideas—but not Figma's manual layer-by-layer authoring model as Velocity's primary workflow.
- Maintain an explicit upstream strategy: isolate Velocity changes, prefer public extension/workbench APIs, contribute generic improvements upstream where possible, and continuously run Code-OSS tests and extension-compatibility suites.

## 1.2 Recommended first production vertical slice

The first integrated milestone should prove the complete loop rather than maximize feature count. A user opens a real repository, creates a mission, assigns or auto-staffs a coworker, and receives an isolated work order. The work order creates a Git worktree, launches a native terminal or repository task, edits real files through native text/workspace services, starts the candidate application, and opens a real integrated browser bound to the correct port and profile. The agent exercises an acceptance flow, captures source diffs, diagnostics, tests, console and network findings, screenshots, accessibility checks, and browser traces, then proposes a checkpoint. The user reviews Stable versus Candidate, revises or accepts, merges to Stable, optionally deploys, and can execute a verified rollback.

This vertical slice is more important than independently completing dozens of panels. It validates the architecture: source authority, isolation, native tools, orchestration, evidence, review, permissions, and reversibility. Once this loop is correct, the remaining VS Code, Cursor, and Figma-derived features become additive rather than foundational rewrites.

## 1.3 What the user experience should feel like

| User intent | Default Velocity behavior | Underlying platform behavior |
| --- | --- | --- |
| “Fix the broken checkout flow.” | The user pins or states the outcome, criteria, and target environment. Velocity selects a coworker and shows work directly on the running artifact. | A work order creates an isolated worktree, uses search/language intelligence, terminal/tasks/debug/browser/test tools, and returns a checkpoint. |
| “Apply this new visual system across the product.” | The user selects a component family, route set, or whole-product scope and provides design intent and constraints. | Agents edit tokens, components, styles, stories, tests, and documentation in source; browser matrices and design checks verify every affected surface. |
| “Show me what Maya is doing.” | Follow Mode reveals the real artifact, files, commands, browser steps, evidence, and blockers without replacing the stage with chat. | Presence and orchestration events drive native editors, terminal, browser, test, SCM, and evidence views. |
| “Approve this.” | A checkpoint review summarizes user-visible impact, code changes, risks, failed/waived gates, evidence, and rollback. | Immutable Git/evidence revisions and typed approvals determine whether Stable may advance. |
| “Take over.” | The human opens the full editor, terminal, browser, debugger, test, database, or deployment tool immediately. | Ownership and capability leases transition safely; agent processes pause or narrow without losing isolated progress. |

# 2. Scope, Methodology, and Completeness Standard

## 2.1 Research scope

This paper combines three kinds of evidence. First, it audits the two Velocity repositories to determine what is implemented, simulated, or only represented by a seam. Second, it maps first-party capability families in current VS Code/Code-OSS, with special emphasis on the terminal, integrated browser, agent platform, workbench, editor, source control, tasks, debugging, testing, remote development, extensions, and enterprise controls. Third, it studies Cursor's agent execution model and Figma's collaboration, branching, design-system, and developer-handoff patterns, then translates them into an architecture consistent with Velocity's product thesis. [VEL-01 through VEL-13; VOSS-01 through VOSS-04; VS-*; CUR-*; FIG-*]

The research snapshot is dated 15 July 2026. VS Code and Cursor are changing quickly, especially their agent and integrated-browser surfaces. The feature inventory should therefore be maintained as a versioned product artifact rather than treated as a one-time frozen list. Every implementation epic should cite the exact upstream version, source file, documentation revision, and compatibility assumptions used.

## 2.2 Definition of “all features”

A literal enumeration of every VS Code command, configuration key, context key, API proposal, platform-specific edge case, built-in language extension, marketplace extension, experiment, and internal service would be both unstable and strategically unhelpful. In this paper, completeness means every first-party/core capability family and platform primitive that materially affects an IDE, agent runtime, browser, collaboration system, or autonomous-workspace product. The 457-record catalog is intentionally broader than a marketing comparison: it includes implementation dependencies, trust boundaries, state models, review semantics, accessibility, remote execution, extensibility, policy, and acceptance gates.

## 2.3 Method

- Repository inspection: read product vision, architecture guidance, service implementations, modes, runtime state, and current merge design in `velocity`; inspect the Code-OSS fork's product configuration, package/dependency graph, license, terminal implementation, and recent agent/browser direction.
- Primary-source research: use official Microsoft, Cursor, and Figma documentation rather than secondary feature lists whenever available.
- Capability decomposition: break each product into primitives—state, UI, tools, isolation, permissions, evidence, collaboration, extensibility, and lifecycle—not merely named screens.
- Translation test: for every borrowed feature, define how it fits Velocity's source-of-truth and agent-first model. Features that would create a second design document, mutable browser-only state, or chat-only truth are redesigned rather than copied.
- Implementation classification: identify whether Velocity should reuse Code-OSS unchanged, extend it, build a new product-layer service, integrate a provider, or retire prototype code.
- Sequencing: assign a roadmap phase P0–P8 and a priority P0–P3. Phase indicates dependency order; priority indicates criticality inside or across phases.
- Acceptance orientation: define observable exit gates so features cannot be declared complete because a panel renders or a demo script succeeds.

## 2.4 Evidence confidence

| Evidence class | Use in this paper | Confidence / limitation |
| --- | --- | --- |
| Repository source | Determines current implementation and available architecture. | Highest confidence for inspected paths, but the repositories can change after the snapshot. |
| Official product documentation | Determines documented first-party behavior and capability families. | High confidence for public behavior; preview/experimental features may change, and internal architecture can differ. |
| Architectural inference | Connects product capabilities to the recommended Velocity design. | Explicitly identified as a recommendation, not a claim about existing implementation. |
| Prototype behavior | Shows interaction intent and service seams. | Useful for product direction; not evidence of production reliability, security, persistence, or scale. |
