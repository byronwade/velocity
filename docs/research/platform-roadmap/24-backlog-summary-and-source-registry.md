# Appendix C. Feature Backlog Summary

> Part of the [Velocity Platform Research & Integration Roadmap](README.md). Research snapshot: **15 July 2026**.

The detailed catalogs contain 457 capability records. The companion CSV is the tracker-ready version and includes ID, source product, domain, capability, operation, Velocity translation, implementation path, first target phase, priority, and source references.

| Source / synthesis group | Records |
| --- | --- |
| VS Code | 84 |
| VS Code / Velocity | 158 |
| Cursor | 117 |
| Figma translated to Velocity | 72 |
| Velocity target | 26 |

| First target phase | Records |
| --- | --- |
| P0 — Convergence and architectural foundation | 1 |
| P1 — Native workbench product shell | 23 |
| P2 — Complete native development loop | 64 |
| P3 — Real browser and evidence substrate | 63 |
| P4 — Provider-neutral autonomous vertical slice | 95 |
| P5 — Parallel work, checkpoints, and collaboration | 97 |
| P6 — Agent-first design system and semantic canvas | 71 |
| P7 — Cloud, remote, enterprise, automation, and distribution | 38 |
| P8 — Ecosystem scale and optimization | 5 |

## C.1 Priority definitions

| Priority | Meaning |
| --- | --- |
| P0 — Critical | Required for correctness, trust, source authority, isolation, evidence, or a roadmap exit gate. Omitting it invalidates the product claim. |
| P1 — High | Strongly required for a complete, competitive, or scalable workflow; may follow the initial vertical slice within the same phase. |
| P2 — Medium | Important depth, ergonomics, platform coverage, or enterprise capability after critical foundations. |
| P3 — Later | Advanced or optional depth that should not distort earlier architecture. |

## C.2 CSV use

Convert each capability record into one or more implementation issues only after selecting the exact reuse/extend/build strategy and upstream version. Keep the record ID stable so design documents, code, tests, and release notes can cite the same capability. An implementation issue should add owner, repository/path, dependencies, estimates, acceptance tests, security/privacy review, documentation, migration, and current status; those execution fields are intentionally not fabricated in this research paper.

# Appendix D. Primary Source Registry

Source codes are cited throughout the paper and in the feature backlog. Repository sources describe current Velocity implementation; official Microsoft, Cursor, and Figma sources describe documented product capabilities at the research snapshot. URLs may evolve after 15 July 2026.

## Velocity repository

- **[VEL-01] Velocity README** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/README.md](https://github.com/byronwade/velocity/blob/main/README.md)  
  Current product shell, implemented prototype features, architecture.
- **[VEL-02] Velocity Product Vision** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/VELOCITY_PRODUCT_VISION.md](https://github.com/byronwade/velocity/blob/main/VELOCITY_PRODUCT_VISION.md)  
  Authoritative product contract and target vocabulary.
- **[VEL-03] Velocity repository guidance** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/CLAUDE.md](https://github.com/byronwade/velocity/blob/main/CLAUDE.md)  
  Repository architecture, services, keybindings, preview, conventions.
- **[VEL-04] Velocity shell service** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/services/shell.ts](https://github.com/byronwade/velocity/blob/main/src/services/shell.ts)  
  Current virtual shell implementation and commands.
- **[VEL-05] Velocity terminal mode** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/modes/TerminalMode.tsx](https://github.com/byronwade/velocity/blob/main/src/modes/TerminalMode.tsx)  
  Current terminal UI and history/completion behavior.
- **[VEL-06] Velocity browser mode** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/modes/BrowserMode.tsx](https://github.com/byronwade/velocity/blob/main/src/modes/BrowserMode.tsx)  
  Current iframe browser, preview, and simplified DevTools.
- **[VEL-07] Velocity browser service** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/services/browser.ts](https://github.com/byronwade/velocity/blob/main/src/services/browser.ts)  
  Per-pane history, bookmarks, URL normalization.
- **[VEL-08] Velocity agent service** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/services/agent.ts](https://github.com/byronwade/velocity/blob/main/src/services/agent.ts)  
  Provider seam and current rule-based agent tools.
- **[VEL-09] Velocity collaboration seam** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/services/collab.ts](https://github.com/byronwade/velocity/blob/main/src/services/collab.ts)  
  Future CRDT hook and current same-window shared documents.
- **[VEL-10] Velocity design service** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/services/design.ts](https://github.com/byronwade/velocity/blob/main/src/services/design.ts)  
  Source-derived CSS token inventory.
- **[VEL-11] Velocity design studio** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/modes/DesignStudio.tsx](https://github.com/byronwade/velocity/blob/main/src/modes/DesignStudio.tsx)  
  Live artboards, semantic frames, token editing, pan and zoom.
- **[VEL-12] Velocity coworker runtime** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/src/velocity/runtime.ts](https://github.com/byronwade/velocity/blob/main/src/velocity/runtime.ts)  
  Current deterministic mission, coworker, checkpoint, decision, comment, and collaborator state.
- **[VEL-13] Velocity workstream/tool merge design** — Byron Wade / GitHub. [https://github.com/byronwade/velocity/blob/main/docs/superpowers/specs/2026-07-14-workstream-merge-design.md](https://github.com/byronwade/velocity/blob/main/docs/superpowers/specs/2026-07-14-workstream-merge-design.md)  
  Approved tool surfacing and workstream design.

## Velocity-IDE repository

- **[VOSS-01] Velocity-IDE package manifest** — Byron Wade / GitHub. [https://github.com/byronwade/Velocity-IDE/blob/main/package.json](https://github.com/byronwade/Velocity-IDE/blob/main/package.json)  
  Code-OSS version and native dependencies: PTY, xterm, Playwright, CDP, tunnels, agent SDKs.
- **[VOSS-02] Velocity-IDE product configuration** — Byron Wade / GitHub. [https://github.com/byronwade/Velocity-IDE/blob/main/product.json](https://github.com/byronwade/Velocity-IDE/blob/main/product.json)  
  Current Code-OSS branding and product services.
- **[VOSS-03] Velocity-IDE terminal instance** — Byron Wade / GitHub. [https://github.com/byronwade/Velocity-IDE/blob/main/src/vs/workbench/contrib/terminal/browser/terminalInstance.ts](https://github.com/byronwade/Velocity-IDE/blob/main/src/vs/workbench/contrib/terminal/browser/terminalInstance.ts)  
  Native terminal architecture, xterm, process manager, shell integration, accessibility.
- **[VOSS-04] Velocity-IDE MIT license** — Byron Wade / GitHub. [https://github.com/byronwade/Velocity-IDE/blob/main/LICENSE.txt](https://github.com/byronwade/Velocity-IDE/blob/main/LICENSE.txt)  
  Code-OSS source licensing.

## VS Code / Microsoft

- **[VS-UI] VS Code user interface** — Microsoft. [https://code.visualstudio.com/docs/getstarted/userinterface](https://code.visualstudio.com/docs/getstarted/userinterface)  
  Workbench areas, editors, side bars, panels, status bar, layouts.
- **[VS-EDITOR] VS Code editor documentation** — Microsoft. [https://code.visualstudio.com/docs/editor/codebasics](https://code.visualstudio.com/docs/editor/codebasics)  
  Core editing, navigation, multi-cursor, search, minimap, breadcrumbs.
- **[VS-SETTINGS] VS Code settings** — Microsoft. [https://code.visualstudio.com/docs/configure/settings](https://code.visualstudio.com/docs/configure/settings)  
  Settings scopes, JSON, profiles, sync, language overrides.
- **[VS-KEYS] VS Code keybindings** — Microsoft. [https://code.visualstudio.com/docs/configure/keybindings](https://code.visualstudio.com/docs/configure/keybindings)  
  Command/keybinding resolution, chords, when clauses, customization.
- **[VS-SCM] VS Code source control** — Microsoft. [https://code.visualstudio.com/docs/sourcecontrol/overview](https://code.visualstudio.com/docs/sourcecontrol/overview)  
  SCM model, staging, commits, branches, repositories, merge editor.
- **[VS-WORKTREES] VS Code branches and worktrees** — Microsoft. [https://code.visualstudio.com/docs/sourcecontrol/branches-worktrees](https://code.visualstudio.com/docs/sourcecontrol/branches-worktrees)  
  Branch and worktree management.
- **[VS-TERM-B] VS Code terminal basics** — Microsoft. [https://code.visualstudio.com/docs/terminal/basics](https://code.visualstudio.com/docs/terminal/basics)  
  Profiles, terminal tabs/groups, links, selection, search, tasks.
- **[VS-TERM-P] VS Code terminal profiles** — Microsoft. [https://code.visualstudio.com/docs/terminal/profiles](https://code.visualstudio.com/docs/terminal/profiles)  
  Shell profile discovery, configuration, icons, arguments.
- **[VS-TERM-S] VS Code terminal shell integration** — Microsoft. [https://code.visualstudio.com/docs/terminal/shell-integration](https://code.visualstudio.com/docs/terminal/shell-integration)  
  Command detection, decorations, navigation, working-directory and environment integration.
- **[VS-TERM-A] VS Code terminal advanced** — Microsoft. [https://code.visualstudio.com/docs/terminal/advanced](https://code.visualstudio.com/docs/terminal/advanced)  
  Persistence, reconnect, attach, key handling, signals, Unicode, images, environment.
- **[VS-TASKS] VS Code tasks** — Microsoft. [https://code.visualstudio.com/docs/debugtest/tasks](https://code.visualstudio.com/docs/debugtest/tasks)  
  Task detection, tasks.json, problem matchers, compounds, dependencies.
- **[VS-DEBUG] VS Code debugging** — Microsoft. [https://code.visualstudio.com/docs/debugtest/debugging](https://code.visualstudio.com/docs/debugtest/debugging)  
  Debug adapter model, launch configurations, breakpoints, variables, call stack, console.
- **[VS-TEST] VS Code testing** — Microsoft. [https://code.visualstudio.com/docs/debugtest/testing](https://code.visualstudio.com/docs/debugtest/testing)  
  Test explorer, discovery, run/debug, coverage, profiles, results.
- **[VS-BROWSER] VS Code integrated browser** — Microsoft. [https://code.visualstudio.com/docs/debugtest/integrated-browser](https://code.visualstudio.com/docs/debugtest/integrated-browser)  
  Integrated Chromium browser, DevTools, debug, storage, permissions, agent browser tools.
- **[VS-AGENTS] VS Code agents overview** — Microsoft. [https://code.visualstudio.com/docs/agents/overview](https://code.visualstudio.com/docs/agents/overview)  
  Agent types, planning, tools, customization, approvals, security.
- **[VS-AGENTSW] VS Code Agents window** — Microsoft. [https://code.visualstudio.com/docs/agents/agents-window](https://code.visualstudio.com/docs/agents/agents-window)  
  Parallel and cross-workspace agent sessions, review, remote execution.
- **[VS-REMOTE] VS Code remote development** — Microsoft. [https://code.visualstudio.com/docs/remote/remote-overview](https://code.visualstudio.com/docs/remote/remote-overview)  
  SSH, WSL, containers, tunnels, Codespaces, remote extension hosts.
- **[VS-EXT] VS Code extension API** — Microsoft. [https://code.visualstudio.com/api](https://code.visualstudio.com/api)  
  Contribution points, commands, editors, views, language features, webviews, testing.
- **[VS-NB] VS Code notebooks** — Microsoft. [https://code.visualstudio.com/docs/datascience/jupyter-notebooks](https://code.visualstudio.com/docs/datascience/jupyter-notebooks)  
  Notebook UI, kernels, cells, outputs, diffing, variables.
- **[VS-TRUST] VS Code workspace trust** — Microsoft. [https://code.visualstudio.com/docs/editing/workspaces/workspace-trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust)  
  Restricted mode, workspace trust, extension and task safety.

## Cursor

- **[CUR-INDEX] Cursor documentation index** — Cursor. [https://cursor.com/llms.txt](https://cursor.com/llms.txt)  
  Official inventory of Cursor documentation and product surfaces.
- **[CUR-AGENT] Cursor Agent overview** — Cursor. [https://cursor.com/docs/agent/overview](https://cursor.com/docs/agent/overview)  
  Agent tools, context, queued messages, checkpoints, shell and browser.
- **[CUR-AWIN] Cursor Agents Window** — Cursor. [https://cursor.com/docs/agent/agents-window](https://cursor.com/docs/agent/agents-window)  
  Parallel agents, worktrees, cloud/SSH, diffs, commits and PRs.
- **[CUR-PLAN] Cursor Plan mode** — Cursor. [https://cursor.com/docs/agent/plan-mode](https://cursor.com/docs/agent/plan-mode)  
  Read-only planning and executable plans.
- **[CUR-TERM] Cursor terminal tool** — Cursor. [https://cursor.com/docs/agent/tools/terminal](https://cursor.com/docs/agent/tools/terminal)  
  Terminal execution modes, sandbox, agent environment.
- **[CUR-BROW] Cursor browser tool** — Cursor. [https://cursor.com/docs/agent/tools/browser](https://cursor.com/docs/agent/tools/browser)  
  Browser automation, console/network, visual editing, session isolation.
- **[CUR-CANVAS] Cursor Canvas** — Cursor. [https://cursor.com/docs/agent/tools/canvas](https://cursor.com/docs/agent/tools/canvas)  
  Persistent interactive artifacts and agent-driven refinement.
- **[CUR-RULES] Cursor Rules** — Cursor. [https://cursor.com/docs/rules](https://cursor.com/docs/rules)  
  Project, user, and scoped instructions.
- **[CUR-SKILLS] Cursor Skills** — Cursor. [https://cursor.com/docs/skills](https://cursor.com/docs/skills)  
  Reusable capability packages and procedural knowledge.
- **[CUR-SUB] Cursor Subagents** — Cursor. [https://cursor.com/docs/subagents](https://cursor.com/docs/subagents)  
  Delegated bounded agents and parallel work.
- **[CUR-MCP] Cursor MCP** — Cursor. [https://cursor.com/docs/mcp](https://cursor.com/docs/mcp)  
  External tools and context servers.
- **[CUR-PLUG] Cursor Plugins** — Cursor. [https://cursor.com/docs/plugins](https://cursor.com/docs/plugins)  
  Packaged extensions integrating tools, rules, and workflows.
- **[CUR-CLOUD] Cursor Cloud Agents capabilities** — Cursor. [https://cursor.com/docs/cloud-agent/capabilities](https://cursor.com/docs/cloud-agent/capabilities)  
  Cloud VM, browser, desktop, artifacts, remote access.
- **[CUR-AUTO] Cursor Automations** — Cursor. [https://cursor.com/docs/cloud-agent/automations](https://cursor.com/docs/cloud-agent/automations)  
  Scheduled and event-triggered agents.
- **[CUR-BUGBOT] Cursor Bugbot** — Cursor. [https://cursor.com/docs/bugbot](https://cursor.com/docs/bugbot)  
  Pull-request review and defect discovery.
- **[CUR-APPROVAL] Cursor Approval Agents** — Cursor. [https://cursor.com/docs/approval-agents](https://cursor.com/docs/approval-agents)  
  Policy-backed review and approval automation.
- **[CUR-CLI] Cursor headless CLI** — Cursor. [https://cursor.com/docs/cli/headless](https://cursor.com/docs/cli/headless)  
  Non-interactive agent execution and CI integration.
- **[CUR-WT] Cursor worktrees** — Cursor. [https://cursor.com/docs/agent/worktrees](https://cursor.com/docs/agent/worktrees)  
  Isolated parallel Git worktrees.

## Figma

- **[FIG-DESIGN] Figma Design documentation** — Figma. [https://help.figma.com/hc/en-us/categories/360002042553-Figma-Design](https://help.figma.com/hc/en-us/categories/360002042553-Figma-Design)  
  Design, prototyping, design systems, collaboration.
- **[FIG-COMMENTS] Figma comments** — Figma. [https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files)  
  Pinned comments, replies, mentions, reactions, resolution.
- **[FIG-SPOT] Figma spotlight** — Figma. [https://help.figma.com/hc/en-us/articles/360040322673-Present-to-collaborators-using-spotlight](https://help.figma.com/hc/en-us/articles/360040322673-Present-to-collaborators-using-spotlight)  
  Follow-presenter collaboration and shared viewport.
- **[FIG-CURSOR] Figma cursor chat** — Figma. [https://help.figma.com/hc/en-us/articles/4403084434967-Use-cursor-chat-in-Figma-Design](https://help.figma.com/hc/en-us/articles/4403084434967-Use-cursor-chat-in-Figma-Design)  
  Ephemeral cursor-anchored live communication.
- **[FIG-BRANCH] Figma branching** — Figma. [https://help.figma.com/hc/en-us/articles/360063144053-Guide-to-branching](https://help.figma.com/hc/en-us/articles/360063144053-Guide-to-branching)  
  Branches, reviews, updates from main, merge, conflicts, archive.
- **[FIG-REVIEW] Figma branch review** — Figma. [https://help.figma.com/hc/en-us/articles/1500004739101-Review-and-merge-branches](https://help.figma.com/hc/en-us/articles/1500004739101-Review-and-merge-branches)  
  Review, compare, approve, request changes and merge.
- **[FIG-LIB] Figma libraries** — Figma. [https://help.figma.com/hc/en-us/articles/360041051154-Guide-to-libraries-in-Figma](https://help.figma.com/hc/en-us/articles/360041051154-Guide-to-libraries-in-Figma)  
  Shared components, styles, variables, publication and updates.
- **[FIG-VARS] Figma variables** — Figma. [https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)  
  Variables, collections, modes, aliases, code syntax.
- **[FIG-UPD] Figma library updates** — Figma. [https://help.figma.com/hc/en-us/articles/360039234953-Review-and-accept-library-updates](https://help.figma.com/hc/en-us/articles/360039234953-Review-and-accept-library-updates)  
  Review and selective acceptance of library changes.
- **[FIG-DEV] Figma Dev Mode** — Figma. [https://www.figma.com/dev-mode/](https://www.figma.com/dev-mode/)  
  Developer inspection, ready-for-dev, change comparison, code-to-canvas, MCP and Code Connect.
- **[FIG-HANDOFF] Figma developer handoff** — Figma. [https://help.figma.com/hc/en-us/articles/15023124644247-Developer-handoff](https://help.figma.com/hc/en-us/articles/15023124644247-Developer-handoff)  
  Handoff permissions, inspect mode, resources and status.
- **[FIG-CHECK] Figma Check designs** — Figma. [https://help.figma.com/hc/en-us/articles/31304412302231-Check-designs-in-Dev-Mode](https://help.figma.com/hc/en-us/articles/31304412302231-Check-designs-in-Dev-Mode)  
  Design linting and multi-fix suggestions.
- **[FIG-API] Figma REST API** — Figma. [https://developers.figma.com/docs/rest-api/](https://developers.figma.com/docs/rest-api/)  
  Files, nodes, comments, versions, projects, components, variables, webhooks and analytics.
- **[FIG-PLUGIN] Figma Plugin API** — Figma. [https://developers.figma.com/docs/plugins/](https://developers.figma.com/docs/plugins/)  
  Plugin runtime, document graph access and UI extensions.