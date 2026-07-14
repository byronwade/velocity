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
import type {
	Autonomy, Coworker, Lens, MissionInput, ToolId, WorkspaceState,
} from './model';

export interface CoworkerRuntime {
	getState(): WorkspaceState;
	subscribe(listener: () => void): () => void;
	load(scenario: string): void;
	reset(): void;

	setLens(lens: Lens): void;
	openTool(tool: ToolId | null): void;
	toggleDock(): void;
	toggleFocus(): void;
	follow(coworkerId: string | null): void;
	toggleCompare(): void;
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

	acceptCheckpoint(id: string): void;
	rejectCheckpoint(id: string): void;
	reviseCheckpoint(id: string): void;
	rollback(id: string): void;
	decide(id: string, optionId: string): void;
	assignArtifact(label: string, action: string): void;
	ship(): void;
}

const IDENTITY_COLORS = ['#6f74c9', '#4a8dd1', '#2f9e8f', '#5b7a99', '#8a6fb0', '#3f7fd0'];
let counter = 1000;
const uid = (p: string) => `${p}${++counter}`;

export class PrototypeCoworkerRuntime implements CoworkerRuntime {
	private state: WorkspaceState;
	private listeners = new Set<() => void>();
	private toastTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(scenario = 'calm') {
		this.state = { ...buildScenario(scenario), toast: null, celebrate: false };
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

	// --- layout / lens ---
	setLens(lens: Lens): void { this.patchLayout({ lens, compare: false }); }
	openTool(tool: ToolId | null): void { this.patchLayout({ openTool: tool }); }
	toggleDock(): void { this.patchLayout({ dockExpanded: !this.state.layout.dockExpanded }); }
	toggleFocus(): void { this.patchLayout({ focusMode: !this.state.layout.focusMode, openTool: null, rightSurface: 'none' }); }
	toggleCompare(): void { this.patchLayout({ compare: !this.state.layout.compare }); }
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
		if (l.commandOpen) return this.patchLayout({ commandOpen: false });
		if (l.missionSheetOpen) return this.patchLayout({ missionSheetOpen: false });
		if (l.rightSurface !== 'none') return this.patchLayout({ rightSurface: 'none' });
		if (l.openTool) return this.patchLayout({ openTool: null });
		if (l.followingId) return this.follow(null);
		if (l.compare) return this.patchLayout({ compare: false });
		if (l.focusMode) return this.patchLayout({ focusMode: false });
	}
	resetLayout(): void {
		this.patchLayout({ openTool: null, dockExpanded: false, focusMode: false, followingId: null, compare: false, rightSurface: 'none', missionSheetOpen: false, commandOpen: false });
		this.toast('Workspace layout reset.');
	}

	follow(coworkerId: string | null): void {
		this.patchLayout({ followingId: coworkerId });
		this.mapCoworkers((c) => ({ ...c, following: c.id === coworkerId }));
		if (coworkerId) {
			const cw = this.state.coworkers.find((c) => c.id === coworkerId);
			if (cw?.marker) this.patchLayout({ lens: cw.marker.lens, followingId: coworkerId });
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
				marker: { lens: 'preview', x: 48, y: 44, label: 'Planning' }, branch: 'cw/maya', worktree: 'proj-maya',
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
	ship(): void {
		this.set({ celebrate: true });
		this.addEvent('merge', 'Shipped. Live link ready.', null);
		this.toast('Shipped 🎉  aurora.app/p/onboarding · link copied');
		setTimeout(() => this.set({ celebrate: false }), 1600);
	}
}

// The active runtime is now vended per-project by the WorkspaceManager
// (see workspace.ts). One PrototypeCoworkerRuntime instance backs each tab.
