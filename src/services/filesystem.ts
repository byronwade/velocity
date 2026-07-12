// ---------------------------------------------------------------------------
// FileSystemService — the storage seam.
//
// The interface is async and path-based so today's in-memory implementation can
// be swapped for OPFS, a WebContainer FS, or a real server backend without any
// caller changing. Callers await; they never assume where bytes live.
// ---------------------------------------------------------------------------

import { SEED_FILES } from './seed';

export interface IFileSystem {
	/** Read a file's contents. Rejects if the path does not exist. */
	readFile(path: string): Promise<string>;
	/** Create or overwrite a file. Creates parent directories implicitly. */
	writeFile(path: string, content: string): Promise<void>;
	/** True if a file exists at `path`. */
	exists(path: string): Promise<boolean>;
	/** All file paths, sorted. Directories are implied by the path segments. */
	list(): Promise<string[]>;
	/** Subscribe to structural changes (create/delete/rename). Returns an unsubscribe. */
	onChange(listener: () => void): () => void;
}

/** Normalize to a canonical, slash-separated, no-leading-slash path. */
export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/^\.?\/+/, '').replace(/\/+/g, '/');
}

export class InMemoryFileSystem implements IFileSystem {
	private files = new Map<string, string>();
	private listeners = new Set<() => void>();

	constructor(seed: Record<string, string> = SEED_FILES) {
		for (const [path, content] of Object.entries(seed)) {
			this.files.set(normalizePath(path), content);
		}
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
		const isNew = !this.files.has(p);
		this.files.set(p, content);
		// Only a create changes the tree; a content overwrite does not.
		if (isNew) {
			this.emit();
		}
	}

	async exists(path: string): Promise<boolean> {
		return this.files.has(normalizePath(path));
	}

	async list(): Promise<string[]> {
		return [...this.files.keys()].sort((a, b) => a.localeCompare(b));
	}

	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private emit() {
		for (const l of this.listeners) {
			l();
		}
	}
}
