// ---------------------------------------------------------------------------
// DeployService — the Ship studio's control plane.
//
// "Builds" are real artifacts: the folders the Builder and agent actually
// generate under builds/<slug>/. Environments hold genuine in-session state —
// which build is live where, when, and the history to roll back to. Deploying
// promotes a real artifact; there is no fabricated status.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';

export interface Build {
	slug: string;
	files: number;
	entry?: string;
}

export type EnvName = 'preview' | 'production';

export interface Environment {
	name: EnvName;
	current?: string;
	at?: string;
	history: { slug: string; at: string }[];
}

export const ENV_NAMES: EnvName[] = ['preview', 'production'];

function stamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface DeploySnapshot {
	builds: Build[];
	envs: Record<EnvName, Environment>;
}

export class DeployService {
	private builds: Build[] = [];
	private envs: Record<EnvName, Environment> = {
		preview: { name: 'preview', history: [] },
		production: { name: 'production', history: [] },
	};
	private rev = 0;
	private building = false;
	private dirty = true;
	private listeners = new Set<() => void>();

	constructor(private fs: IFileSystem) {
		this.fs.onChange(() => { this.dirty = true; void this.rebuild(); });
		void this.rebuild();
	}

	get(): DeploySnapshot {
		return { builds: this.builds, envs: this.envs };
	}

	async rebuild(): Promise<void> {
		if (this.building) return;
		this.building = true;
		try {
			while (this.dirty) {
				this.dirty = false;
				const files = await this.fs.list();
				const map = new Map<string, { files: number; hasIndex: boolean }>();
				for (const p of files) {
					const m = p.match(/^builds\/([^/]+)\//);
					if (!m) continue;
					const slug = m[1];
					const e = map.get(slug) ?? { files: 0, hasIndex: false };
					e.files++;
					if (p === `builds/${slug}/index.html`) e.hasIndex = true;
					map.set(slug, e);
				}
				this.builds = [...map.entries()]
					.map(([slug, e]) => ({ slug, files: e.files, entry: e.hasIndex ? `builds/${slug}/index.html` : undefined }))
					.sort((a, b) => a.slug.localeCompare(b.slug));
				this.bump();
			}
		} finally {
			this.building = false;
		}
	}

	/** Promote a build to an environment; the previous deploy becomes rollback history. */
	deploy(env: EnvName, slug: string): void {
		const e = this.envs[env];
		if (e.current) e.history.push({ slug: e.current, at: e.at ?? '' });
		this.envs = { ...this.envs, [env]: { ...e, current: slug, at: stamp() } };
		this.bump();
	}

	/** Roll an environment back to its previous deploy. */
	rollback(env: EnvName): void {
		const e = this.envs[env];
		const prev = e.history[e.history.length - 1];
		if (!prev) return;
		this.envs = { ...this.envs, [env]: { ...e, current: prev.slug, at: prev.at, history: e.history.slice(0, -1) } };
		this.bump();
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

export function useDeploy(): DeploySnapshot {
	const { deploy } = useServices();
	useSyncExternalStore(deploy.subscribe, deploy.getSnapshot);
	return deploy.get();
}
