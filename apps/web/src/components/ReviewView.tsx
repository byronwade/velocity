// The review studio — a real, Git-style working-tree diff.
//
// Reads the ReviewService (live file system vs the project baseline) and renders
// each changed file with a line-by-line unified diff. Files expand/collapse;
// clicking a filename opens it in the editor. This is the document's "line-by-
// line and visual diff review", over genuine changes.

import { useMemo, useState } from 'react';
import { useReview } from '../services/review';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { basename } from '../lib/graph';
import { Icon } from '../lib/icons';
import type { FileDiff } from '../lib/diff';

const STATUS_LABEL: Record<FileDiff['status'], string> = { added: 'A', modified: 'M', deleted: 'D' };

function DiffBody({ file }: { file: FileDiff }) {
	return (
		<div className="diff">
			{file.lines.map((l, i) => {
				if (l.type === 'gap') {
					return <div className="dl gap" key={i}><span className="dsym" /><span className="dtx">⋯ {l.text}</span></div>;
				}
				const sym = l.type === 'add' ? '+' : l.type === 'del' ? '−' : '';
				return (
					<div className={`dl ${l.type}`} key={i}>
						<span className="dsym">{sym}</span>
						<span className="dtx">{l.text || ' '}</span>
					</div>
				);
			})}
		</div>
	);
}

export function ReviewView() {
	const files = useReview();
	const { editor } = useServices();
	// Expand the first few files by default; remember explicit toggles.
	const initial = useMemo(() => new Set(files.slice(0, 2).map((f) => f.path)), [files]);
	const [expanded, setExpanded] = useState<Set<string> | null>(null);
	const open = expanded ?? initial;

	function toggle(path: string) {
		const next = new Set(open);
		if (next.has(path)) { next.delete(path); } else { next.add(path); }
		setExpanded(next);
	}

	if (files.length === 0) {
		return <div className="brain-empty">No changes yet.<br />Edits to the workspace show here as a diff against the baseline.</div>;
	}

	const added = files.reduce((s, f) => s + f.added, 0);
	const removed = files.reduce((s, f) => s + f.removed, 0);

	return (
		<div className="review">
			<div className="review-head">
				<span>{files.length} file{files.length === 1 ? '' : 's'} changed</span>
				<span className="rh-stat"><b className="add">+{added}</b> <b className="del">−{removed}</b></span>
			</div>
			<div className="review-list">
				{files.map((f) => {
					const isOpen = open.has(f.path);
					return (
						<div className={`rfile${isOpen ? ' open' : ''}`} key={f.path}>
							<div className="rf-head">
								<button className="rf-toggle" onClick={() => toggle(f.path)} aria-expanded={isOpen} aria-label={isOpen ? 'Collapse' : 'Expand'}>
									<span className="rf-chev"><Icon.chevron /></span>
									<span className={`rf-badge b-${f.status}`}>{STATUS_LABEL[f.status]}</span>
									<span className="rf-name" title={f.path}>{basename(f.path)}</span>
								</button>
								<span className="rf-stat"><b className="add">+{f.added}</b> <b className="del">−{f.removed}</b></span>
								{f.status !== 'deleted' && (
									<button className="rf-open" title="Open in editor" aria-label="Open in editor" onClick={() => openFileInActivePane(editor, f.path)}><Icon.editor /></button>
								)}
							</div>
							{isOpen && <DiffBody file={f} />}
						</div>
					);
				})}
			</div>
		</div>
	);
}
