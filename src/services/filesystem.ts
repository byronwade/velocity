// ---------------------------------------------------------------------------
// FileSystemService — the storage seam.
//
// The interface is async and path-based so today's in-memory implementation can
// be swapped for OPFS, a WebContainer FS, or a real server backend without any
// caller changing. Callers await; they never assume where bytes live.
// ---------------------------------------------------------------------------

import { SEED_FILES } from './seed';
import { SEED_VERSION, memoryOnlyStore, type FsStore, type FsSnapshot } from './persistence';

export interface IFileSystem {
	/** Read a file's contents. Rejects if the path does not exist. */
	readFile(path: string): Promise<string>;
	/** Create or overwrite a file. Creates parent directories implicitly. */
	writeFile(path: string, content: string): Promise<void>;
	/** True if a file exists at `path`. */
	exists(path: string): Promise<boolean>;
	/** All file paths, sorted. Directories are implied by the path segments. */
	list(): Promise<string[]>;
	/** Create an (possibly empty) directory, and its ancestors. */
	mkdir(path: string): Promise<void>;
	/** Delete a file, or a directory and everything under it. */
	delete(path: string): Promise<void>;
	/** All directory paths — those implied by files plus any created empty. */
	directories(): Promise<string[]>;
	/** Subscribe to structural changes (create/delete/rename). Returns an unsubscribe. */
	onChange(listener: () => void): () => void;
	/** Discard all saved state and reset the tree to the seed project. */
	reset(): Promise<void>;
}

/** Normalize to a canonical, slash-separated, no-leading-slash path. */
export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/^\.?\/+/, '').replace(/\/+/g, '/');
}

/** Every ancestor directory of a file/dir path, e.g. 'a/b/c.ts' -> ['a', 'a/b']. */
function ancestors(path: string): string[] {
	const parts = path.split('/');
	const out: string[] = [];
	for (let i = 1; i < parts.length; i++) {
		out.push(parts.slice(0, i).join('/'));
	}
	return out;
}

export class InMemoryFileSystem implements IFileSystem {
	private files = new Map<string, string>();
	private emptyDirs = new Set<string>();
	private listeners = new Set<() => void>();
	private readonly store: FsStore;
	private readonly seed: Record<string, string>;
	private flushHandle: ReturnType<typeof setTimeout> | null = null;

	constructor(seed: Record<string, string> = SEED_FILES, store: FsStore = memoryOnlyStore) {
		this.seed = seed;
		this.store = store;
		const saved = store.load();
		if (saved) {
			// Restore the persisted workspace verbatim — the user's world wins.
			for (const [path, content] of Object.entries(saved.files)) {
				this.files.set(normalizePath(path), content);
			}
			for (const dir of saved.emptyDirs) {
				this.emptyDirs.add(normalizePath(dir));
			}
		} else {
			this.seedFresh();
		}
	}

	/** Populate the tree from the seed (a fresh or reset workspace). */
	private seedFresh(): void {
		for (const [path, content] of Object.entries(this.seed)) {
			this.files.set(normalizePath(path), content);
		}
	}

	/** Serialize current state for the store. */
	private snapshot(): FsSnapshot {
		return {
			v: SEED_VERSION,
			files: Object.fromEntries(this.files),
			emptyDirs: [...this.emptyDirs],
		};
	}

	/** Debounced write-through to the store — coalesces bursts of edits. */
	private schedulePersist(): void {
		if (this.store === memoryOnlyStore) return;
		if (this.flushHandle !== null) return;
		this.flushHandle = setTimeout(() => {
			this.flushHandle = null;
			this.store.save(this.snapshot());
		}, 150);
	}

	async readFile(path: string): Promise<string> {
		const p = normalizePath(path);
		const content = this.files.get(p);
		if (content === undefined) {
			throw new Error(`ENOENT: no such file '${p}'`);
		}
		return content;
	}

	async writeFile(path: string, content: string): Promise<void> {
		const p = normalizePath(path);
		const prev = this.files.get(p);
		this.files.set(p, content);
		// A newly-created file can retire an empty-dir marker it now populates.
		for (const dir of ancestors(p)) {
			this.emptyDirs.delete(dir);
		}
		// Notify on any real change. A create changes the tree; an overwrite
		// changes what every content-derived view shows — the review diff, the
		// project graph, the DB schema, the design tokens. Skipping overwrites
		// here (a past "tree only" optimization) silently froze all of those on
		// save. Only a genuine no-op write is skipped.
		if (prev !== content) {
			this.emit();
		}
	}

	async exists(path: string): Promise<boolean> {
		const p = normalizePath(path);
		return this.files.has(p) || this.isDir(p);
	}

	async list(): Promise<string[]> {
		return [...this.files.keys()].sort((a, b) => a.localeCompare(b));
	}

	async mkdir(path: string): Promise<void> {
		const p = normalizePath(path);
		if (!p || this.isDir(p) || this.files.has(p)) {
			return;
		}
		this.emptyDirs.add(p);
		this.emit();
	}

	async delete(path: string): Promise<void> {
		const p = normalizePath(path);
		let changed = false;
		if (this.files.delete(p)) {
			changed = true;
		}
		// Remove a directory and everything beneath it.
		const prefix = `${p}/`;
		for (const f of [...this.files.keys()]) {
			if (f.startsWith(prefix)) {
				this.files.delete(f);
				changed = true;
			}
		}
		for (const d of [...this.emptyDirs]) {
			if (d === p || d.startsWith(prefix)) {
				this.emptyDirs.delete(d);
				changed = true;
			}
		}
		if (changed) {
			this.emit();
		}
	}

	async directories(): Promise<string[]> {
		const dirs = new Set<string>(this.emptyDirs);
		for (const f of this.files.keys()) {
			for (const dir of ancestors(f)) {
				dirs.add(dir);
			}
		}
		return [...dirs].sort((a, b) => a.localeCompare(b));
	}

	/** True if `path` names a directory (implied by a file, or an empty dir). */
	private isDir(path: string): boolean {
		if (this.emptyDirs.has(path)) {
			return true;
		}
		const prefix = `${path}/`;
		for (const f of this.files.keys()) {
			if (f.startsWith(prefix)) {
				return true;
			}
		}
		return false;
	}

	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async reset(): Promise<void> {
		this.files.clear();
		this.emptyDirs.clear();
		this.seedFresh();
		this.store.clear();
		this.emit();
	}

	private emit() {
		// Every emit is a real mutation (create / overwrite / mkdir / delete), so
		// this is exactly where durable state should be brought up to date.
		this.schedulePersist();
		for (const l of this.listeners) {
			l();
		}
	}
}
