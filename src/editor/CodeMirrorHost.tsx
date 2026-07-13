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
import { EditorState } from '@codemirror/state';
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
import { highlightSelectionMatches, searchKeymap, gotoLine } from '@codemirror/search';
import { fromDocument, type TextDocument } from '../services/document';
import { useServices } from '../services/container';
import { editorTheme } from './theme';
import { languageForPath } from './languages';

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

		const saveKeymap = keymap.of([
			{
				key: 'Mod-s',
				preventDefault: true,
				run: () => {
					saveRef.current();
					return true;
				},
			},
			{ key: 'Mod-g', preventDefault: true, run: gotoLine },
		]);

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
				extensions: [baseExtensions, saveKeymap, cursorReporter, languageForPath(doc.path), editorTheme, collab(doc, paneId), forward],
			}),
			parent,
		});
		doc.attach(view);

		return () => {
			doc.detach(view);
			view.destroy();
		};
	}, [doc, paneId, collab]);

	return <div ref={hostRef} className="cm-host" />;
}
