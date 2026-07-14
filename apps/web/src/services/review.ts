// ---------------------------------------------------------------------------
// ReviewService — the working-tree diff, the review studio's data source.
//
// It snapshots the project's original files as an immutable baseline, then
// compares the live file system against it: added, modified, and deleted files,
// each with a real line-by-line diff. Rebuilds whenever the tree changes. This
// is the ground truth for "what has changed" — no matter who changed it (agent,
// terminal, or a saved editor buffer).
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';
import { fileDiff, type FileDiff } from '../lib/diff';
import { SEED_FILES } from './seed';
import { normalizePath } from './filesystem';

export class ReviewService {
	private baseline: Map<string, string>;
	private diffs: FileDiff[] = [];
	private rev = 0;
	private building = false;
	private dirty = true;
	private listeners = new Set<() => void>();

	constructor(private fs: IFileSystem, seed: Record<string, string> = SEED_FILES) {
		this.baseline = new Map(Object.entries(seed).map(([p, c]) => [normalizePath(p), c]));
		this.fs.onChange(() => { this.dirty = true; void this.rebuild(); });
		void this.rebuild();
	}

	/** The current set of changed files (added/modified/deleted), sorted by path. */
	get(): FileDiff[] {
		return this.diffs;
	}

	async rebuild(): Promise<void> {
		if (this.building) {
			return;
		}
		this.building = true;
		try {
			while (this.dirty) {
				this.dirty = false;
				const paths = await this.fs.list();
				const current = new Map<string, string>();
				for (const p of paths) {
					try {
						current.set(p, await this.fs.readFile(p));
					} catch {
						current.set(p, '');
					}
				}
				const changed: FileDiff[] = [];
				// Added / modified.
				for (const [p, text] of current) {
					const base = this.baseline.get(p);
					if (base === undefined) {
						changed.push(fileDiff(p, undefined, text));
					} else if (base !== text) {
						changed.push(fileDiff(p, base, text));
					}
				}
				// Deleted.
				for (const [p, text] of this.baseline) {
					if (!current.has(p)) {
						changed.push(fileDiff(p, text, undefined));
					}
				}
				changed.sort((a, b) => a.path.localeCompare(b.path));
				this.diffs = changed;
				this.bump();
			}
		} finally {
			this.building = false;
		}
	}

	readonly subscribe = (l: () => void): (() => void) => {
		this.listeners.add(l);
		return () => this.listeners.delete(l);
	};
	readonly getSnapshot = (): number => this.rev;

	private bump(): void {
		this.rev++;
		for (const l of this.listeners) {
			l();
		}
	}
}

// --- React binding --------------------------------------------------------

import { useServices } from './container';

/** The live working-tree diff, re-rendering as the workspace changes. */
export function useReview(): FileDiff[] {
	const { review } = useServices();
	useSyncExternalStore(review.subscribe, review.getSnapshot);
	return review.get();
}
