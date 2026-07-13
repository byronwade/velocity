// The account / settings menu — a single home in the header for the theme
// toggle, command palette, and settings, restoring the user menu that lived on
// the (now-removed) icon rail and consolidating loose top-bar buttons.

import { useEffect, useRef, useState } from 'react';
import { useShell } from '../lib/store';
import { MemoryPanel } from './MemoryPanel';
import { EditorSettings } from './EditorSettings';
import { Icon } from '../lib/icons';

export function HeaderMenu() {
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	const [open, setOpen] = useState(false);
	const [memoryOpen, setMemoryOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
		const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		document.addEventListener('mousedown', close);
		document.addEventListener('keydown', esc);
		return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
	}, [open]);

	function openPalette() {
		setOpen(false);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
	}

	return (
		<div className="hmenu" ref={ref}>
			<button className="who" title="Byron Wade" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>B</button>
			{open && (
				<div className="hmenu-pop" role="menu">
					<div className="hmenu-id">
						<span className="who lg">B</span>
						<div><div className="hmenu-name">Byron Wade</div><div className="hmenu-mail">bcw1995@gmail.com</div></div>
					</div>
					<div className="hmenu-sep" />
					<button className="hmenu-row" onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); }}>
						{theme === 'dark' ? <Icon.sun /> : <Icon.moon />}
						<span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
					</button>
					<button className="hmenu-row" onClick={openPalette}>
						<Icon.command /><span>Command palette</span><kbd>⌘K</kbd>
					</button>
					<button className="hmenu-row" onClick={() => { setOpen(false); window.dispatchEvent(new Event('velocity:shortcuts')); }}>
						<Icon.command /><span>Keyboard shortcuts</span><kbd>⌘/</kbd>
					</button>
					<button className="hmenu-row" onClick={() => { setOpen(false); setMemoryOpen(true); }}><Icon.sparkle /><span>Agent memory</span></button>
					<button className="hmenu-row" onClick={() => { setOpen(false); setSettingsOpen(true); }}><Icon.settings /><span>Editor settings</span></button>
					<div className="hmenu-sep" />
					<button className="hmenu-row"><Icon.invite /><span>Sign out</span></button>
				</div>
			)}
			{memoryOpen && <MemoryPanel onClose={() => setMemoryOpen(false)} />}
			{settingsOpen && <EditorSettings onClose={() => setSettingsOpen(false)} />}
		</div>
	);
}
