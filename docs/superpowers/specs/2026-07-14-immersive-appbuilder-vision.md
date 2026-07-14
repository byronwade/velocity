# Velocity — Immersive App-Builder Vision (research + direction)

**Date:** 2026-07-14
**Status:** DRAFT — synthesizing 3 parallel research streams; awaiting AI-app-builders + agentic-IDEs reports.
**Goal:** Make creating & deploying apps feel **immersive, simple, addictive — the feeling of getting stuff
done** — not "run a frontier model." Redesign as needed. North stars: immersion, momentum, honest reward.

## Research stream 3 — Immersion psychology + deploy UX (complete)

**Meta-principle:** *fast feedback → visible progress → confident accept → magical ship → do it again* —
driven by mastery, not manipulation.

1. **Sub-100ms everything, target 50ms.** Perceived-instant response is the substrate of flow (Superhuman
   <50ms; Amazon 100ms≈1% sales). → Instrument interaction latency as a first-class budget; every editor/
   palette/preview action optimistic and <50ms.
2. **Optimistic UI + local-first.** Mutate locally, sync async, roll back only on rare failure (Linear ~ms
   vs ~300ms CRUD). → Agent edits/accepts/writes render instantly on the in-memory FS; await-before-paint = bug.
3. **Paint a correct shell before load.** Restore theme/layout/last-workstream from localStorage; no blank flash.
4. **Animation discipline = fast + premium.** Only `transform`/`opacity`; 100–150ms; asymmetric enter/exit;
   never animate layout. → A motion-token set; lint against layout-animating transitions.
5. **Keyboard-first is a philosophy.** Single-letter actions; ⌘K over a *local* index; shortcuts shown on hover.
   → Every workstream action a command with a single-key binding (Accept A, Reject R, Run, Ship D, next-item).
6. **The palette teaches the tool.** Show the hotkey next to each command → users graduate palette → muscle memory.
7. **Juice the moments that matter.** Spring/scale-bump/subtle tick — but ONLY on meaningful acts (accept, ship);
   everything else crisp and quiet so the highlights land.
8. **One clear goal in working memory.** The workstream *is* the goal — always show a single concrete "current
   step" ("Review 3 changed files with evidence"), never vague status.
9. **Open loop + visible momentum** (Zeigarnik + goal-gradient + endowed progress). → idea→build→review→accept→
   deploy as a segmented rail, never at 0% once started; each accept advances it, accelerating toward ship.
10. **Evidence-based feedback closes the trust loop.** → Every agent change paired with instant glanceable
    evidence (diff + passing check + live-preview delta) so acceptance feels *earned* — our differentiated flow engine.
11. **Make generation legible — "watch it build."** Stream reasoning/build; live preview updates as files land.
12. **The shareable live URL is the emotional payoff.** → On ship, produce a shareable artifact/URL ("it's live,
    send this link") — the climax that closes idea→live, even client-side (exportable/hosted preview).
13. **Reversibility removes fear → more shipping.** One-click undo/rollback of any accept or deploy, always visible.
14. **One honest celebration, reserved for the ship.** Confetti only at a real milestone aligned to the user's
    goal; celebrate mastery, never manufacture loss/streaks/FOMO. Users leave satisfied, return by choice.

Sources: Superhuman (speed), Linear (performance.dev + UX psychology), Juice-it-or-Lose-it, Laws of UX
(Zeigarnik/goal-gradient), Figma multiplayer/craft, Vercel Previews + Instant Rollback, Netlify, confetti-done-right,
dark-patterns ethics.

## Research stream 1 — AI app builders (complete)

Framing: "vibe coding" (Karpathy, Feb 2025) already renamed **"agentic engineering"** — as execution stops
being the bottleneck, value shifts to **judgment, taste, direction, oversight**; the human is editor/reviewer.
Every tool's recurring failure is the same: **correctness at depth** (multi-page consistency, complex logic,
security). A workspace-first tool whose accept-gate *proves behavior* attacks exactly what they all get wrong.

Per-tool: **v0** (3 variations, ~8–15s first paint, Design Mode, ~45s prompt→URL) · **bolt.new** (WebContainers
= real Node in the browser — validates our client-side bet; editor+terminal+preview together, one-click deploy)
· **Lovable** (plan→full-stack; **visual edits don't cost credits**, agent runs do; Supabase built in) · **Replit
Agent** (editable **Plan mode** task list before building; **auto-checkpoints + rollback**; tests its own work in
live preview) · **Figma Make** (**point-and-prompt**: click an element, describe the change; restore any iteration)
· **Firebase Studio** (reviewable **blueprint** before code; on-preview **Annotate/Select**; **"Fix Error" button**;
Switch-to-Code toggle; Publish wizard + rollback).

12 patterns → Velocity implications:
1. **Sub-15s streamed first paint** → start a running preview the moment a conversation starts; stream changes in.
2. **Preview is primary; code is a toggle** → default the accept-loop to the preview pane, editor is peek-behind.
3. **Point-and-prompt** (the most-praised mechanic) → click any node in the live preview to scope the next agent turn.
4. **Editable plan/blueprint before build** → surface an amendable plan the user accepts before the agent builds.
5. **Checkpoints + one-click rollback timeline** → every accepted turn = a named checkpoint; one click restores all.
6. **Self-healing errors with a literal "Fix" button** → pipe iframe/build/console errors to the agent, one-click fix as evidence.
7. **Generate 2–3 variants, compare, pick** → for open UI asks, render variants into the design canvas.
8. **Batteries-included backend** → lean into in-memory FS/services as an "instant backend"; frame no-backend as *instant & private*.
9. **Decouple cheap direct manipulation from metered agent runs** → drag/resize/color/text handled in-client; agent only for structure/logic.
10. **One-click ship to a shareable URL = the payoff** → define "ship" as an instant self-contained artifact/preview link.
11. **One immersive workspace, no tool-switching** (already our thesis) → agent/editor/terminal/browser/design as views over one workspace.
12. **Close the loop with EVIDENCE, not output** → after each build, agent drives the preview, captures screenshots/traces/checks as the accept gate. *This is the differentiator — every competitor is weakest here.*

Sources: Karpathy/Gothelf on agentic engineering; v0/bolt/Lovable/Replit/Figma Make/Firebase Studio primary docs + reviews.

## Research stream 2 — Agentic IDEs (complete)

Per-tool: **Cursor** (parallel agents + **multi-agent judging**; plans as editable disk files; ⚠️ **auto-apply-to-disk
backlash** — users revolted when per-hunk Accept/Reject was replaced by bulk after-the-fact review) · **Claude Code**
(granular `TaskCreate/Update` todo checklist, one active step, streamed) · **Windsurf/Cascade** (ambient **flow
awareness** — infers intent from your edits/terminal/clipboard, no re-prompting) · **Devin 2.0** (Shell/Browser/
Editor/Planner tabs; **"Following" toggle** to watch or walk away; **Interactive Planning**; **timeline scrubber**;
⚠️ read-only editor = can't "pass the keyboard") · **Copilot Workspace** (Task→**Spec→Plan→Implement→Diff→Validate→PR**,
every artifact editable; terminal validation before PR) · **Zed** (editable multibuffer diff, **per-hunk keep/reject**;
`tab` chains edits; run Claude Code via Agent Client Protocol) · **Warp** (uniform per-command approval + audit;
keyboard-first review; batched inline comments sent back in one click) · **Replit Agent 3** (**whole-context
checkpoints** = files + packages + conversation + agent's *understanding* + DB; one-click non-destructive rollback;
agent drives a **browser preview with its own visible cursor** to self-test).

12 patterns → Velocity implications:
1. **Plan-before-build as an editable first-class artifact** → the conversation→build handoff is an editable plan/criteria the user green-lights.
2. **Per-unit review with keep/reject, never bulk auto-apply** (the trust fulcrum; Cursor's backlash proves it) → accept/send-back is per-change, reviewed before it lands.
3. **Never silently apply to disk; one-click safety net** → every build step = a checkpoint with instant non-destructive rollback.
4. **Evidence, not just diffs — "does it actually work"** → review attaches proof (agent drives the preview, shows pass/fail) to each criterion.
5. **Stream progress structured (ID-keyed checklist, one active step)**, not a firehose.
6. **A "Following" mode**: watchable but non-blocking; pings only at decisions/ambiguity.
7. **Time-travel over the whole workspace incl. agent memory** → checkpoints snapshot FS + conversation; rollback resets what the agent knows.
8. **Keyboard-first, command-driven everything** (we have the VS Code keybinding engine) → describe/plan/accept/send-back/rollback/follow as commands.
9. **Parallel agents + judged selection** for hard/ambiguous work → spawn parallel builds, present a judged comparison to pick.
10. **"Pass the keyboard"** — human can edit directly mid-task (our editor/terminal/preview are live views over one FS).
11. **Ambient context beats re-prompting** → agent reads open files, terminal output, selection, current preview as implicit context.
12. **Bake the "why" into output; one-click round-trips** → send-back bundles comments + failed criteria into one structured message that re-drives the agent.

**Field tension:** autonomy vs. control is actively contested. For a review-centric product the evidence favors
**high autonomy in *execution* + granular, evidence-backed, one-click-reversible *review*** — autonomy people
trust because stepping back in is always cheap.

---

## PROPOSED DIRECTION FOR VELOCITY

### North Star
Velocity is where you **describe an outcome and watch it become a real, verified, shippable app** — immersive
because it's instant, addictive because every step *proves it works*, and satisfying because shipping is one
rewarding, reversible click. Our wedge vs. v0/Lovable/Bolt/Cursor: **proof, not vibes.** The whole field nails
first-paint demoware and is weakest at *correctness at depth* — the exact thing our "review with evidence → accept"
loop is built to own. The frontier already renamed the goal from "vibe coding" to **agentic engineering** (judgment
+ verification is the value); we are pointed at that, early.

### The signature loop (the addictive core)
**Describe → Plan (editable) → Watch it build (preview-first, streamed) → Evidence (the agent drives the app and
shows it works) → Accept per-change (one keystroke) → the momentum rail advances → Ship (shareable link + one honest
celebration) → again.** Reversible at every step; the agent reads the live workspace as context; you can grab the
keyboard anytime.

### Six pillars (each grounded in the research above)
1. **Speed dissolves the tool.** Sub-50ms, optimistic, local-first — which we already are (in-memory FS). Make it a budget; paint the correct shell from `localStorage` before hydrate; motion tokens (transform/opacity, 100–150ms).
2. **Preview-first + point-and-prompt.** The running app is the home surface; the editor is a peek-behind. Click any node in the preview to scope the next agent turn. Cheap direct manipulation (drag/color/text) stays in-client; the agent is for structure/logic.
3. **Plan → build → evidence.** An editable plan gates the build; the build streams into a live preview ("watch it build"); then the agent *exercises the app* (its cursor clicking through) and attaches screenshots/interaction traces/passing checks to each definition-of-done criterion.
4. **Granular, reversible accept.** Per-change keep/reject (never bulk auto-apply). Every accepted turn is a whole-workspace checkpoint (FS + conversation + agent memory) with one-click, non-destructive rollback and a timeline scrubber.
5. **Keyboard-first + palette-as-tutor.** Every workstream action a single-key command (Accept A · Send-back R · Run · Ship D · Follow · next-item) shown beside the command in ⌘K, so users level up from palette → muscle memory.
6. **The ship climax, honest.** "Ship" produces a shareable self-contained artifact/preview URL (client-side export, or real deploy if a backend is ever added). One reserved celebration on a real ship — no fake streaks/FOMO. A segmented idea→build→review→accept→ship momentum rail that's never at 0% once a workstream starts.

### Phased plan (all buildable on the current client-side architecture)
- **Phase 1 — Feel & momentum (no new infra).** Segmented progress rail; single concrete "current step"; juice on Accept/Ship (spring + tick); motion tokens + <50ms interaction audit; keyboard commands (Accept/Send-back/Run/Ship/Follow) surfaced with hotkeys in ⌘K; localStorage shell-restore.
- **Phase 2 — The evidence loop (our differentiator).** Agent drives the sandboxed preview, captures screenshots/interaction traces per criterion; one-click "Fix error" from iframe/console/build errors, shown as evidence; Review becomes real proof, not fixtures.
- **Phase 3 — Preview-first + point-and-prompt.** Preview becomes the default Work surface; click-element-to-scope-next-turn; 2–3 variants into the design canvas for open UI asks.
- **Phase 4 — Checkpoints & time-travel.** Per-turn whole-workspace snapshots (FS + conversation) with one-click rollback + timeline scrubber; "Following" watch/walk-away mode.
- **Phase 5 — Ship.** "Ship" = export/host the built SPA → shareable link; the reserved celebration; optional real deploy (Vercel/Netlify) if a backend/hosting path is added.

### Packages decision (shadcn / AI SDK / AI Elements)
Adopt their **design + component anatomy in-system** now (done: Geist tokens, shadcn button system; next: AI-Elements
PromptInput/Message). The **AI SDK's value is server streaming** — incompatible with our client-only model (we already
stream from Ollama). Only revisit the literal packages if we add a backend/hosting (which Phase 5's real-deploy option
would introduce). Recommendation: stay in-system; don't bolt on Tailwind+Radix+a backend just to match a look we already have.

### Recommended start
**Phases 1 + 2** — the "feel" (momentum, juice, keyboard, speed) plus the **evidence loop** (our actual moat). Both
are fully client-side, highest-impact, and make the product *feel* immersive and *be* differentiated at once.

