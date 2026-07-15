# 36. Explicit Non-Goals

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

Non-goals protect the architecture from becoming a collage of copied product surfaces. They can be revisited through explicit product decisions, but they should not be smuggled into implementation as convenience.

- Rebuilding the entire VS Code editor, terminal, debugger, test runner, SCM, remote, or extension platform inside the React prototype.
- Making chat the canonical project state, review record, evidence store, or only interaction model.
- Giving agents unrestricted host shell, network, browser credentials, secrets, production, or plugin/MCP capabilities because the user selected a high autonomy label.
- Treating an agent's natural-language claim as evidence that a build, test, flow, deployment, migration, or rollback succeeded.
- Creating a separate manual design document whose state can diverge from code.
- Providing Figma-equivalent vector drawing, pen tools, arbitrary layer manipulation, advanced illustration, or pixel-perfect manual authoring as a core Velocity objective.
- Using CRDTs as the universal merge system for autonomous cross-file changes.
- Hiding Git/worktrees, native tools, or source details from users who need direct control.
- Promising compatibility with every VS Code extension without a tested compatibility tier.
- Depending permanently on Microsoft marketplace/service endpoints or branding without explicit rights and product decisions.
- Persisting hidden model chain-of-thought or claiming it is required for audit. Observable plans, tool calls, edits, evidence, and decisions are sufficient.
- Automatically merging, deploying, or changing production data merely because an agent, reviewer bot, or approval agent recommends it.
- Optimizing for the maximum number of simultaneous agents rather than verified throughput, isolation, and conflict-safe integration.
- Turning coworker markers into fake human behavior or decorative cursor animation that is not grounded in real work events.
- Replacing project-specific tasks, tests, linters, formatters, launch configs, or conventions with a generic Velocity workflow when the repository already defines the correct one.
- Shipping cloud-first architecture that makes local-only or offline work impossible.

# 37. Open Product and Architecture Decisions

| Decision | Question | Resolve by |
| --- | --- | --- |
| Distribution and marketplace | Which desktop platforms/channels ship first? Open VSX, curated registry, enterprise mirror, direct VSIX, or combination? Which extensions are certified? | P0–P2 |
| Fork strategy | How much product UI is core workbench code versus built-in extensions? Which changes are intended for upstream contribution? | P0 |
| Project manifest | What belongs in `.velocity` versus `.vscode`, repository docs, Git attributes, devcontainer, CI, or organization policy? | P0–P1 |
| Identity and sync | Is collaboration self-hosted, Velocity-hosted, peer/local-network, or provider-pluggable? What is the offline/local-only identity model? | P3–P5 |
| Stable semantics | Does Stable always mean a Git checkpoint, a deployed environment, or a project-configurable combination? How are multi-repo projects represented? | P3–P5 |
| Data sandbox | Which database/data providers are supported first, and what isolation/rollback guarantees are mandatory before agent writes? | P4–P6 |
| Provider policy | Which model providers and local models are first-class? What are default privacy/fallback rules and supported tool-call contracts? | P3–P4 |
| Browser architecture | Use upstream integrated browser unchanged, forked contribution, or a Velocity browser service behind a stable interface? Which Chromium/Electron upgrade cadence? | P1–P3 |
| Framework mapping tiers | Which frameworks receive full element-to-source/component/token mapping first? What fallback behavior is acceptable? | P4–P6 |
| Design token format | Adopt an existing token standard, Style Dictionary/W3C-compatible schema, framework-native adapters, or a Velocity canonical schema? | P4–P6 |
| CRDT scope | Which file types support simultaneous human co-editing at first release? How does it interact with saves, Git, formatters, language servers, and remote authorities? | P4–P5 |
| Approval authority | Which actions can project owners delegate to approval agents or automations, and which always require a human role? | P4–P7 |
| Audit model | What is stored locally, synchronized, encrypted, exportable, redactable, or deletable? Which events require tamper evidence? | P3–P7 |
| Cloud execution | Build Velocity-hosted runners, integrate third parties, support customer VPC/self-hosted, or all through provider interface? | P5–P7 |
| Deployment providers | Which targets and rollback semantics are first-class? How is production operator authority modeled? | P5–P7 |
| Pricing/budgets | How are model/provider/cloud costs exposed and constrained without turning coworkers into confusing billing objects? | P4–P7 |
| Web client | Is the web product review/control-only initially, or does it include full remote IDE capability? | P6–P7 |
| Open API/SDK | What is stable for plugins, skills, MCP, automations, custom tools, and external orchestration at each release? | P5–P8 |

# 38. Conclusion

Velocity already contains a differentiated product thesis: the running project is the shared artifact; named coworkers perform bounded work; users direct intent through the artifact; Stable and Candidate remain explicit; evidence and decisions replace generic progress chat; and full tools stay available on demand. The repository also already contains the production substrate in a separate Code-OSS fork. The highest-leverage decision is therefore convergence, not another feature implementation in the prototype.

VS Code contributes the mature workbench and execution systems Velocity should inherit. Cursor contributes a broad reference model for autonomous tools, planning, browser interaction, worktrees, parallel/cloud agents, rules, skills, subagents, MCP, plugins, automations, review, approvals, and CLI. Figma contributes the collaboration model: presence, follow, comments, branches, comparison, version history, libraries, variables, Dev Mode, and structured design checks. Velocity's differentiation is the synthesis: all of those capabilities organized around a source-backed, evidence-driven, agent-first project rather than a file tree, chat thread, or manually edited design document.

> **The roadmap's north star is simple: point to the outcome, constrain the work, let agents change the real system, and accept only what can be shown, reviewed, reproduced, and reversed.**


---