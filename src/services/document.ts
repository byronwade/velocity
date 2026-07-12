// ---------------------------------------------------------------------------
// TextDocument — the authoritative, editable buffer for one file.
//
// A single TextDocument backs every pane showing the same path. Each pane owns
// its own CodeMirror EditorView (its own cursor, selection, scroll and undo
// history), but they share ONE source of truth: this document's `Text`. When a
// view edits, it hands the change here; the document applies it and fans it out
// to every sibling view. Same thread, synchronous, so all views converge before
// the next edit — the honest, working core that a network CRDT later replaces.
// ---------------------------------------------------------------------------

import { Annotation, type ChangeSet, Text } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/**
 * Marks a transaction as originating from the shared document (a peer view's
 * edit replayed into this one), so a view's change forwarder never echoes it
 * back and no feedback loop forms.
 */
export const fromDocument = Annotation.define<boolean>();

export class TextDocument {
	readonly path: string;
	private _text: Text;
	private _saved: Text; // last persisted contents — drives dirty state (and the future git base)
	private _version = 0;
	private views = new Set<EditorView>();
	private listeners = new Set<() => void>();

	constructor(path: string, initial: string) {
		this.path = path;
		this._text = Text.of(initial.length ? initial.split('\n') : ['']);
		this._saved = this._text;
	}

	get text(): Text {
		return this._text;
	}
	get version(): number {
		return this._version;
	}
	get isDirty(): boolean {
		return !this._text.eq(this._saved);
	}
	get lineCount(): number {
		return this._text.lines;
	}
	get viewCount(): number {
		return this.views.size;
	}

	/** Register a view. The view is initialized by its host from `this.text`. */
	attach(view: EditorView): void {
		this.views.add(view);
		this.emit();
	}

	/** Unregister a view (on pane close / unmount). */
	detach(view: EditorView): void {
		this.views.delete(view);
		this.emit();
	}

	/**
	 * Apply local `changes` produced by `origin` to the authoritative text, then
	 * replay them into every OTHER attached view. Empty changesets are ignored.
	 */
	ingest(changes: ChangeSet, origin: EditorView | null): void {
		if (changes.empty) {
			return;
		}
		this._text = changes.apply(this._text);
		this._version++;
		for (const v of this.views) {
			if (v !== origin) {
				v.dispatch({ changes, annotations: fromDocument.of(true) });
			}
		}
		this.emit();
	}

	/** Mark the current contents as persisted (called after a successful save). */
	markSaved(): void {
		this._saved = this._text;
		this.emit();
	}

	/** Subscribe to state changes (dirty toggle, version bump, view attach/detach). */
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private emit(): void {
		for (const l of this.listeners) {
			l();
		}
	}
}
