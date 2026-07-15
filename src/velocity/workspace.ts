// ---------------------------------------------------------------------------
// WorkspaceManager — the multi-project layer.
//
// Each project TAB owns a full, isolated PrototypeCoworkerRuntime: its own
// coworkers, missions, checkpoints, open lens, terminals/tools, and rails.
// Switching tabs swaps which runtime is active; every existing component keeps
// calling the same `runtime` proxy, which always forwards to the active tab.
//
// Account-level state (the user profile + credits/usage) lives here too, since
// it spans every project — it is rendered in the tab bar above the tabs.
// ---------------------------------------------------------------------------

import { PrototypeCoworkerRuntime, type CoworkerRuntime } from './runtime';
import { STATE_TONE } from './model';
import type { WorkspaceState } from './model';

export interface ProjectTab {
	id: string;
	name: string;
	scenario: string;
}

/** A cheap, render-ready view of one tab (recomputed on every change). */
export interface TabView {
	id: string;
	name: string;
	scenarioLabel: string;
	lens: string;
	coworkers: number;
	pendingReview: boolean;
	openDecision: boolean;
	paused: boolean;
	shipped: boolean;
	/** True while any coworker is actively working (drives the tab spinner). */
	working: boolean;
	missionTitle: string | null;
	missionDone: number;
	missionTotal: number;
	/** Compact per-coworker lines for the tab hover card. */
	roster: { name: string; color: string; action: string; tone: string }[];
	/** What needs the human's attention on this project. */
	needs: string[];
}

export interface Account {
	user: { name: string; initials: string; color: string; plan: string; email: string };
	credits: { used: number; total: number };
	usageLabel: string;
}

export interface InboxItem {
	id: string;
	projectId: string;
	projectName: string;
	kind: 'review' | 'decision' | 'waiting' | 'shipped';
	text: string;
	tone: string;
}

export interface ManagerSnapshot {
	tabs: TabView[];
	inbox: InboxItem[];
	activeId: string;
	account: Account;
}

interface Project extends ProjectTab {
	runtime: PrototypeCoworkerRuntime;
	unsub: () => void;
}

let pid = 0;
const projectId = () => `p${++pid}`;

const ACCOUNT: Account = {
	user: { name: 'Byron Wade', initials: 'BW', color: '#6f74c9', plan: 'Pro', email: 'byron@aurora.dev' },
	credits: { used: 1240, total: 5000 },
	usageLabel: '38 coworker-hours this week',
};

// The tabs seeded on first load. The first tab honours ?scenario=; the rest
// give the tab bar immediate, distinct content to switch between.
function seedProjects(firstScenario: string): Array<{ name: string; scenario: string }> {
	return [
		{ name: 'Aurora', scenario: firstScenario },
		{ name: 'Northwind', scenario: 'checkpoint' },
		{ name: 'Meridian', scenario: 'parallel' },
	];
}

export class WorkspaceManager {
	private projects: Project[] = [];
	private activeId = '';
	private account = ACCOUNT;
	private listeners = new Set<() => void>();
	private snap: ManagerSnapshot;

	constructor(firstScenario: string) {
		for (const seed of seedProjects(firstScenario)) this.create(seed.name, seed.scenario);
		this.activeId = this.projects[0].id;
		this.snap = this.build();
	}

	private create(name: string, scenario: string): Project {
		const runtime = new PrototypeCoworkerRuntime(scenario);
		runtime.setProjectName(name);
		const id = projectId();
		const unsub = runtime.subscribe(() => this.emit());
		const project: Project = { id, name, scenario, runtime, unsub };
		this.projects.push(project);
		return project;
	}

	private build(): ManagerSnapshot {
		const inbox: InboxItem[] = [];
		for (const p of this.projects) {
			const s = p.runtime.getState();
			const name = s.project.name;
			for (const d of s.decisions.filter((d) => d.state === 'open')) inbox.push({ id: `${p.id}:d:${d.id}`, projectId: p.id, projectName: name, kind: 'decision', text: d.title, tone: 'work' });
			for (const k of s.checkpoints.filter((k) => k.state === 'ready')) inbox.push({ id: `${p.id}:k:${k.id}`, projectId: p.id, projectName: name, kind: 'review', text: k.outcome, tone: 'warn' });
			for (const c of s.coworkers.filter((c) => c.state === 'waiting')) inbox.push({ id: `${p.id}:w:${c.id}`, projectId: p.id, projectName: name, kind: 'waiting', text: `${c.name} · ${c.action}`, tone: 'warn' });
		}
		return {
			activeId: this.activeId,
			account: this.account,
			inbox,
			tabs: this.projects.map((p): TabView => {
				const s = p.runtime.getState();
				const live = s.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
				const pendingReview = s.checkpoints.some((k) => k.state === 'ready');
				const openDecision = s.decisions.some((d) => d.state === 'open');
				const needs: string[] = [];
				if (openDecision) needs.push('A decision needs you');
				if (pendingReview) needs.push('A checkpoint is ready to review');
				const waiting = live.filter((c) => c.state === 'waiting').length;
				if (waiting) needs.push(`${waiting} coworker${waiting > 1 ? 's' : ''} waiting on a dependency`);
				return {
					id: p.id,
					name: s.project.name,
					scenarioLabel: s.scenarioLabel,
					lens: s.layout.lens,
					coworkers: live.length,
					pendingReview,
					openDecision,
					paused: s.paused,
					shipped: !!s.celebrate,
					working: !s.paused && live.some((c) => c.state === 'active' || c.state === 'verifying' || c.state === 'planning'),
					missionTitle: s.mission?.title ?? null,
					missionDone: s.mission?.criteria.filter((c) => c.state === 'verified').length ?? 0,
					missionTotal: s.mission?.criteria.length ?? 0,
					roster: live.slice(0, 5).map((c) => ({ name: c.name, color: c.color, action: c.action, tone: STATE_TONE[c.state] })),
					needs,
				};
			}),
		};
	}

	private emit(): void {
		this.snap = this.build();
		for (const l of this.listeners) l();
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	getSnapshot = (): ManagerSnapshot => this.snap;

	getActive(): CoworkerRuntime {
		return (this.projects.find((p) => p.id === this.activeId) ?? this.projects[0]).runtime;
	}

	getActiveState = (): WorkspaceState => this.getActive().getState();

	// --- tab actions ---
	switchProject(id: string): void {
		if (id === this.activeId || !this.projects.some((p) => p.id === id)) return;
		this.activeId = id;
		this.emit();
	}

	newProject(): void {
		const n = this.projects.filter((p) => p.name.startsWith('Untitled')).length;
		const project = this.create(n === 0 ? 'Untitled' : `Untitled ${n + 1}`, 'empty');
		this.activeId = project.id;
		this.emit();
	}

	closeProject(id: string): void {
		if (this.projects.length === 1) return; // always keep one project open
		const idx = this.projects.findIndex((p) => p.id === id);
		if (idx === -1) return;
		this.projects[idx].unsub();
		this.projects[idx].runtime.dispose();
		this.projects.splice(idx, 1);
		if (this.activeId === id) this.activeId = this.projects[Math.max(0, idx - 1)].id;
		this.emit();
	}

	reorderProjects(dragId: string, targetId: string): void {
		if (dragId === targetId) return;
		const from = this.projects.findIndex((p) => p.id === dragId);
		const to = this.projects.findIndex((p) => p.id === targetId);
		if (from === -1 || to === -1) return;
		const [moved] = this.projects.splice(from, 1);
		this.projects.splice(to, 0, moved);
		this.emit();
	}

	renameProject(id: string, name: string): void {
		const project = this.projects.find((p) => p.id === id);
		if (!project) return;
		const clean = name.trim() || project.name;
		project.name = clean;
		project.runtime.setProjectName(clean);
		this.emit();
	}
}

const initialScenario =
	(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('scenario')) || 'calm';

export const manager = new WorkspaceManager(initialScenario);

/**
 * The `runtime` every component imports. A proxy that forwards each call to the
 * active tab's runtime, so switching projects needs no change at the call site.
 */
export const runtime: CoworkerRuntime = new Proxy({} as CoworkerRuntime, {
	get(_target, prop) {
		const active = manager.getActive() as unknown as Record<string | symbol, unknown>;
		const value = active[prop];
		return typeof value === 'function' ? value.bind(active) : value;
	},
});
