import { useEffect, useState } from 'react';
import { useShell } from './lib/store';
import { leaves } from './lib/tree';
import { AgentPanel } from './components/AgentPanel';
import { AppsPanel } from './components/AppsPanel';
import { CommandPalette } from './components/CommandPalette';
import { APP_MODES } from './lib/types';
import { getServices } from './services/container';
import { closeTabWithCleanup } from './lib/closeTab';
import { Icon } from './lib/icons';

const RAIL_WIDTH = 0;

/** Draggable divider between the agent brain and the apps panel.
 *  During the drag we write `--brain-w` straight to the `.app` element on a
 *  requestAnimationFrame, and only commit the final width to the store on
 *  release — so dragging never triggers a React re-render per mouse move. */
function BrainResizer() {
	const setBrainWidth = useShell((s) => s.setBrainWidth);
	const [drag, setDrag] = useState(false);
	function onDown(e: React.PointerEvent) {
		e.preventDefault();
		const app = (e.currentTarget as HTMLElement).closest('.app') as HTMLElement | null;
		setDrag(true);
		let latest = 0;
		let raf = 0;
		const paint = () => {
			raf = 0;
			app?.style.setProperty('--brain-w', `${latest}px`);
		};
		const move = (ev: PointerEvent) => {
			latest = Math.max(240, Math.min(760, ev.clientX - RAIL_WIDTH));
			if (!raf) raf = requestAnimationFrame(paint);
		};
		const up = () => {
			setDrag(false);
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			if (latest) setBrainWidth(latest);
		};
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}
	return <div className={`brain-resizer${drag ? ' dragging' : ''}`} role="separator" aria-orientation="vertical" aria-label="Resize agent panel" onPointerDown={onDown} />;
}

export function App() {
	const theme = useShell((s) => s.theme);
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);

	// Apply theme to <html>. A `?theme=` query param overrides once on load.
	useEffect(() => {
		const q = new URLSearchParams(location.search).get('theme');
		if (q === 'light' || q === 'dark') {
			useShell.getState().setTheme(q);
		}
	}, []);

	// Warm the CodeMirror chunk during idle so the first file open is instant
	// instead of paying the lazy-load cost inline. requestIdleCallback where
	// available (falls back to a timer on Safari).
	useEffect(() => {
		const warm = () => { void import('./editor/CodeMirrorHost'); };
		const ric = window.requestIdleCallback;
		if (ric) {
			const id = ric(warm, { timeout: 2500 });
			return () => window.cancelIdleCallback?.(id);
		}
		const id = window.setTimeout(warm, 900);
		return () => window.clearTimeout(id);
	}, []);
	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		document.documentElement.style.colorScheme = theme;
	}, [theme]);

	// Global keyboard shortcuts.
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;
			if (!mod) {
				return;
			}
			const s = useShell.getState();
			const tab = s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
			if (e.key === 't') { e.preventDefault(); s.addTab(); }
			else if (e.key === 'b') { e.preventDefault(); s.toggleBrain(); }
			else if (e.key === 'w') { e.preventDefault(); closeTabWithCleanup(s.activeTabId); }
			else if (e.key === 'Enter') { e.preventDefault(); s.toggleMaximizePane(tab.activePaneId); }
			else if (e.code === 'Backslash') {
				e.preventDefault();
				const from = tab.activePaneId;
				s.splitPane(from, e.shiftKey ? 'col' : 'row');
				const after = useShell.getState();
				const at = after.tabs.find((x) => x.id === after.activeTabId) ?? after.tabs[0];
				getServices().editor.inheritBinding(from, at.activePaneId);
			}
			else if (e.key >= '1' && e.key <= '9') {
				e.preventDefault();
				// ⌘1–4 switch the active pane between app modes.
				const i = Number(e.key) - 1;
				if (i < APP_MODES.length) { s.setPaneMode(tab.activePaneId, APP_MODES[i]); }
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const brainWidth = useShell((s) => s.brainWidth);
	const brainCollapsed = useShell((s) => s.brainCollapsed);
	const toggleBrain = useShell((s) => s.toggleBrain);

	// Guard: if the persisted active pane no longer exists, fall back to the first leaf.
	const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const activeExists = leaves(tab.tree).some((l) => l.pane.id === tab.activePaneId);
	useEffect(() => {
		if (!activeExists) {
			useShell.getState().setActivePane(leaves(tab.tree)[0].pane.id);
		}
	}, [activeExists, tab.tree]);

	return (
		<div className={`app v0${brainCollapsed ? ' brain-collapsed' : ''}`} style={{ ['--brain-w' as string]: `${brainWidth}px` }}>
			<AgentPanel />
			{!brainCollapsed && <BrainResizer />}
			{brainCollapsed && (
				<button className="brain-reopen" onClick={toggleBrain} title="Show panel (⌘B)" aria-label="Show panel">
					<Icon.panelLeft />
				</button>
			)}
			<AppsPanel />
			<CommandPalette />
		</div>
	);
}
