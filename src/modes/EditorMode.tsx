// ---------------------------------------------------------------------------
// Live Editor — a real CodeMirror 6 buffer bound to this pane.
//
// The pane shows one file; the Explorer (or a split that inherits the binding)
// decides which. Open the same file in two panes and both edit it live — the
// "· N panes" badge shows when a document is shared.
// ---------------------------------------------------------------------------

import { lazy, Suspense, useEffect, useState } from 'react';
import { useServices } from '../services/container';
import { useDocDirty, usePaneDoc, useDocViewCount } from '../services/editorService';
import { languageName } from '../editor/languages';
import { Icon } from '../lib/icons';
import type { CursorInfo } from '../editor/CodeMirrorHost';

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
	const [cursor, setCursor] = useState<CursorInfo | null>(null);

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
	const crumbs = doc.path.split('/');

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
						<Icon.splitRight />
						{views}
					</span>
				)}
				<span className="sp" />
			</div>
			{/* breadcrumbs (VS Code / Zed style) */}
			<div className="editor-crumbs" aria-label="Breadcrumbs">
				{crumbs.map((c, i) => (
					<span key={i} className="crumb">
						{i > 0 && <Icon.forward />}
						<span className={i === crumbs.length - 1 ? 'leaf' : ''}>{c}</span>
					</span>
				))}
			</div>
			<Suspense fallback={<div className="cm-host cm-skeleton" aria-hidden />}>
				<CodeMirrorHost doc={doc} paneId={paneId} onSave={() => void editor.save(doc.path)} onCursor={setCursor} />
			</Suspense>
			{/* status bar (VS Code / Cursor / Zed style) */}
			<div className="editor-status">
				<span className="es-left">
					{dir && <span className="es-item">{dir}</span>}
				</span>
				<span className="sp" />
				<span className="es-item">{cursor ? `Ln ${cursor.line}, Col ${cursor.col}` : 'Ln 1, Col 1'}</span>
				{cursor && cursor.selLen > 0 && <span className="es-item">{`(${cursor.selLen} selected)`}</span>}
				{cursor && cursor.ranges > 1 && <span className="es-item">{`${cursor.ranges} cursors`}</span>}
				<span className="es-item">Spaces: 2</span>
				<span className="es-item">UTF-8</span>
				<span className="es-item">LF</span>
				<span className="es-item es-lang">{languageName(doc.path)}</span>
				{dirty ? <span className="es-item es-dirty">● Unsaved</span> : <span className="es-item">Saved</span>}
			</div>
		</div>
	);
}
