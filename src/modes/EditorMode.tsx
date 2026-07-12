// ---------------------------------------------------------------------------
// Live Editor — a real CodeMirror 6 buffer bound to this pane.
//
// The pane shows one file; the Explorer (or a split that inherits the binding)
// decides which. Open the same file in two panes and both edit it live — the
// "· N panes" badge shows when a document is shared.
// ---------------------------------------------------------------------------

import { lazy, Suspense, useEffect } from 'react';
import { useServices } from '../services/container';
import { useDocDirty, usePaneDoc, useDocViewCount } from '../services/editorService';
import { Icon } from '../lib/icons';

// The CodeMirror core + language grammars are ~600KB; load them only when an
// editor pane is actually shown, so the shell's first paint stays light.
const CodeMirrorHost = lazy(() => import('../editor/CodeMirrorHost').then((m) => ({ default: m.CodeMirrorHost })));

const DEFAULT_FILE = 'src/App.tsx';

function splitPath(path: string): { name: string; dir: string } {
	const i = path.lastIndexOf('/');
	return i === -1 ? { name: path, dir: '' } : { name: path.slice(i + 1), dir: path.slice(0, i) };
}

export function EditorMode({ paneId }: { paneId: string }) {
	const { editor } = useServices();
	const doc = usePaneDoc(paneId);
	const dirty = useDocDirty(doc);
	const views = useDocViewCount(doc);

	// A fresh editor pane opens a sensible default so it never shows blank code.
	// Panes created by splitting already carry an inherited binding, so this is
	// a no-op for them.
	useEffect(() => {
		if (!editor.pathForPane(paneId)) {
			void editor.bindPane(paneId, DEFAULT_FILE);
		}
	}, [editor, paneId]);

	if (!doc) {
		return (
			<div className="editor empty">
				<div className="editor-empty">
					<Icon.editor />
					<p>Open a file from the Explorer.</p>
				</div>
			</div>
		);
	}

	const { name, dir } = splitPath(doc.path);

	return (
		<div className="editor">
			<div className="editor-tabbar">
				<div className="editor-tab active" title={doc.path}>
					<Icon.file />
					<span className="nm">{name}</span>
					{dirty && <span className="dot" aria-label="Unsaved changes" />}
				</div>
				{views > 1 && (
					<span className="shared" title={`Editing live in ${views} panes`}>
						<Icon.agents />
						{views}
					</span>
				)}
				<span className="sp" />
				{dir && <span className="path">{dir}</span>}
			</div>
			<Suspense fallback={<div className="cm-host" />}>
				<CodeMirrorHost doc={doc} paneId={paneId} onSave={() => void editor.save(doc.path)} />
			</Suspense>
		</div>
	);
}
