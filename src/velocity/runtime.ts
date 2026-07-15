// ---------------------------------------------------------------------------
// CoworkerRuntime — the replaceable seam between the visual product and future
// orchestration (see VELOCITY_PRODUCT_VISION.md §33).
//
// `PrototypeCoworkerRuntime` is a DETERMINISTIC, resettable simulation. It never
// calls a provider or the network, produces repeatable transitions, and is the
// single source of truth the React shell renders via useSyncExternalStore. A
// future `ProviderCoworkerRuntime` (or an adapter over the existing Ollama
// AgentService) can implement the same interface without any UI change.
// ---------------------------------------------------------------------------

import { buildScenario } from './scenarios';
import { notifyCheckpoint } from './notify';
import { getServices } from '../services/container';
import { DEPLOY_TARGETS, WORK_INTENTS, WORK_MODELS } from './model';
import { findLeaf, firstLeafId, firstLeafOfView, leafIds, removeLeaf, setCompareSource, setRatio, setView, splitLeaf } from './panes';
import type {
	Autonomy, CollabRole, CompareSource, Coworker, DeployTarget, Lens, MissionInput, SplitDir, ToolId, WorkIntent, WorkspaceState,
} from './model';

export interface CoworkerRuntime {
	getState(): WorkspaceState;
	subscribe(listener: () => void): () => void;
	load(scenario: string): void;
	reset(): void;

	setLens(lens: Lens): void;
	splitPane(id: string, dir: SplitDir): void;
	closePane(id: string): void;
	setPaneView(id: string, view: Lens): void;
	focusPane(id: string): void;
	setPaneRatio(splitId: string, ratio: number): void;
	setPaneCompare(id: string, source: CompareSource): void;
	comparePreview(source: CompareSource): void;
	openShip(open: boolean): void;
	openSettings(open: boolean): void;
	openTool(tool: ToolId | null): void;
	toggleDock(): void;
	toggleFocus(): void;
	follow(coworkerId: string | null): void;
	togglePause(): void;
	openMissionSheet(open: boolean): void;
	openCommand(open: boolean): void;
	openRight(surface: WorkspaceState['layout']['rightSurface'], id?: string): void;
	closeRight(): void;
	closeTopmost(): void;
	resetLayout(): void;

	createMission(input: MissionInput): void;
	addCoworker(name: string, role: string): void;
	renameCoworker(id: string, name: string): void;
	pauseCoworker(id: string): void;
	resumeCoworker(id: string): void;
	dismissCoworker(id: string): void;
	restoreCoworker(id: string): void;
	setModel(id: string, staffing: 'auto' | 'manual', model: string): void;
	setAutonomy(id: string, autonomy: Autonomy): void;
	/** Apply an edited `.velocity/coworkers/<id>.md` definition (agents-as-files). */
	updateCoworkerFromFile(id: string, patch: { name?: string; role?: string; department?: string; model?: string; autonomy?: Autonomy; scope?: string }): void;
	/** Show a transient toast (for UI helpers outside the runtime). */
	notify(text: string): void;

	acceptCheckpoint(id: string): void;
	rejectCheckpoint(id: string): void;
	reviseCheckpoint(id: string): void;
	rollback(id: string): void;
	decide(id: string, optionId: string): void;
	assignArtifact(label: string, action: string): void;
	ship(): void;
	deploy(provider: DeployTarget): void;

	// --- work / comments ---
	armWork(on: boolean): void;
	toggleCommentMode(): void;
	pickCoworker(text: string, intent: WorkIntent | null): string | null;
	addComment(lens: Lens, x: number, y: number, text: string, opts?: AddWorkOpts): void;
	openComment(id: string | null): void;
	assignComment(commentId: string, coworkerId: string): void;
	setCommentModel(id: string, model: string): void;
	setCommentAgents(id: string, agents: number): void;
	resolveComment(id: string): void;
	deleteComment(id: string): void;
	openShare(open: boolean): void;
	inviteCollaborator(email: string, role: CollabRole): void;
	removeCollaborator(id: string): void;
}

/** Options the WorkComposer/context-menu can pass; every one is optional and
 *  auto-resolved when omitted, so the common path is just text. */
export interface AddWorkOpts {
	intent?: WorkIntent | null;
	/** Explicit coworker; omit or 'auto' to let pickCoworker choose. */
	assignee?: string | null;
	model?: string;
	agents?: number;
}

const IDENTITY_COLORS = ['#6f74c9', '#4a8dd1', '#2f9e8f', '#5b7a99', '#8a6fb0', '#3f7fd0'];
let counter = 1000;
const uid = (p: string) => `${p}${++counter}`;

/** What a coworker moves to after landing a checkpoint — rotated per department
 *  so the workspace keeps evolving believably (and deterministically). */
const NEXT_TASKS: Record<string, string[]> = {
	Design: ['Polishing empty states', 'Refining the responsive grid', 'Tightening the type scale'],
	Engineering: ['Hardening error paths', 'Wiring optimistic updates', 'Refactoring the session store'],
	Verification: ['Extending the regression suite', 'Recording checkout traces', 'Auditing a11y labels'],
};

export class PrototypeCoworkerRuntime implements CoworkerRuntime {
	private state: WorkspaceState;
	private listeners = new Set<() => void>();
	private toastTimer: ReturnType<typeof setTimeout> | null = null;
	private beat: ReturnType<typeof setInterval> | null = null;
	private tickN = 0;
	/** Real source files, so heartbeat checkpoints diff files that exist. */
	private filePool: string[] = [];

	constructor(scenario = 'calm') {
		this.state = { ...buildScenario(scenario), toast: null, celebrate: false };
		// The heartbeat: coworkers make real, deterministic forward progress.
		this.beat = setInterval(() => this.tick(), 3000);
		void getServices().fs.list().then((files) => {
			this.filePool = files.filter((f) => /\.(tsx?|css|html)$/.test(f) && !f.startsWith('.velocity/'));
		}).catch(() => { /* fs unavailable — keep the fallback path */ });
	}

	/** Stop timers when the project tab closes. */
	dispose(): void {
		if (this.beat) clearInterval(this.beat);
		if (this.toastTimer) clearTimeout(this.toastTimer);
	}

	/** One heartbeat: advance working coworkers; at 100% they land a checkpoint
	 *  and pick up the next task. Deterministic — steps derive from roster index
	 *  and tick count, never from randomness. */
	private tick(): void {
		this.tickN++;
		if (this.state.paused || this.state.celebrate) return;
		let landed: Coworker | null = null;
		const coworkers = this.state.coworkers.map((c, i) => {
			if ((c.state !== 'active' && c.state !== 'verifying') || typeof c.progress !== 'number') return c;
			const step = 2 + ((i + this.tickN) % 3); // 2–4% per beat
			const next = Math.min(100, c.progress + step);
			if (next >= 100 && !landed) {
				landed = { ...c, progress: 100 };
				const tasks = NEXT_TASKS[c.department] ?? NEXT_TASKS.Engineering;
				return { ...c, progress: 6, action: tasks[this.tickN % tasks.length] };
			}
			return { ...c, progress: next };
		});
		if (landed) {
			const done = landed as Coworker;
			const checkpoint = {
				id: uid('k'), coworkerId: done.id, missionId: this.state.mission?.id ?? null,
				outcome: done.action, beforeLabel: 'Stable', afterLabel: 'Candidate',
				diff: [{ path: this.filePool[this.tickN % Math.max(1, this.filePool.length)] ?? 'src/App.tsx', added: 18 + (this.tickN % 5) * 7, removed: 4 + (this.tickN % 3) * 3 }],
				buildOk: true, tests: { passed: 12, total: 12 },
				evidence: [
					{ kind: 'screenshot' as const, label: `${done.name} · after`, detail: done.action },
					{ kind: 'test' as const, label: '12/12 checks passed', detail: 'unit + integration' },
				],
				limitations: 'Awaiting your review.', risk: 'low' as const,
				blastRadius: [done.scope.split(' ')[0] || 'app'], rollbackPoint: 'Stable @ latest',
				state: 'ready' as const, createdLabel: 'just now',
			};
			// A coworker's newest checkpoint supersedes their older unreviewed one,
			// so the review queue stays honest instead of piling up.
			const kept = this.state.checkpoints.filter((k) => !(k.coworkerId === done.id && k.state === 'ready'));
			this.set({ coworkers, checkpoints: [checkpoint, ...kept].slice(0, 8) });
			this.addEvent('checkpoint', `${done.name} landed “${done.action}” — ready to review.`, done.id);
			notifyCheckpoint(`${done.name} · checkpoint ready`, done.action);
		} else {
			this.set({ coworkers });
		}
	}

	getState(): WorkspaceState { return this.state; }
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private set(next: Partial<WorkspaceState>): void {
		this.state = { ...this.state, ...next };
		for (const l of this.listeners) l();
	}
	private patchLayout(next: Partial<WorkspaceState['layout']>): void {
		this.set({ layout: { ...this.state.layout, ...next } });
	}
	private mapCoworkers(fn: (c: Coworker) => Coworker): void {
		this.set({ coworkers: this.state.coworkers.map(fn) });
	}
	private toast(text: string): void {
		this.set({ toast: text });
		if (this.toastTimer) clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => this.set({ toast: null }), 2600);
	}
	private addEvent(kind: WorkspaceState['events'][number]['kind'], text: string, coworkerId: string | null): void {
		this.set({ events: [{ id: uid('e'), kind, text, coworkerId, tsLabel: 'now' }, ...this.state.events].slice(0, 24) });
	}

	load(scenario: string): void {
		this.state = { ...buildScenario(scenario), toast: null, celebrate: false };
		for (const l of this.listeners) l();
	}
	reset(): void { this.load(this.state.scenario); }

	/** Give this project a distinct name (used by the multi-project tab bar). */
	setProjectName(name: string): void {
		this.set({ project: { ...this.state.project, name } });
	}

	// --- layout / lens / panes ---
	setLens(lens: Lens): void {
		const l = this.state.layout;
		this.patchLayout({ panes: setView(l.panes, l.activePaneId, lens), lens });
	}
	splitPane(id: string, dir: SplitDir): void {
		const l = this.state.layout;
		const src = findLeaf(l.panes, id);
		const newId = uid('pane');
		const newView: Lens = src?.view === 'code' ? 'browser' : 'code';
		this.patchLayout({ panes: splitLeaf(l.panes, id, dir, newId, newView), activePaneId: newId, lens: newView });
	}
	closePane(id: string): void {
		const l = this.state.layout;
		if (leafIds(l.panes).length <= 1) return;
		const panes = removeLeaf(l.panes, id);
		const activePaneId = l.activePaneId === id ? firstLeafId(panes) : l.activePaneId;
		this.patchLayout({ panes, activePaneId, lens: findLeaf(panes, activePaneId)?.view ?? l.lens });
	}
	setPaneView(id: string, view: Lens): void {
		this.patchLayout({ panes: setView(this.state.layout.panes, id, view), activePaneId: id, lens: view });
	}
	focusPane(id: string): void {
		const view = findLeaf(this.state.layout.panes, id)?.view ?? this.state.layout.lens;
		this.patchLayout({ activePaneId: id, lens: view });
	}
	setPaneRatio(splitId: string, ratio: number): void {
		this.patchLayout({ panes: setRatio(this.state.layout.panes, splitId, ratio) });
	}
	setPaneCompare(id: string, source: CompareSource): void {
		this.patchLayout({ panes: setCompareSource(this.state.layout.panes, id, source), activePaneId: id });
	}
	/** Point the nearest Preview pane at a compare source (Stable / Live / …). */
	comparePreview(source: CompareSource): void {
		const l = this.state.layout;
		const target = firstLeafOfView(l.panes, 'browser');
		if (target) {
			const next = target.compareSource === source ? 'none' : source;
			this.patchLayout({ panes: setCompareSource(l.panes, target.id, next), activePaneId: target.id, lens: 'browser' });
		} else {
			// no Browser pane open — turn the active pane into a comparing Browser
			this.patchLayout({ panes: setCompareSource(setView(l.panes, l.activePaneId, 'browser'), l.activePaneId, source), lens: 'browser' });
		}
	}
	openShip(open: boolean): void { this.patchLayout({ shipOpen: open }); }
	openSettings(open: boolean): void { this.patchLayout({ settingsOpen: open }); }
	openTool(tool: ToolId | null): void { this.patchLayout({ openTool: tool }); }
	toggleDock(): void { this.patchLayout({ dockExpanded: !this.state.layout.dockExpanded }); }
	toggleFocus(): void { this.patchLayout({ focusMode: !this.state.layout.focusMode, openTool: null, rightSurface: 'none' }); }
	togglePause(): void {
		const paused = !this.state.paused;
		this.set({ paused });
		this.mapCoworkers((c) => (c.state === 'archived' || c.state === 'dismissed' || c.state === 'completed'
			? c : { ...c, state: paused ? 'paused' : 'active' }));
		this.toast(paused ? 'All coworkers paused at safe points.' : 'Resumed.');
	}
	openMissionSheet(open: boolean): void { this.patchLayout({ missionSheetOpen: open }); }
	openCommand(open: boolean): void { this.patchLayout({ commandOpen: open }); }
	openRight(surface: WorkspaceState['layout']['rightSurface'], id?: string): void {
		this.patchLayout({ rightSurface: surface, activeCheckpointId: surface === 'checkpoint' ? id ?? this.state.checkpoints[0]?.id ?? null : this.state.layout.activeCheckpointId, activeDecisionId: surface === 'decision' ? id ?? this.state.decisions[0]?.id ?? null : this.state.layout.activeDecisionId });
	}
	closeRight(): void { this.patchLayout({ rightSurface: 'none' }); }
	closeTopmost(): void {
		const l = this.state.layout;
		if (l.settingsOpen) return this.patchLayout({ settingsOpen: false });
		if (l.shipOpen) return this.patchLayout({ shipOpen: false });
		if (l.shareOpen) return this.patchLayout({ shareOpen: false });
		if (l.commandOpen) return this.patchLayout({ commandOpen: false });
		if (l.missionSheetOpen) return this.patchLayout({ missionSheetOpen: false });
		if (l.activeCommentId) return this.patchLayout({ activeCommentId: null });
		if (l.commentMode) return this.patchLayout({ commentMode: false });
		if (l.rightSurface !== 'none') return this.patchLayout({ rightSurface: 'none' });
		if (l.openTool) return this.patchLayout({ openTool: null });
		if (l.followingId) return this.follow(null);
		if (l.focusMode) return this.patchLayout({ focusMode: false });
	}
	resetLayout(): void {
		this.patchLayout({ openTool: null, dockExpanded: false, focusMode: false, followingId: null, shipOpen: false, rightSurface: 'none', missionSheetOpen: false, commandOpen: false });
		this.toast('Workspace layout reset.');
	}

	follow(coworkerId: string | null): void {
		this.patchLayout({ followingId: coworkerId });
		this.mapCoworkers((c) => ({ ...c, following: c.id === coworkerId }));
		if (coworkerId) {
			const cw = this.state.coworkers.find((c) => c.id === coworkerId);
			this.patchLayout({ lens: cw?.marker ? cw.marker.lens : this.state.layout.lens, followingId: coworkerId, rightSurface: 'follow' });
		} else if (this.state.layout.rightSurface === 'follow') {
			this.patchLayout({ rightSurface: 'none' });
		}
	}

	// --- missions ---
	createMission(input: MissionInput): void {
		const id = uid('m');
		const mission = {
			...input, id,
			criteria: input.acceptanceCriteria.map((label, i) => ({ id: `${id}c${i}`, label, state: 'pending' as const })),
			state: 'active' as const, coworkerIds: input.staffing === 'auto' ? ['maya'] : [],
		};
		const auto = input.staffing === 'auto';
		const staffed: Coworker[] = auto && this.state.coworkers.length === 0
			? [{
				id: 'maya', name: 'Maya', role: 'Design Lead', department: 'Design', initials: 'MA', color: IDENTITY_COLORS[0],
				missionId: id, action: 'Planning the mission', state: 'planning', scope: input.includedScope[0] ?? 'project',
				marker: { lens: 'browser', x: 48, y: 44, label: 'Planning' }, branch: 'cw/maya', worktree: 'proj-maya',
				candidateHealth: 'healthy', staffing: 'auto', model: 'Auto · frontier', fallbackModel: 'Local · qwen2.5-coder',
				autonomy: input.autonomy, approvalPolicy: input.approvalPolicy, budget: input.budget, permissions: ['read', 'write', 'run', 'test'],
				latestCheckpointId: null, specialists: [], following: false,
			}] : this.state.coworkers;
		this.set({ mission, missions: [mission, ...this.state.missions], coworkers: staffed, layout: { ...this.state.layout, missionSheetOpen: false } });
		this.addEvent('note', `Mission created: ${input.title}.`, null);
		this.toast('Mission created.');
	}

	// --- coworkers ---
	addCoworker(name: string, role: string): void {
		const id = uid('cw');
		const color = IDENTITY_COLORS[this.state.coworkers.length % IDENTITY_COLORS.length];
		const initials = name.slice(0, 2).toUpperCase();
		const cw: Coworker = {
			id, name, role, department: role, initials, color, missionId: this.state.mission?.id ?? null,
			action: 'Awaiting assignment', state: 'idle', scope: '', marker: null, branch: `cw/${id}`, worktree: `proj-${id}`,
			candidateHealth: 'healthy', staffing: 'auto', model: 'Auto · frontier', fallbackModel: 'Local · qwen2.5-coder',
			autonomy: 'collaborative', approvalPolicy: 'guarded', budget: { spent: 0, total: 5, unit: '$' },
			permissions: ['read', 'write', 'run', 'test'], latestCheckpointId: null, specialists: [], following: false,
		};
		this.set({ coworkers: [...this.state.coworkers, cw] });
		this.toast(`${name} · ${role} added.`);
	}
	renameCoworker(id: string, name: string): void {
		this.mapCoworkers((c) => (c.id === id ? { ...c, name, initials: name.slice(0, 2).toUpperCase() } : c));
	}
	pauseCoworker(id: string): void { this.mapCoworkers((c) => (c.id === id ? { ...c, state: 'paused' } : c)); }
	resumeCoworker(id: string): void { this.mapCoworkers((c) => (c.id === id ? { ...c, state: 'active' } : c)); }
	dismissCoworker(id: string): void {
		const cw = this.state.coworkers.find((c) => c.id === id);
		if (!cw) return;
		this.set({ coworkers: this.state.coworkers.filter((c) => c.id !== id), archived: [{ ...cw, state: 'archived', following: false }, ...this.state.archived] });
		if (this.state.layout.followingId === id) this.follow(null);
		this.toast(`${cw.name} dismissed → archive.`);
	}
	restoreCoworker(id: string): void {
		const cw = this.state.archived.find((c) => c.id === id);
		if (!cw) return;
		this.set({ archived: this.state.archived.filter((c) => c.id !== id), coworkers: [...this.state.coworkers, { ...cw, state: 'active' }] });
		this.toast(`${cw.name} restored.`);
	}
	setModel(id: string, staffing: 'auto' | 'manual', model: string): void {
		this.mapCoworkers((c) => (c.id === id ? { ...c, staffing, model } : c));
		this.toast('Model applied at the next safe checkpoint.');
	}
	setAutonomy(id: string, autonomy: Autonomy): void { this.mapCoworkers((c) => (c.id === id ? { ...c, autonomy } : c)); }
	updateCoworkerFromFile(id: string, patch: { name?: string; role?: string; department?: string; model?: string; autonomy?: Autonomy; scope?: string }): void {
		const cw = this.state.coworkers.find((c) => c.id === id);
		if (!cw) return;
		const next = { ...cw, ...patch };
		// Only apply (and announce) a real change — file syncs are idempotent.
		if (next.name === cw.name && next.role === cw.role && next.department === cw.department
			&& next.model === cw.model && next.autonomy === cw.autonomy && next.scope === cw.scope) return;
		this.mapCoworkers((c) => (c.id === id ? next : c));
		this.addEvent('note', `${next.name}'s definition updated from ${id}.md.`, id);
	}
	notify(text: string): void { this.toast(text); }

	// --- checkpoints ---
	acceptCheckpoint(id: string): void {
		this.set({ checkpoints: this.state.checkpoints.map((k) => (k.id === id ? { ...k, state: 'accepted' } : k)) });
		this.addEvent('merge', 'Checkpoint accepted → merged into Candidate.', null);
		this.patchLayout({ rightSurface: 'none' });
		this.toast('Checkpoint accepted. Stable advanced.');
	}
	rejectCheckpoint(id: string): void {
		this.set({ checkpoints: this.state.checkpoints.map((k) => (k.id === id ? { ...k, state: 'rejected' } : k)) });
		this.patchLayout({ rightSurface: 'none' });
		this.toast('Rejected. Stable preserved; Candidate discarded.');
	}
	reviseCheckpoint(id: string): void {
		this.set({ checkpoints: this.state.checkpoints.map((k) => (k.id === id ? { ...k, state: 'revising' } : k)) });
		this.mapCoworkers((c) => (c.latestCheckpointId === id ? { ...c, state: 'active', action: 'Revising after review' } : c));
		this.patchLayout({ rightSurface: 'none' });
		this.toast('Sent back to the coworker with your notes.');
	}
	rollback(id: string): void {
		const k = this.state.checkpoints.find((c) => c.id === id);
		this.toast(`Rolled back to ${k?.rollbackPoint ?? 'the previous checkpoint'}.`);
		this.addEvent('note', `Rolled back to ${k?.rollbackPoint ?? 'a checkpoint'}.`, null);
	}
	decide(id: string, optionId: string): void {
		const chosen = this.state.decisions.find((d) => d.id === id)?.options.find((o) => o.id === optionId);
		this.set({ decisions: this.state.decisions.map((d) => (d.id === id ? { ...d, state: 'accepted' } : d)) });
		this.mapCoworkers((c) => (c.state === 'approval' ? { ...c, state: 'active', action: 'Continuing after decision' } : c));
		this.patchLayout({ rightSurface: 'none' });
		this.addEvent('note', `Decision resolved${chosen ? `: ${chosen.label}` : ''}.`, null);
		this.toast('Decision recorded.');
	}
	assignArtifact(label: string, action: string): void {
		this.addEvent('reserve', `${action} assigned on “${label}”.`, this.state.coworkers[0]?.id ?? null);
		this.toast(`${action} · “${label}” assigned.`);
	}
	ship(): void { this.deploy('vercel'); }

	deploy(provider: DeployTarget): void {
		const target = DEPLOY_TARGETS.find((t) => t.id === provider) ?? DEPLOY_TARGETS[0];
		this.set({ deployment: { provider, status: 'deploying', url: target.domain, env: 'Production', startedLabel: 'now' } });
		this.addEvent('note', `Deploying to ${target.label}…`, null);
		this.toast(`Deploying to ${target.label}…`);
		setTimeout(() => {
			this.set({ celebrate: true, deployment: { provider, status: 'live', url: target.domain, env: 'Production', startedLabel: 'just now' } });
			this.addEvent('merge', `Live on ${target.label}: ${target.domain}`, null);
			this.toast(`Shipped to ${target.label} 🎉  ${target.domain} · link copied`);
			setTimeout(() => this.set({ celebrate: false }), 1600);
		}, 1100);
	}

	// --- work / comments ---
	/** Arm placement: the next click on the app drops a work pin. */
	armWork(on: boolean): void { this.patchLayout({ commentMode: on, activeCommentId: null }); }
	toggleCommentMode(): void {
		this.patchLayout({ commentMode: !this.state.layout.commentMode, activeCommentId: null });
	}

	/** Which department best fits this request — used only for auto-assignment. */
	private deptFor(text: string, intent: WorkIntent | null): string {
		if (intent) return WORK_INTENTS[intent].dept;
		const t = text.toLowerCase();
		if (/\b(test|tests|qa|coverage|spec|specs|e2e|regression)\b/.test(t)) return 'Verification';
		if (/\b(design|redesign|layout|ui|style|restyle|color|colour|spacing|responsive|mobile|hero|button|font|theme|padding)\b/.test(t)) return 'Design';
		return 'Engineering';
	}
	/** Infer the request kind from freeform text when no chip was tapped. */
	private detectIntent(text: string): WorkIntent | null {
		const t = text.toLowerCase();
		if (/\b(test|tests|qa|coverage|spec|specs|e2e)\b/.test(t)) return 'test';
		if (/\b(redesign|design|layout|restyle|ui|spacing|responsive|mobile|align)\b/.test(t)) return 'redesign';
		if (/\b(copy|wording|text|label|rename|typo|microcopy|headline)\b/.test(t)) return 'copy';
		if (/\b(add|create|new|build|implement|introduce)\b/.test(t)) return 'add';
		if (/\b(fix|bug|broken|error|crash|issue|wrong|regress)\b/.test(t)) return 'fix';
		return null;
	}
	/** Deterministically pick the best-fit, least-busy coworker (null if none). */
	pickCoworker(text: string, intent: WorkIntent | null): string | null {
		const live = this.state.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
		if (!live.length) return null;
		const dept = this.deptFor(text, intent);
		const pool = live.filter((c) => c.department === dept);
		// busy rank: free first, working next, paused/done last. Array.sort is
		// stable, so equal ranks keep the seeded roster order → deterministic.
		const rank = (c: Coworker) => (c.state === 'idle' || c.state === 'waiting' ? 0 : c.state === 'active' || c.state === 'verifying' || c.state === 'planning' ? 1 : 2);
		return [...(pool.length ? pool : live)].sort((a, b) => rank(a) - rank(b))[0].id;
	}

	addComment(lens: Lens, x: number, y: number, text: string, opts: AddWorkOpts = {}): void {
		const t = text.trim();
		if (!t) { this.patchLayout({ commentMode: false }); return; }
		const me = this.state.collaborators.find((c) => c.id === 'you') ?? this.state.collaborators[0];
		const intent = opts.intent ?? this.detectIntent(t);
		const id = uid('cm');
		const comment = {
			id, lens, x, y, authorName: me?.name ?? 'You', authorColor: me?.color ?? IDENTITY_COLORS[0],
			text: t, createdLabel: 'now', resolved: false, assignedCoworkerId: null,
			intent, model: opts.model ?? 'auto', agents: opts.agents ?? 1, replies: [],
		};
		this.set({ comments: [comment, ...this.state.comments], layout: { ...this.state.layout, commentMode: false, activeCommentId: id } });
		this.addEvent('note', `Work pinned on ${lens}.`, null);
		// Auto-assign unless the caller explicitly passed a coworker (or null).
		const assignee = opts.assignee === undefined || opts.assignee === 'auto' ? this.pickCoworker(t, intent) : opts.assignee;
		if (assignee) this.assignComment(id, assignee);
		else this.toast('Work pinned — no coworker available yet.');
	}
	openComment(id: string | null): void { this.patchLayout({ activeCommentId: id, commentMode: false }); }
	assignComment(commentId: string, coworkerId: string): void {
		const cw = this.state.coworkers.find((c) => c.id === coworkerId);
		const target = this.state.comments.find((c) => c.id === commentId);
		const action = target?.intent ? WORK_INTENTS[target.intent].action : 'Addressing a comment';
		this.set({
			comments: this.state.comments.map((c) => (c.id === commentId
				? { ...c, assignedCoworkerId: coworkerId, replies: [...c.replies, { authorName: cw?.name ?? 'Coworker', authorColor: cw?.color ?? IDENTITY_COLORS[0], text: 'On it — I’ll post a checkpoint when it’s ready.', tsLabel: 'now', fromCoworker: true }] }
				: c)),
		});
		if (cw) this.mapCoworkers((c) => (c.id === coworkerId ? { ...c, state: 'active', action } : c));
		this.addEvent('reassign', `${cw?.name ?? 'A coworker'} is on “${(target?.text ?? 'a comment').slice(0, 32)}”.`, coworkerId);
		this.toast(`Assigned to ${cw?.name ?? 'coworker'}.`);
	}
	setCommentModel(id: string, model: string): void {
		this.set({ comments: this.state.comments.map((c) => (c.id === id ? { ...c, model } : c)) });
		const label = WORK_MODELS.find((m) => m.id === model)?.label ?? model;
		this.toast(`Model · ${label}.`);
	}
	setCommentAgents(id: string, agents: number): void {
		const n = Math.max(1, Math.min(3, agents));
		this.set({ comments: this.state.comments.map((c) => (c.id === id ? { ...c, agents: n } : c)) });
		this.toast(`${n} coworker${n > 1 ? 's' : ''} on it.`);
	}
	deleteComment(id: string): void {
		this.set({ comments: this.state.comments.filter((c) => c.id !== id) });
		if (this.state.layout.activeCommentId === id) this.patchLayout({ activeCommentId: null });
		this.toast('Work item removed.');
	}
	resolveComment(id: string): void {
		this.set({ comments: this.state.comments.map((c) => (c.id === id ? { ...c, resolved: true } : c)) });
		this.patchLayout({ activeCommentId: null });
		this.toast('Comment resolved.');
	}
	openShare(open: boolean): void { this.patchLayout({ shareOpen: open }); }
	inviteCollaborator(email: string, role: CollabRole): void {
		const clean = email.trim();
		if (!clean) return;
		const handle = clean.split('@')[0].replace(/[._-]+/g, ' ').trim();
		const name = handle.replace(/\b\w/g, (m) => m.toUpperCase()) || clean;
		const initials = (name.split(' ').map((w) => w[0]).join('').slice(0, 2) || clean.slice(0, 2)).toUpperCase();
		const color = IDENTITY_COLORS[this.state.collaborators.length % IDENTITY_COLORS.length];
		const collab = { id: uid('co'), name, initials, color, email: clean, role, status: 'invited' as const, cursor: null };
		this.set({ collaborators: [...this.state.collaborators, collab] });
		this.addEvent('note', `Invited ${clean} as ${role}.`, null);
		this.toast(`Invite sent to ${clean} · ${role} (demo).`);
	}
	removeCollaborator(id: string): void {
		const c = this.state.collaborators.find((x) => x.id === id);
		if (!c || c.role === 'owner') return;
		this.set({ collaborators: this.state.collaborators.filter((x) => x.id !== id) });
		this.toast(`${c.name} removed.`);
	}
}

// The active runtime is now vended per-project by the WorkspaceManager
// (see workspace.ts). One PrototypeCoworkerRuntime instance backs each tab.
