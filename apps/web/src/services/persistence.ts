// ---------------------------------------------------------------------------
// Persistence — the durability seam for the workspace file system.
//
// InMemoryFileSystem stays pure in-memory; it just takes an optional FsStore.
// This module supplies a localStorage-backed store so a page reload keeps the
// tree, every edit, and every created file. The store is deliberately tiny and
// synchronous — swap it for an OPFS or IndexedDB adapter (async load) without
// the file system caring, since load happens once at construction.
// ---------------------------------------------------------------------------

/** A serialized snapshot of the whole file system. */
export interface FsSnapshot {
	/** Schema/seed version. A mismatch discards the snapshot and re-seeds. */
	v: number;
	/** path -> file contents. */
	files: Record<string, string>;
	/** Explicitly-created empty directories (those not implied by any file). */
	emptyDirs: string[];
}

/** Where a snapshot is loaded from / saved to. Implementations never throw. */
export interface FsStore {
	/** Return the saved snapshot, or null if none / unreadable / wrong version. */
	load(): FsSnapshot | null;
	/** Persist a snapshot. Best-effort; a failure (quota, private mode) is silent. */
	save(snap: FsSnapshot): void;
	/** Drop the saved snapshot (used by "reset workspace"). */
	clear(): void;
}

/** Bump when the seed's shape changes enough that old snapshots should be dropped. */
export const SEED_VERSION = 1;

const KEY = 'velocity.workspace.v1';

/** A no-op store — used when no durable backend exists (SSR, tests). */
export const memoryOnlyStore: FsStore = {
	load: () => null,
	save: () => {},
	clear: () => {},
};

/**
 * A localStorage-backed store. Returns `memoryOnlyStore` when localStorage is
 * unavailable, so callers get a working (if non-durable) store either way.
 */
export function localStorageStore(key = KEY): FsStore {
	let ls: Storage | null = null;
	try {
		ls = typeof window !== 'undefined' ? window.localStorage : null;
		// Probe — some environments expose the object but throw on access.
		if (ls) {
			const probe = '__velocity_probe__';
			ls.setItem(probe, '1');
			ls.removeItem(probe);
		}
	} catch {
		ls = null;
	}
	if (!ls) return memoryOnlyStore;

	const store = ls;
	return {
		load() {
			try {
				const raw = store.getItem(key);
				if (!raw) return null;
				const parsed = JSON.parse(raw) as Partial<FsSnapshot>;
				if (
					!parsed ||
					parsed.v !== SEED_VERSION ||
					typeof parsed.files !== 'object' ||
					parsed.files === null ||
					!Array.isArray(parsed.emptyDirs)
				) {
					return null;
				}
				return { v: parsed.v, files: parsed.files as Record<string, string>, emptyDirs: parsed.emptyDirs };
			} catch {
				return null;
			}
		},
		save(snap: FsSnapshot) {
			try {
				store.setItem(key, JSON.stringify(snap));
			} catch (err) {
				// Quota or serialization failure — keep running from memory. Surface
				// it (the Observe studio captures console) but never break a write.
				console.warn('Workspace persistence failed:', err instanceof Error ? err.message : String(err));
			}
		},
		clear() {
			try {
				store.removeItem(key);
			} catch {
				/* ignore */
			}
		},
	};
}
