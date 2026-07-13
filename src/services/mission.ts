// ---------------------------------------------------------------------------
// MissionService — the agent swarm's orchestrator.
//
// It converts an objective into a real task graph assigned to specialists, then
// drives it: ready tasks run automatically, each performing a GENUINE operation
// through the workspace services (scaffold via the generator, tests via the real
// check runner, review via the diff, deploy via the control plane). Deploy is
// gated on human approval. Every task records real evidence of what it did.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { Services } from './container';
import { generate } from './generator';
import { runChecks } from './checks';
import { uid } from '../lib/tree';

export type Specialist = 'architecture' | 'frontend' | 'design' | 'testing' | 'review' | 'deployment';
export type TaskStatus = 'blocked' | 'ready' | 'running' | 'done' | 'awaiting-approval';
type Kind = 'plan' | 'scaffold' | 'style' | 'test' | 'review' | 'deploy';

export interface Task {
	id: string;
	kind: Kind;
	title: string;
	specialist: Specialist;
	deps: string[];
	needsApproval?: boolean;
	status: TaskStatus;
	evidence?: string;
}

export interface Mission {
	id: string;
	objective: string;
	tasks: Task[];
	startedAt: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function decompose(): Omit<Task, 'status' | 'evidence'>[] {
	return [
		{ id: 'plan', kind: 'plan', title: 'Plan the work', specialist: 'architecture', deps: [] },
		{ id: 'scaffold', kind: 'scaffold', title: 'Scaffold the app', specialist: 'frontend', deps: ['plan'] },
		{ id: 'style', kind: 'style', title: 'Apply the design system', specialist: 'design', deps: ['plan'] },
		{ id: 'test', kind: 'test', title: 'Run the test suite', specialist: 'testing', deps: ['scaffold'] },
		{ id: 'review', kind: 'review', title: 'Review the changes', specialist: 'review', deps: ['scaffold', 'style'] },
		{ id: 'deploy', kind: 'deploy', title: 'Deploy to preview', specialist: 'deployment', deps: ['review'], needsApproval: true },
	];
}

export class MissionService {
	private mission: Mission | null = null;
	private slug: string | null = null;
	private rev = 0;
	private draining = false;
	private listeners = new Set<() => void>();

	constructor(private getServices: () => Services) {}

	get(): Mission | null {
		return this.mission;
	}

	/** Start a fresh mission from an objective and begin driving it. */
	start(objective: string): void {
		const trimmed = objective.trim();
		if (!trimmed) return;
		this.slug = null;
		const tasks: Task[] = decompose().map((t) => ({ ...t, status: t.deps.length === 0 ? 'ready' : 'blocked' }));
		this.mission = { id: uid('mission'), objective: trimmed, tasks, startedAt: stamp() };
		this.bump();
		void this.drain();
	}

	/** Approve a gated task, unblocking it to run. */
	approve(taskId: string): void {
		const t = this.mission?.tasks.find((x) => x.id === taskId);
		if (t && t.status === 'awaiting-approval') {
			t.status = 'ready';
			this.bump();
			void this.drain();
		}
	}

	/** Run every ready (non-gated) task, in dependency order, until none remain. */
	private async drain(): Promise<void> {
		if (this.draining || !this.mission) return;
		this.draining = true;
		try {
			for (;;) {
				const next = this.mission.tasks.find((t) => t.status === 'ready');
				if (!next) break;
				next.status = 'running';
				this.bump();
				await sleep(420);
				try {
					next.evidence = await this.perform(next);
					next.status = 'done';
				} catch (e) {
					next.evidence = e instanceof Error ? e.message : 'failed';
					next.status = 'done';
				}
				this.recompute();
				this.bump();
			}
		} finally {
			this.draining = false;
		}
	}

	/** When a task's deps are all done, promote it to ready (or awaiting-approval). */
	private recompute(): void {
		if (!this.mission) return;
		const done = new Set(this.mission.tasks.filter((t) => t.status === 'done').map((t) => t.id));
		for (const t of this.mission.tasks) {
			if (t.status === 'blocked' && t.deps.every((d) => done.has(d))) {
				t.status = t.needsApproval ? 'awaiting-approval' : 'ready';
			}
		}
	}

	/** Perform a task's real operation and return evidence. */
	private async perform(task: Task): Promise<string> {
		const s = this.getServices();
		const objective = this.mission?.objective ?? '';
		switch (task.kind) {
			case 'plan': {
				const specialists = new Set((this.mission?.tasks ?? []).map((t) => t.specialist));
				return `Decomposed into ${this.mission?.tasks.length ?? 0} tasks across ${specialists.size} specialists`;
			}
			case 'scaffold': {
				const g = generate(objective);
				let n = 0;
				for (const [path, content] of Object.entries(g.files)) { await s.fs.writeFile(path, content); n++; }
				this.slug = g.slug;
				return `Wrote ${n} files → builds/${g.slug}/`;
			}
			case 'style': {
				await s.design.rebuild();
				return `${s.design.get().length} design tokens in the system`;
			}
			case 'test': {
				const results = await runChecks(s);
				const passed = results.filter((r) => r.status === 'pass').length;
				return `${passed}/${results.length} checks passed`;
			}
			case 'review': {
				await s.review.rebuild();
				const files = s.review.get();
				const added = files.reduce((a, f) => a + f.added, 0);
				const removed = files.reduce((a, f) => a + f.removed, 0);
				return `${files.length} files changed · +${added} −${removed}`;
			}
			case 'deploy': {
				await s.deploy.rebuild();
				const slug = this.slug ?? s.deploy.get().builds[0]?.slug;
				if (!slug) return 'No build to deploy';
				s.deploy.deploy('preview', slug);
				return `Deployed ${slug} → preview`;
			}
		}
	}

	readonly subscribe = (l: () => void): (() => void) => {
		this.listeners.add(l);
		return () => this.listeners.delete(l);
	};
	readonly getSnapshot = (): number => this.rev;

	private bump(): void {
		this.rev++;
		for (const l of this.listeners) l();
	}
}

// --- React binding --------------------------------------------------------

import { useServices } from './container';

export function useMission(): Mission | null {
	const { mission } = useServices();
	useSyncExternalStore(mission.subscribe, mission.getSnapshot);
	return mission.get();
}
