import { useEffect } from 'react';
import { useShell } from './lib/store';
import { leaves, findLeafByPane } from './lib/tree';
import { ArcSidebar } from './components/ArcSidebar';
import { CommandHeader } from './components/CommandHeader';
import { StatusBar } from './components/StatusBar';
import { SplitView } from './components/SplitView';
import { PaneChrome } from './components/PaneChrome';
import { MODES } from './lib/types';
import { getServices } from './services/container';
import { closeTabWithCleanup } from './lib/closeTab';

export function App() {
	const theme = useShell((s) => s.theme);
	const sidebarCollapsed = useShell((s) => s.sidebarCollapsed);
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);
	const maximizedPaneId = useShell((s) => s.maximizedPaneId);

	// Apply theme to <html> so tokens resolve. A `?theme=` query param overrides
	// once on load (handy for shareable links and previews).
	useEffect(() => {
		const q = new URLSearchParams(location.search).get('theme');
		if (q === 'light' || q === 'dark') {
			useShell.getState().setTheme(q);
		}
	}, []);
	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		// Keep the UA color-scheme in lockstep so native controls (buttons, inputs,
		// scrollbars) don't composite light chrome under a dark theme.
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
				// ⌘1–5 switch the active pane's mode; if a tab exists at that index with no such mode, jump tab instead.
				const i = Number(e.key) - 1;
				if (i < MODES.length) { s.setPaneMode(tab.activePaneId, MODES[i]); }
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const maximizedLeaf = maximizedPaneId ? findLeafByPane(tab.tree, maximizedPaneId) : undefined;

	// A single, full-page Browser reads as a browser, not an IDE — hide the rail
	// and Explorer (Arc-style) and let the page own the whole surface.
	const shown = maximizedLeaf ? [maximizedLeaf] : leaves(tab.tree);
	const fullBrowser = shown.length === 1 && shown[0].pane.mode === 'browser';

	// Guard: if the persisted active pane no longer exists, fall back to the first leaf.
	const activeExists = leaves(tab.tree).some((l) => l.pane.id === tab.activePaneId);
	useEffect(() => {
		if (!activeExists) {
			useShell.getState().setActivePane(leaves(tab.tree)[0].pane.id);
		}
	}, [activeExists, tab.tree]);

	return (
		<div className={`app arc${sidebarCollapsed ? ' nosidebar' : ''}${fullBrowser ? ' nofiles' : ''}`}>
			<ArcSidebar />
			<div className="arc-main">
				<CommandHeader />
				<div className="arc-stage">
					{maximizedLeaf ? <PaneChrome pane={maximizedLeaf.pane} /> : <SplitView key={tab.id} node={tab.tree} />}
				</div>
				<StatusBar />
			</div>
		</div>
	);
}
