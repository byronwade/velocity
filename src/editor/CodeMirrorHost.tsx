// ---------------------------------------------------------------------------
// CodeMirrorHost — mounts one real EditorView for a (document, pane) pair.
//
// The view initializes from the shared document's current text and attaches to
// it, so a second pane opened on the same file is in sync from first paint.
// Local edits are forwarded to the document, which replays them into sibling
// views. Changes that arrive FROM the document are annotated and skipped here,
// so there is no echo.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import {
	crosshairCursor,
	drawSelection,
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { fromDocument, type TextDocument } from '../services/document';
import { useServices } from '../services/container';
import { editorTheme } from './theme';
import { languageForPath } from './languages';
import { getEditorPrefs, subscribeEditorPrefs, type EditorPrefs } from '../services/editorPrefs';
import { richEditing } from './richEditing';
import { setActiveEditor, clearActiveEditor } from './activeView';

// Reconfigurable slice for user editor preferences (font size, tab width, word
// wrap). One Compartment marker is reused across views; each view reconfigures
// its own state when prefs change.
const prefsCompartment = new Compartment();

function prefsExtensions(prefs: EditorPrefs) {
	return [
		EditorState.tabSize.of(prefs.tabSize),
		// Target .cm-scroller (more specific than the base theme's `&` rule) so the
		// user's font size always wins regardless of theme-injection order.
		EditorView.theme({ '.cm-scroller': { fontSize: `${prefs.fontSize}px` } }),
		prefs.wordWrap ? EditorView.lineWrapping : [],
	];
}

// A basicSetup-equivalent, assembled explicitly so the bundle carries only what
// we use. Shared across views (CodeMirror dedupes extension descriptors).
const baseExtensions = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	drawSelection(),
	dropCursor(),
	EditorState.allowMultipleSelections.of(true),
	indentOnInput(),
	bracketMatching(),
	richEditing,
	closeBrackets(),
	autocompletion(),
	rectangularSelection(),
	crosshairCursor(),
	highlightActiveLine(),
	highlightSelectionMatches(),
	keymap.of([
		...closeBracketsKeymap,
		...defaultKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap,
		indentWithTab,
	]),
];

export interface CursorInfo {
	line: number;
	col: number;
	selLen: number;
	ranges: number;
	lines: number;
}

export function CodeMirrorHost({ doc, paneId, onSave, onCursor }: { doc: TextDocument; paneId: string; onSave: () => void; onCursor?: (info: CursorInfo) => void }) {
	const hostRef = useRef<HTMLDivElement>(null);
	const { collab } = useServices();
	// Track the latest callbacks without tearing down the view on every render.
	const saveRef = useRef(onSave);
	saveRef.current = onSave;
	const cursorRef = useRef(onCursor);
	cursorRef.current = onCursor;

	useEffect(() => {
		const parent = hostRef.current;
		if (!parent) {
			return;
		}

		// Report cursor line/column + selection to the status bar.
		const cursorReporter = EditorView.updateListener.of((update) => {
			if (!update.selectionSet && !update.docChanged) {
				return;
			}
			const cb = cursorRef.current;
			if (!cb) {
				return;
			}
			const sel = update.state.selection;
			const head = sel.main.head;
			const lineObj = update.state.doc.lineAt(head);
			cb({
				line: lineObj.number,
				col: head - lineObj.from + 1,
				selLen: sel.ranges.reduce((n, r) => n + (r.to - r.from), 0),
				ranges: sel.ranges.length,
				lines: update.state.doc.lines,
			});
		});

		// Forward local edits to the shared document; ignore edits it replayed to us.
		const forward = EditorView.updateListener.of((update) => {
			if (!update.docChanged) {
				return;
			}
			for (const tr of update.transactions) {
				if (tr.docChanged && !tr.annotation(fromDocument)) {
					doc.ingest(tr.changes, update.view);
				}
			}
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: doc.text,
				extensions: [baseExtensions, cursorReporter, languageForPath(doc.path), editorTheme, prefsCompartment.of(prefsExtensions(getEditorPrefs())), collab(doc, paneId), forward],
			}),
			parent,
		});
		doc.attach(view);

		// Register this view as the active editor whenever it holds focus, so the
		// keybinding service's editor commands (save, format, multi-cursor, …) act
		// on it. The reference persists after blur (commands from menus still work).
		const markActive = () => setActiveEditor({ view, path: doc.path, save: () => saveRef.current() });
		view.dom.addEventListener('focusin', markActive);
		if (view.hasFocus) markActive();

		// Live-apply preference changes (font size / tab size / word wrap) to this
		// view without recreating it.
		const unsub = subscribeEditorPrefs(() => {
			view.dispatch({ effects: prefsCompartment.reconfigure(prefsExtensions(getEditorPrefs())) });
		});

		// Jump to a 1-based line when asked (e.g. from the TODO index / search).
		const onGoto = (e: Event) => {
			const { path, line } = (e as CustomEvent<{ path: string; line: number }>).detail;
			if (path !== doc.path) return;
			const n = Math.max(1, Math.min(view.state.doc.lines, line));
			const info = view.state.doc.line(n);
			view.dispatch({ selection: { anchor: info.from }, effects: EditorView.scrollIntoView(info.from, { y: 'center' }) });
			view.focus();
		};
		window.addEventListener('velocity:goto-line', onGoto as EventListener);

		return () => {
			unsub();
			window.removeEventListener('velocity:goto-line', onGoto as EventListener);
			view.dom.removeEventListener('focusin', markActive);
			clearActiveEditor(view);
			doc.detach(view);
			view.destroy();
		};
	}, [doc, paneId, collab]);

	return <div ref={hostRef} className="cm-host" />;
}
