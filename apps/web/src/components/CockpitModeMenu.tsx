// The primary mode switcher, promoted to the top bar (Framer "Canvas ▾" style)
// now that the left icon rail is gone. Shows the current cockpit mode and opens
// a menu of all modes; choosing one sets the lens and switches the stage.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShell } from '../lib/store';
import { COCKPIT_MODES } from '../lib/types';
import { MODE_META, applyCockpitMode } from './ModeRail';
import { Icon } from '../lib/icons';

export function CockpitModeMenu() {
	const cockpitMode = useShell((s) => s.cockpitMode);
	const [open, setOpen] = useState(false);
	const btnRef = useRef<HTMLButtonElement>(null);
	const [pos, setPos] = useState({ left: 0, top: 0 });

	const meta = MODE_META[cockpitMode];
	const Glyph = Icon[meta.icon];

	useEffect(() => {
		if (!open) return;
		const r = btnRef.current?.getBoundingClientRect();
		if (r) setPos({ left: r.left, top: r.bottom + 6 });
		const onDoc = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.modemenu') && !(e.target as HTMLElement).closest('.cockpitbtn')) setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [open]);

	return (
		<>
			<button ref={btnRef} className="cockpitbtn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title="Switch mode">
				<span className="mo"><Glyph /></span>
				<span className="cm-name">{meta.name}</span>
				<span className="chev"><Icon.chevron /></span>
			</button>
			{open && createPortal(
				<div className="modemenu" style={{ left: pos.left, top: pos.top }} role="menu">
					<div className="modemenu-grid">
						{COCKPIT_MODES.map((m) => {
							const d = MODE_META[m];
							const MG = Icon[d.icon];
							return (
								<button
									key={m}
									role="menuitem"
									className={`mode-item${m === cockpitMode ? ' on' : ''}`}
									onClick={() => { applyCockpitMode(m); setOpen(false); }}
								>
									<span className="ic"><MG /></span>
									<span className="t">{d.name}</span>
								</button>
							);
						})}
					</div>
				</div>,
				document.body,
			)}
		</>
	);
}
