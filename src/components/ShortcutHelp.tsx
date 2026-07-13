// Keyboard-shortcut cheatsheet (⌘/) — a searchable overlay of every binding in
// the app. Discovery matters: it's how developers find the multi-cursor, split,
// and palette shortcuts they'd otherwise never learn. Opened with ⌘/ or from the
// account menu; listens for a `velocity:shortcuts` event so other surfaces can
// pop it open too.

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../lib/icons';

interface Shortcut { keys: string[]; label: string }
interface Group { name: string; items: Shortcut[] }

// Displayed with the platform's modifier glyphs; the underlying handlers accept
// both ⌘ (metaKey) and Ctrl, so the labels adapt to the OS.
const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const GROUPS: Group[] = [
	{
		name: 'General',
		items: [
			{ keys: [MOD, 'K'], label: 'Command palette' },
			{ keys: [MOD, 'P'], label: 'Quick open file' },
			{ keys: [MOD, 'E'], label: 'Recent files' },
			{ keys: [MOD, 'J'], label: 'Focus the agent command bar' },
			{ keys: [MOD, '/'], label: 'Keyboard shortcuts (this panel)' },
			{ keys: [MOD, '⇧', 'M'], label: 'TODO / FIXME index' },
			{ keys: [MOD, 'B'], label: 'Toggle the side panel' },
		],
	},
	{
		name: 'Tabs & panes',
		items: [
			{ keys: [MOD, 'T'], label: 'New tab' },
			{ keys: [MOD, 'W'], label: 'Close tab' },
			{ keys: [MOD, '\\'], label: 'Split pane right' },
			{ keys: [MOD, '⇧', '\\'], label: 'Split pane down' },
			{ keys: [MOD, '↵'], label: 'Maximize / restore pane' },
			{ keys: [MOD, '1–9'], label: 'Switch the pane between modes' },
		],
	},
	{
		name: 'Editor',
		items: [
			{ keys: [MOD, 'S'], label: 'Save file (formats if enabled)' },
			{ keys: ['⇧', 'Alt', 'F'], label: 'Format document' },
			{ keys: [MOD, 'F'], label: 'Find in file' },
			{ keys: [MOD, 'G'], label: 'Go to line' },
			{ keys: [MOD, 'D'], label: 'Select next occurrence' },
			{ keys: [MOD, '⇧', 'L'], label: 'Select all occurrences' },
			{ keys: ['Alt', 'Click'], label: 'Add a cursor' },
			{ keys: [MOD, '/'], label: 'Toggle line comment' },
		],
	},
];

export function ShortcutHelp() {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === '/') {
				// Only when no editor/input is focused — inside CodeMirror ⌘/ comments.
				const el = document.activeElement;
				const inEditor = el?.closest('.cm-host') || el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA';
				if (inEditor) return;
				e.preventDefault();
				setOpen((o) => !o);
			} else if (e.key === 'Escape') {
				setOpen(false);
			}
		};
		const onEvt = () => setOpen(true);
		window.addEventListener('keydown', onKey);
		window.addEventListener('velocity:shortcuts', onEvt as EventListener);
		return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('velocity:shortcuts', onEvt as EventListener); };
	}, []);

	useEffect(() => { if (open) setQ(''); }, [open]);

	const groups = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) return GROUPS;
		return GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(needle)) })).filter((g) => g.items.length);
	}, [q]);

	if (!open) return null;

	return (
		<div className="modal-scrim" onMouseDown={() => setOpen(false)}>
			<div className="kbd-help" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
				<div className="kbd-head">
					<span><Icon.command />Keyboard shortcuts</span>
					<button className="mem-close" onClick={() => setOpen(false)} aria-label="Close"><Icon.close /></button>
				</div>
				<div className="kbd-search">
					<Icon.search />
					<input autoFocus value={q} placeholder="Filter shortcuts…" onChange={(e) => setQ(e.target.value)} />
				</div>
				<div className="kbd-cols">
					{groups.map((g) => (
						<div className="kbd-group" key={g.name}>
							<div className="kbd-group-name">{g.name}</div>
							{g.items.map((s) => (
								<div className="kbd-row" key={s.label}>
									<span className="kbd-label">{s.label}</span>
									<span className="kbd-keys">{s.keys.map((k, i) => <kbd key={i}>{k}</kbd>)}</span>
								</div>
							))}
						</div>
					))}
					{groups.length === 0 && <div className="kbd-empty">No shortcuts match.</div>}
				</div>
			</div>
		</div>
	);
}
