// ---------------------------------------------------------------------------
// Real project access — the substance behind "open any project".
//
// `SwitchableFileSystem` keeps the container's single `fs` instance stable while
// letting its backend swap: in-memory (the browser default / fallback) → a real
// folder on disk (`TauriFileSystem`) when you open a project on the desktop app.
// Every consumer holds the switchable wrapper, so a swap + one onChange refreshes
// the whole workspace — editor, tree, terminal, preview, graph — against your code.
//
// Tauri APIs are loaded lazily (dynamic import) so a browser build never touches
// them; all desktop paths are guarded by `isDesktop()`.
// ---------------------------------------------------------------------------

import type { IFileSystem } from './filesystem';

/** True when running inside the Tauri desktop shell (real filesystem available). */
export function isDesktop(): boolean {
	return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

/** A filesystem whose backend can be swapped at runtime. Delegates everything to
 *  the active backend and re-emits its changes, plus emits once on every swap. */
export class SwitchableFileSystem implements IFileSystem {
	private active: IFileSystem;
	private listeners = new Set<() => void>();
	private detach: (() => void) | null = null;

	constructor(initial: IFileSystem) {
		this.active = initial;
		this.detach = initial.onChange(() => this.emit());
	}

	/** Swap the backing filesystem (e.g. in-memory → a real project on disk). */
	mount(next: IFileSystem): void {
		if (next === this.active) return;
		this.detach?.();
		this.active = next;
		this.detach = next.onChange(() => this.emit());
		this.emit();
	}

	current(): IFileSystem {
		return this.active;
	}

	readFile(path: string): Promise<string> { return this.active.readFile(path); }
	writeFile(path: string, content: string): Promise<void> { return this.active.writeFile(path, content); }
	exists(path: string): Promise<boolean> { return this.active.exists(path); }
	list(): Promise<string[]> { return this.active.list(); }
	mkdir(path: string): Promise<void> { return this.active.mkdir(path); }
	delete(path: string): Promise<void> { return this.active.delete(path); }
	directories(): Promise<string[]> { return this.active.directories(); }
	reset(): Promise<void> { return this.active.reset(); }
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	private emit(): void { for (const l of this.listeners) l(); }
}

// Directories we never index — huge, generated, or irrelevant to editing.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'target', '.next', '.turbo', '.cache', '.velocity-workspace', 'coverage']);

/** An IFileSystem backed by a real folder on disk (desktop only). Paths are
 *  relative to `root`, slash-separated — matching the in-memory FS contract. */
export class TauriFileSystem implements IFileSystem {
	private listeners = new Set<() => void>();
	private index: { files: string[]; dirs: string[] } | null = null;
	private unwatch: (() => void) | null = null;

	constructor(private readonly root: string) {}

	private fsp() { return import('@tauri-apps/plugin-fs'); }
	private async abs(rel: string): Promise<string> {
		const { join } = await import('@tauri-apps/api/path');
		return rel ? join(this.root, rel) : this.root;
	}

	async readFile(rel: string): Promise<string> {
		const { readTextFile } = await this.fsp();
		return readTextFile(await this.abs(rel));
	}

	async writeFile(rel: string, content: string): Promise<void> {
		const { writeTextFile, mkdir, exists } = await this.fsp();
		const { dirname } = await import('@tauri-apps/api/path');
		const abs = await this.abs(rel);
		const dir = await dirname(abs);
		if (!(await exists(dir))) await mkdir(dir, { recursive: true });
		await writeTextFile(abs, content);
		this.index = null;
		this.emit();
	}

	async exists(rel: string): Promise<boolean> {
		const { exists } = await this.fsp();
		return exists(await this.abs(rel));
	}

	async mkdir(rel: string): Promise<void> {
		const { mkdir } = await this.fsp();
		await mkdir(await this.abs(rel), { recursive: true });
		this.index = null;
		this.emit();
	}

	async delete(rel: string): Promise<void> {
		const { remove } = await this.fsp();
		await remove(await this.abs(rel), { recursive: true });
		this.index = null;
		this.emit();
	}

	async list(): Promise<string[]> { return (await this.build()).files; }
	async directories(): Promise<string[]> { return (await this.build()).dirs; }
	async reset(): Promise<void> { this.index = null; this.emit(); }

	/** Walk the tree once and cache it (invalidated on any write/delete/watch). */
	private async build(): Promise<{ files: string[]; dirs: string[] }> {
		if (this.index) return this.index;
		const { readDir } = await this.fsp();
		const { join } = await import('@tauri-apps/api/path');
		const files: string[] = [];
		const dirs: string[] = [];
		const walk = async (absDir: string, rel: string): Promise<void> => {
			let entries: Awaited<ReturnType<typeof readDir>>;
			try { entries = await readDir(absDir); } catch { return; }
			for (const entry of entries) {
				const childRel = rel ? `${rel}/${entry.name}` : entry.name;
				if (entry.isDirectory) {
					if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
					dirs.push(childRel);
					await walk(await join(absDir, entry.name), childRel);
				} else if (entry.isFile) {
					files.push(childRel);
				}
			}
		};
		await walk(this.root, '');
		files.sort((a, b) => a.localeCompare(b));
		dirs.sort((a, b) => a.localeCompare(b));
		this.index = { files, dirs };
		return this.index;
	}

	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	private emit(): void { for (const l of this.listeners) l(); }

	/** Best-effort: watch the folder so external edits refresh the tree. */
	async startWatch(): Promise<void> {
		try {
			const { watchImmediate } = await this.fsp();
			this.unwatch = await watchImmediate(this.root, () => { this.index = null; this.emit(); }, { recursive: true });
		} catch { /* watch unavailable — the tree refreshes on our own writes */ }
	}
	dispose(): void { this.unwatch?.(); this.unwatch = null; }
}

export interface Project {
	root: string;
	name: string;
}

/** Opens real folders as the active workspace (desktop), tracks recents. */
export class ProjectService {
	private cur: Project | null = null;
	private opened: TauriFileSystem | null = null;
	private listeners = new Set<() => void>();

	constructor(private readonly fs: SwitchableFileSystem, private readonly memory: IFileSystem) {}

	desktop(): boolean { return isDesktop(); }
	current(): Project | null { return this.cur; }
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	recent(): string[] {
		try {
			const raw = localStorage.getItem('velocity.recentProjects');
			const parsed = raw ? (JSON.parse(raw) as string[]) : [];
			return Array.isArray(parsed) ? parsed : [];
		} catch { return []; }
	}

	/** Show the OS folder picker, then open the chosen project. Desktop only. */
	async open(): Promise<Project | null> {
		if (!this.desktop()) return null;
		const { open } = await import('@tauri-apps/plugin-dialog');
		const picked = await open({ directory: true, multiple: false, title: 'Open a project folder' });
		if (typeof picked !== 'string' || !picked) return null;
		return this.openPath(picked);
	}

	async openPath(root: string): Promise<Project> {
		this.opened?.dispose();
		const tfs = new TauriFileSystem(root);
		await tfs.startWatch();
		this.opened = tfs;
		this.fs.mount(tfs);
		const name = root.split(/[\\/]/).filter(Boolean).pop() ?? root;
		this.cur = { root, name };
		this.pushRecent(root);
		this.emit();
		return this.cur;
	}

	/** Return to the built-in in-memory demo workspace. */
	close(): void {
		this.opened?.dispose();
		this.opened = null;
		this.fs.mount(this.memory);
		this.cur = null;
		this.emit();
	}

	private pushRecent(root: string): void {
		const next = [root, ...this.recent().filter((entry) => entry !== root)].slice(0, 8);
		try { localStorage.setItem('velocity.recentProjects', JSON.stringify(next)); } catch { /* ignore */ }
	}
	private emit(): void { for (const l of this.listeners) l(); }
}
