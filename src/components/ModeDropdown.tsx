import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShell } from '../lib/store';
import { MODES, type Mode } from '../lib/types';
import { MODE_DEFS } from '../modes/registry';
import { Icon } from '../lib/icons';

/** The primary mode switcher. Sets the ACTIVE pane's mode; preserves the tab + its layout. */
export function ModeDropdown({ activeMode }: { activeMode: Mode }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [cursor, setCursor] = useState(0);
	const btnRef = useRef<HTMLButtonElement>(null);
	const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

	const setPaneMode = useShell((s) => s.setPaneMode);
	const activePaneId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]).activePaneId);

	const def = MODE_DEFS[activeMode];
	const Glyph = Icon[def.icon];

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		const list = MODES.filter((m) => !q || MODE_DEFS[m].name.toLowerCase().includes(q) || MODE_DEFS[m].blurb.toLowerCase().includes(q));
		return list;
	}, [query]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const r = btnRef.current?.getBoundingClientRect();
		if (r) {
			setPos({ left: r.left + r.width / 2 - 170, top: r.bottom + 8 });
		}
		setQuery('');
		setCursor(0);
	}, [open]);

	useEffect(() => {
		if (!open) {
			return;
		}
		function onDoc(e: MouseEvent) {
			if (!(e.target as HTMLElement).closest('.modemenu') && !(e.target as HTMLElement).closest('.modebtn')) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [open]);

	function choose(m: Mode) {
		setPaneMode(activePaneId, m);
		setOpen(false);
		btnRef.current?.focus();
	}

	function onKey(e: React.KeyboardEvent) {
		if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
		else if (e.key === 'Enter') { e.preventDefault(); if (results[cursor]) { choose(results[cursor]); } }
		else if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
	}

	return (
		<>
			<button ref={btnRef} className="modebtn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
				<span className="mo"><Glyph /></span>
				<span>{def.name}</span>
				<span className="chev"><Icon.chevron /></span>
			</button>
			{open && createPortal(
				<div className="modemenu" style={{ left: pos.left, top: pos.top }} onKeyDown={onKey}>
					<div className="filter">
						<Icon.search />
						<input
							autoFocus
							role="combobox"
							aria-expanded
							aria-controls="velocity-mode-listbox"
							aria-autocomplete="list"
							aria-activedescendant={results[cursor] ? `mode-opt-${results[cursor]}` : undefined}
							placeholder="Switch mode…"
							value={query}
							onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
						/>
					</div>
					<div className="sep" />
					<div role="listbox" id="velocity-mode-listbox" aria-label="Modes">
						{results.map((m, i) => {
							const d = MODE_DEFS[m];
							const MG = Icon[d.icon];
							return (
								<div
									key={m}
									id={`mode-opt-${m}`}
									role="option"
									aria-selected={m === activeMode}
									className={`mode-item${m === activeMode ? ' on' : ''}${i === cursor ? ' cursor' : ''}`}
									onMouseEnter={() => setCursor(i)}
									onClick={() => choose(m)}
								>
									<span className="ic"><MG /></span>
									<div><div className="t">{d.name}</div><div className="d">{d.blurb}</div></div>
									<span className="kb">⌘{MODES.indexOf(m) + 1}</span>
								</div>
							);
						})}
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}
