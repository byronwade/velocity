// ---------------------------------------------------------------------------
// DesignService — the Design studio's data source.
//
// Reads the workspace's real .css files and extracts their design tokens
// (custom properties). Rebuilds whenever the file system changes, so tokens the
// agent or Builder writes appear here. Component and route inventories come from
// the shared graph, not this service.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';
import { parseTokens, type Token } from '../lib/design';

export class DesignService {
	private tokens: Token[] = [];
	private rev = 0;
	private building = false;
	private dirty = true;
	private listeners = new Set<() => void>();

	constructor(private fs: IFileSystem) {
		this.fs.onChange(() => { this.dirty = true; void this.rebuild(); });
		void this.rebuild();
	}

	get(): Token[] {
		return this.tokens;
	}

	async rebuild(): Promise<void> {
		if (this.building) return;
		this.building = true;
		try {
			while (this.dirty) {
				this.dirty = false;
				const paths = (await this.fs.list()).filter((p) => p.endsWith('.css'));
				const seen = new Map<string, Token>();
				for (const p of paths) {
					try {
						for (const t of parseTokens(await this.fs.readFile(p), p)) {
							if (!seen.has(t.name)) seen.set(t.name, t);
						}
					} catch { /* skip unreadable */ }
				}
				this.tokens = [...seen.values()];
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
		for (const l of this.listeners) l();
	}
}

// --- React binding --------------------------------------------------------

import { useServices } from './container';

export function useDesign(): Token[] {
	const { design } = useServices();
	useSyncExternalStore(design.subscribe, design.getSnapshot);
	return design.get();
}
