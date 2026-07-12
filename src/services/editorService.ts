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

export class EditorService {
	private docs = new Map<string, TextDocument>(); // path -> shared document
	private paneToPath = new Map<string, string>(); // paneId -> path
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
		return this.paneToPath.get(paneId);
	}

	/** Open `path` and show it in `paneId`. */
	async bindPane(paneId: string, path: string): Promise<TextDocument> {
		const doc = await this.open(path);
		this.paneToPath.set(paneId, doc.path);
		this.bump();
		return doc;
	}

	/** Copy one pane's open file to another (used when a pane is split). */
	inheritBinding(fromPaneId: string, toPaneId: string): void {
		const p = this.paneToPath.get(fromPaneId);
		if (p) {
			this.paneToPath.set(toPaneId, p);
			this.bump();
		}
	}

	/** Release a pane's binding on close; garbage-collect orphaned clean docs. */
	releasePane(paneId: string): void {
		if (!this.paneToPath.delete(paneId)) {
			return;
		}
		this.gc();
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
