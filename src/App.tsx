import { useEffect, useState } from 'react';
import { useShell } from './lib/store';
import { leaves } from './lib/tree';
import { ModeRail } from './components/ModeRail';
import { AgentPanel } from './components/AgentPanel';
import { AppsPanel } from './components/AppsPanel';
import { AgentDock } from './components/AgentDock';
import { CommandPalette } from './components/CommandPalette';
import { APP_MODES } from './lib/types';
import { getServices } from './services/container';
import { closeTabWithCleanup } from './lib/closeTab';

const RAIL_WIDTH = 56;

/** Draggable divider between the agent brain and the apps panel. */
function BrainResizer() {
	const setBrainWidth = useShell((s) => s.setBrainWidth);
	const [drag, setDrag] = useState(false);
	function onDown(e: React.PointerEvent) {
		e.preventDefault();
		setDrag(true);
		const move = (ev: PointerEvent) => setBrainWidth(ev.clientX - RAIL_WIDTH);
		const up = () => {
			setDrag(false);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			document.body.style.cursor = '';
		};
		document.body.style.cursor = 'col-resize';
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
	const projects = useShell((s) => s.projects);

	// Guard: if the persisted active pane no longer exists, fall back to the first leaf.
	const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const activeExists = leaves(tab.tree).some((l) => l.pane.id === tab.activePaneId);
	useEffect(() => {
		if (!activeExists) {
			useShell.getState().setActivePane(leaves(tab.tree)[0].pane.id);
		}
	}, [activeExists, tab.tree]);

	// The active project's color threads through the whole window as `--pc`.
	const projectColor = projects.find((p) => p.id === tab?.projectId)?.color ?? 'var(--brand)';

	return (
		<div className="app v0" style={{ ['--pc' as string]: projectColor, ['--brain-w' as string]: `${brainWidth}px` }}>
			<ModeRail />
			<AgentPanel />
			<BrainResizer />
			<AppsPanel />
			<AgentDock />
			<CommandPalette />
		</div>
	);
}
