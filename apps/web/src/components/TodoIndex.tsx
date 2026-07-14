// TODO/FIXME index (⌘⇧M) — a project-wide list of TODO, FIXME, HACK, XXX and
// NOTE markers, scanned live from the real filesystem. Click a hit to open the
// file and jump to the line. A lightweight "loose ends" surface developers use to
// find the notes they left themselves.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';

interface Hit { path: string; line: number; tag: string; text: string }

const TAG_RE = /\b(TODO|FIXME|HACK|XXX|NOTE)\b[:\s-]*(.*)$/;
const SKIP = /\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|lock)$/i;

async function scan(fs: ReturnType<typeof useServices>['fs']): Promise<Hit[]> {
	const paths = (await fs.list()).filter((p) => !SKIP.test(p));
	const hits: Hit[] = [];
	for (const path of paths) {
		let text: string;
		try {
			text = await fs.readFile(path);
		} catch {
			continue;
		}
		const lines = text.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const m = TAG_RE.exec(lines[i]);
			if (m) hits.push({ path, line: i + 1, tag: m[1], text: (m[2] || '').trim().slice(0, 160) });
		}
	}
	return hits;
}

export function TodoIndex() {
	const { fs, editor } = useServices();
	const [open, setOpen] = useState(false);
	const [hits, setHits] = useState<Hit[]>([]);
	const [q, setQ] = useState('');
	const [cursor, setCursor] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	// Opened by the `workbench.actions.view.problems` command (⌘⇧M by default),
	// dispatched as this event by the keybinding service.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		const onEvt = () => setOpen(true);
		window.addEventListener('keydown', onKey);
		window.addEventListener('velocity:todos', onEvt as EventListener);
		return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('velocity:todos', onEvt as EventListener); };
	}, []);

	useEffect(() => {
		if (!open) return;
		setQ(''); setCursor(0);
		void scan(fs).then(setHits);
		requestAnimationFrame(() => inputRef.current?.focus());
	}, [open, fs]);

	const results = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) return hits;
		return hits.filter((h) => h.text.toLowerCase().includes(needle) || h.tag.toLowerCase().includes(needle) || h.path.toLowerCase().includes(needle));
	}, [hits, q]);

	useEffect(() => { setCursor(0); }, [q]);

	if (!open) return null;

	function choose(h: Hit | undefined) {
		if (!h) return;
		openFileInActivePane(editor, h.path);
		setOpen(false);
		// Let the editor mount/bind before asking it to scroll.
		setTimeout(() => window.dispatchEvent(new CustomEvent('velocity:goto-line', { detail: { path: h.path, line: h.line } })), 60);
	}

	return (
		<div className="qopen-scrim" onMouseDown={() => setOpen(false)}>
			<div className="qopen todo" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="TODO index">
				<div className="qopen-input">
					<Icon.check />
					<input ref={inputRef} value={q} placeholder={`Filter ${hits.length} TODO/FIXME/HACK marker${hits.length === 1 ? '' : 's'}…`} onChange={(e) => setQ(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
							else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
							else if (e.key === 'Enter') { e.preventDefault(); choose(results[cursor]); }
						}} />
					<kbd>esc</kbd>
				</div>
				<div className="qopen-list">
					{results.length === 0 && <div className="qopen-empty">No markers found.</div>}
					{results.map((h, i) => (
						<button key={`${h.path}:${h.line}`} className={`qopen-row todo-row${i === cursor ? ' on' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => choose(h)}>
							<span className={`todo-tag t-${h.tag.toLowerCase()}`}>{h.tag}</span>
							<span className="qopen-name">{h.text || <em>(no description)</em>}</span>
							<span className="qopen-dir">{h.path}:{h.line}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
