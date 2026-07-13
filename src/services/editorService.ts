// ---------------------------------------------------------------------------
// EditorService — owns open documents and per-pane bindings.
//
// One shared TextDocument per path (so N panes on the same file collaborate),
// a paneId → path map (which file each editor pane shows), and save() routed
// through the FileSystem. React reads it through useSyncExternalStore, so the
// service is framework-agnostic and swappable.
// ---------------------------------------------------------------------------

import { useCallback, useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';
import { normalizePath } from './filesystem';
import { TextDocument } from './document';
import { useServices } from './container';

/** Shared stable empty list — see openFilesForPane. */
const EMPTY_FILES: string[] = [];

export class EditorService {
	private docs = new Map<string, TextDocument>(); // path -> shared document
	private paneToPath = new Map<string, string>(); // paneId -> committed (active) path
	private paneOpen = new Map<string, string[]>(); // paneId -> open file tabs (order)
	private panePending = new Map<string, string>(); // paneId -> path currently loading
	private paneSeq = new Map<string, number>(); // paneId -> latest bind sequence
	private bindSeq = 0; // monotonic; guards against stale/cancelled binds
	private listeners = new Set<() => void>();
	private rev = 0;

	constructor(private fs: IFileSystem) {}

	/** Ensure a shared document for `path` exists, loading from the FS once. */
	async open(path: string): Promise<TextDocument> {
		const p = normalizePath(path);
		const existing = this.docs.get(p);
		if (existing) {
			return existing;
		}
		const content = await this.fs.readFile(p);
		// A concurrent open() may have created the doc while we awaited the read.
		const raced = this.docs.get(p);
		if (raced) {
			return raced;
		}
		const doc = new TextDocument(p, content);
		this.docs.set(p, doc);
		return doc;
	}

	getDoc(path: string): TextDocument | undefined {
		return this.docs.get(normalizePath(path));
	}

	docForPane(paneId: string): TextDocument | undefined {
		const p = this.paneToPath.get(paneId);
		return p ? this.docs.get(p) : undefined;
	}

	pathForPane(paneId: string): string | undefined {
		// The pending (still-loading) path counts as bound, so a fresh pane isn't
		// treated as empty and a split during load still has a file to inherit.
		return this.paneToPath.get(paneId) ?? this.panePending.get(paneId);
	}

	/**
	 * Open `path` and show it in `paneId`. Cancellation-safe: a newer bindPane or
	 * a releasePane for the same pane invalidates this one, so a load that
	 * resolves after the pane moved on (or closed) is discarded rather than
	 * writing a stale/dead binding. Matters once the FS is a real async backend.
	 */
	async bindPane(paneId: string, path: string): Promise<TextDocument> {
		const seq = ++this.bindSeq;
		const p = normalizePath(path);
		this.paneSeq.set(paneId, seq);
		this.panePending.set(paneId, p);
		this.bump();
		const doc = await this.open(p);
		if (this.paneSeq.get(paneId) !== seq) {
			return doc; // superseded by a newer bind, or the pane was released
		}
		this.paneToPath.set(paneId, doc.path);
		// Track the open-file tab list for this pane (VS Code-style tab strip).
		const open = this.paneOpen.get(paneId) ?? [];
		if (!open.includes(doc.path)) {
			this.paneOpen.set(paneId, [...open, doc.path]);
		}
		if (this.panePending.get(paneId) === p) {
			this.panePending.delete(paneId);
		}
		this.bump();
		return doc;
	}

	/** The open-file tabs for a pane, in order. A stable empty array is returned
	 *  when none are open, so useSyncExternalStore doesn't see a new snapshot
	 *  every render (that would be an infinite loop). */
	openFilesForPane(paneId: string): string[] {
		return this.paneOpen.get(paneId) ?? EMPTY_FILES;
	}

	/** Close one open-file tab. If it was active, activate a neighbour. */
	closeFile(paneId: string, path: string): void {
		const p = normalizePath(path);
		const open = this.paneOpen.get(paneId) ?? [];
		const idx = open.indexOf(p);
		if (idx === -1) return;
		const next = open.filter((x) => x !== p);
		this.paneOpen.set(paneId, next);
		if (this.paneToPath.get(paneId) === p) {
			const neighbour = next[idx] ?? next[idx - 1] ?? next[next.length - 1];
			if (neighbour) {
				void this.bindPane(paneId, neighbour);
			} else {
				this.paneToPath.delete(paneId);
			}
		}
		this.gc();
		this.bump();
	}

	/** Copy one pane's open file to another (used when a pane is split). */
	inheritBinding(fromPaneId: string, toPaneId: string): void {
		const p = this.pathForPane(fromPaneId);
		if (p) {
			void this.bindPane(toPaneId, p);
		}
	}

	/** Release a pane's binding on close; garbage-collect orphaned clean docs. */
	releasePane(paneId: string): void {
		// Dropping the seq entry invalidates any in-flight bind for this pane
		// (its resolution will find no matching seq and discard itself).
		this.paneSeq.delete(paneId);
		this.panePending.delete(paneId);
		this.paneOpen.delete(paneId);
		const had = this.paneToPath.delete(paneId);
		if (had) {
			this.gc();
		}
		this.bump();
	}

	/** Persist a document's contents through the FileSystem. */
	async save(path: string): Promise<void> {
		const doc = this.docs.get(normalizePath(path));
		if (!doc) {
			return;
		}
		await this.fs.writeFile(doc.path, doc.text.toString());
		doc.markSaved();
		this.bump();
	}

	private gc(): void {
		const inUse = new Set(this.paneToPath.values());
		for (const [path, doc] of this.docs) {
			// Keep docs that are still shown, still have a live view, or hold
			// unsaved edits — dropping any of those would lose work.
			if (!inUse.has(path) && doc.viewCount === 0 && !doc.isDirty) {
				this.docs.delete(path);
			}
		}
	}

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	readonly getSnapshot = (): number => this.rev;

	private bump(): void {
		this.rev++;
		for (const l of this.listeners) {
			l();
		}
	}
}

// --- React bindings -------------------------------------------------------

/** The document currently shown in a pane, or null if none is bound yet. */
export function usePaneDoc(paneId: string): TextDocument | null {
	const { editor } = useServices();
	return useSyncExternalStore(editor.subscribe, () => editor.docForPane(paneId) ?? null);
}

/** The path currently shown in a pane (before its document resolves), or undefined. */
export function usePanePath(paneId: string): string | undefined {
	const { editor } = useServices();
	return useSyncExternalStore(editor.subscribe, () => editor.pathForPane(paneId));
}

/** The open-file tabs for a pane (VS Code-style strip). */
export function usePaneOpenFiles(paneId: string): string[] {
	const { editor } = useServices();
	return useSyncExternalStore(editor.subscribe, () => editor.openFilesForPane(paneId));
}

/** A document's dirty (unsaved) state, tracked live. */
export function useDocDirty(doc: TextDocument | null): boolean {
	const subscribe = useCallback((cb: () => void) => (doc ? doc.subscribe(cb) : () => {}), [doc]);
	const getSnapshot = useCallback(() => (doc ? doc.isDirty : false), [doc]);
	return useSyncExternalStore(subscribe, getSnapshot);
}

/** How many panes are currently editing a document (its live view count). */
export function useDocViewCount(doc: TextDocument | null): number {
	const subscribe = useCallback((cb: () => void) => (doc ? doc.subscribe(cb) : () => {}), [doc]);
	const getSnapshot = useCallback(() => (doc ? doc.viewCount : 0), [doc]);
	return useSyncExternalStore(subscribe, getSnapshot);
}
