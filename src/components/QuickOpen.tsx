// Quick Open (⌘P / Ctrl-P) — the fast fuzzy file switcher developers live in.
// Subsequence fuzzy match + ranking over the real workspace file list; Enter or
// click opens the file in the active editor pane.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { getRecent, recentRank } from '../lib/recentFiles';
import { Icon } from '../lib/icons';

function basename(p: string): string {
	const i = p.lastIndexOf('/');
	return i === -1 ? p : p.slice(i + 1);
}

/** Subsequence fuzzy score: lower is better; null if `q` isn't a subsequence. */
function score(path: string, q: string): number | null {
	if (!q) return 0;
	const hay = path.toLowerCase();
	let qi = 0, si = 0, gaps = 0, last = -1;
	while (qi < q.length && si < hay.length) {
		if (hay[si] === q[qi]) {
			if (last >= 0) gaps += si - last - 1;
			last = si;
			qi++;
		}
		si++;
	}
	if (qi < q.length) return null;
	// Bonus for matches in the basename.
	const base = basename(hay);
	const inBase = base.includes(q) ? -40 : 0;
	return gaps + inBase + path.length * 0.01;
}

export function QuickOpen() {
	const { fs, editor } = useServices();
	const [open, setOpen] = useState(false);
	const [files, setFiles] = useState<string[]>([]);
	const [query, setQuery] = useState('');
	const [cursor, setCursor] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	// Opened by the quick-open / recent-files commands (⌘P / ⌘E by default), which
	// the central keybinding service dispatches as this event.
	useEffect(() => {
		const open = () => setOpen(true);
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		window.addEventListener('velocity:quickopen', open as EventListener);
		window.addEventListener('keydown', onKey);
		return () => { window.removeEventListener('velocity:quickopen', open as EventListener); window.removeEventListener('keydown', onKey); };
	}, []);

	useEffect(() => {
		if (!open) return;
		void fs.list().then(setFiles);
		setQuery('');
		setCursor(0);
		requestAnimationFrame(() => inputRef.current?.focus());
	}, [open, fs]);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		// Empty query: lead with recently-used files (newest first), then the rest
		// of the tree. This is what makes ⌘P/⌘E feel like a recent-files switcher.
		if (!q) {
			const set = new Set(files);
			const recents = getRecent().filter((p) => set.has(p));
			const recentSet = new Set(recents);
			return [...recents, ...files.filter((p) => !recentSet.has(p))].slice(0, 40);
		}
		// Typed query: fuzzy score, with a small tie-breaking nudge toward recents.
		return files
			.map((p) => ({ p, s: score(p, q) }))
			.filter((r): r is { p: string; s: number } => r.s !== null)
			.map((r) => ({ p: r.p, s: r.s - (recentRank(r.p) < 8 ? (8 - recentRank(r.p)) * 0.5 : 0) }))
			.sort((a, b) => a.s - b.s)
			.slice(0, 40)
			.map((r) => r.p);
	}, [files, query]);

	useEffect(() => { setCursor(0); }, [query]);

	if (!open) return null;

	function choose(path: string | undefined) {
		if (!path) return;
		openFileInActivePane(editor, path);
		setOpen(false);
	}

	return (
		<div className="qopen-scrim" onMouseDown={() => setOpen(false)}>
			<div className="qopen" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Quick open">
				<div className="qopen-input">
					<Icon.file />
					<input
						ref={inputRef}
						value={query}
						placeholder="Go to file… (recent files first)"
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
							else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
							else if (e.key === 'Enter') { e.preventDefault(); choose(results[cursor]); }
						}}
					/>
					<kbd>esc</kbd>
				</div>
				<div className="qopen-list">
					{results.length === 0 && <div className="qopen-empty">No files match.</div>}
					{results.map((p, i) => {
						const slash = p.lastIndexOf('/');
						return (
							<button key={p} className={`qopen-row${i === cursor ? ' on' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => choose(p)}>
								<Icon.file />
								<span className="qopen-name">{slash === -1 ? p : p.slice(slash + 1)}</span>
								{slash !== -1 && <span className="qopen-dir">{p.slice(0, slash)}</span>}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
