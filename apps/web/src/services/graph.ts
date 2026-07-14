// ---------------------------------------------------------------------------
// GraphService — owns the one project graph.
//
// It reads the real workspace file system, builds the graph (lib/graph.ts), and
// rebuilds it whenever the tree changes. The graph is the product's spine: the
// command palette, the architecture map, and (later) every studio read from it.
// Components subscribe via useGraph(); non-React callers use getServices().graph.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';
import { buildGraph, type ProjectGraph } from '../lib/graph';

const EMPTY: ProjectGraph = { nodes: new Map(), edges: [] };

export class GraphService {
	private graph: ProjectGraph = EMPTY;
	private rev = 0;
	private building = false;
	private dirty = true;
	private listeners = new Set<() => void>();
	private projectName = 'workspace';

	constructor(private fs: IFileSystem) {
		// Any structural FS change invalidates the graph; rebuild lazily.
		this.fs.onChange(() => { this.dirty = true; void this.rebuild(); });
		void this.rebuild();
	}

	/** Name the graph's root project node (the active workspace). */
	setProjectName(name: string): void {
		if (name && name !== this.projectName) {
			this.projectName = name;
			this.dirty = true;
			void this.rebuild();
		}
	}

	/** The current graph snapshot (may be stale for a tick after an FS change). */
	get(): ProjectGraph {
		return this.graph;
	}

	/** Rebuild from the real FS. Coalesces concurrent calls. */
	async rebuild(): Promise<void> {
		if (this.building) {
			return;
		}
		this.building = true;
		try {
			// Loop so a change that arrives mid-build is not lost.
			while (this.dirty) {
				this.dirty = false;
				const paths = await this.fs.list();
				const files: Record<string, string> = {};
				for (const p of paths) {
					try {
						files[p] = await this.fs.readFile(p);
					} catch {
						files[p] = '';
					}
				}
				this.graph = buildGraph({ projectName: this.projectName, files });
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

/** The project graph, re-rendering whenever the workspace changes. */
export function useGraph(): ProjectGraph {
	const { graph } = useServices();
	useSyncExternalStore(graph.subscribe, graph.getSnapshot);
	return graph.get();
}
