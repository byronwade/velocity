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
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
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

export function CodeMirrorHost({ doc, paneId, onSave }: { doc: TextDocument; paneId: string; onSave: () => void }) {
	const hostRef = useRef<HTMLDivElement>(null);
	const { collab } = useServices();
	// Track the latest onSave without tearing down the view on every render.
	const saveRef = useRef(onSave);
	saveRef.current = onSave;

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
		]);

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
				extensions: [baseExtensions, saveKeymap, languageForPath(doc.path), editorTheme, collab(doc, paneId), forward],
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
