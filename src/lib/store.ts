// ---------------------------------------------------------------------------
// Velocity shell store (zustand). Holds tabs, per-tab pane trees, and chrome
// state. Persisted to localStorage so layouts survive reloads (a stand-in for
// the future CRDT/server sync). Selective subscriptions keep re-renders cheap.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Axis, Mode, Tab, Theme } from './types';
import { closePane as closePaneOp, makeLeaf, setPaneMode as setPaneModeOp, setRatio as setRatioOp, splitPane as splitPaneOp, uid } from './tree';

const PERSIST_KEY = 'velocity.shell.v1';

interface PersistShape {
	tabs: Tab[];
	activeTabId: string;
	sidebarCollapsed: boolean;
	theme: Theme;
}

interface ShellState extends PersistShape {
	maximizedPaneId: string | null;

	// tabs
	addTab: (mode?: Mode) => void;
	closeTab: (tabId: string) => void;
	setActiveTab: (tabId: string) => void;
	renameTab: (tabId: string, title: string) => void;
	moveTab: (from: number, to: number) => void;

	// panes
	setActivePane: (paneId: string) => void;
	setPaneMode: (paneId: string, mode: Mode) => void;
	splitPane: (paneId: string, axis: Axis) => void;
	closePane: (paneId: string) => void;
	setRatio: (splitId: string, ratio: number) => void;
	toggleMaximizePane: (paneId: string) => void;

	// chrome
	toggleSidebar: () => void;
	setTheme: (theme: Theme) => void;
}

function newTab(mode: Mode = 'agents', title = 'New tab'): Tab {
	const leaf = makeLeaf(mode);
	return { id: uid('tab'), title, tree: leaf, activePaneId: leaf.pane.id };
}

/** A welcome tab that showcases the recursive split: Agents beside (Editor over Terminal). */
function demoTab(): Tab {
	const agents = makeLeaf('agents');
	const editor = makeLeaf('editor');
	const terminal = makeLeaf('terminal');
	const right = { id: uid('split'), kind: 'split' as const, axis: 'col' as const, ratio: 0.62, a: editor, b: terminal };
	const tree = { id: uid('split'), kind: 'split' as const, axis: 'row' as const, ratio: 0.42, a: agents, b: right };
	return { id: uid('tab'), title: 'streamline · workspace', tree, activePaneId: agents.pane.id };
}

function load(): PersistShape | null {
	try {
		const raw = localStorage.getItem(PERSIST_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as PersistShape;
		if (!parsed.tabs?.length) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

const seed: PersistShape = load() ?? {
	tabs: [
		demoTab(),
		{ ...newTab('browser', 'localhost:3000') },
		{ ...newTab('builder', 'New app') },
	],
	activeTabId: '',
	sidebarCollapsed: false,
	theme: 'dark',
};
if (!seed.activeTabId) {
	seed.activeTabId = seed.tabs[0].id;
}

function withActiveTab(state: ShellState, fn: (tab: Tab) => Tab): Partial<ShellState> {
	const tabs = state.tabs.map((t) => (t.id === state.activeTabId ? fn(t) : t));
	return { tabs };
}

export const useShell = create<ShellState>((set) => ({
	...seed,
	maximizedPaneId: null,

	addTab: (mode = 'agents') =>
		set((s) => {
			const t = newTab(mode, mode === 'agents' ? 'New session' : 'New tab');
			return { tabs: [...s.tabs, t], activeTabId: t.id, maximizedPaneId: null };
		}),

	closeTab: (tabId) =>
		set((s) => {
			if (s.tabs.length === 1) {
				const t = newTab();
				return { tabs: [t], activeTabId: t.id };
			}
			const idx = s.tabs.findIndex((t) => t.id === tabId);
			const tabs = s.tabs.filter((t) => t.id !== tabId);
			const activeTabId = s.activeTabId === tabId ? tabs[Math.max(0, idx - 1)].id : s.activeTabId;
			return { tabs, activeTabId, maximizedPaneId: null };
		}),

	setActiveTab: (tabId) => set({ activeTabId: tabId, maximizedPaneId: null }),
	renameTab: (tabId, title) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)) })),
	moveTab: (from, to) =>
		set((s) => {
			const tabs = s.tabs.slice();
			const [m] = tabs.splice(from, 1);
			tabs.splice(to, 0, m);
			return { tabs };
		}),

	setActivePane: (paneId) => set((s) => withActiveTab(s, (t) => ({ ...t, activePaneId: paneId }))),

	setPaneMode: (paneId, mode) => set((s) => withActiveTab(s, (t) => ({ ...t, tree: setPaneModeOp(t.tree, paneId, mode), activePaneId: paneId }))),

	splitPane: (paneId, axis) =>
		set((s) =>
			withActiveTab(s, (t) => {
				const { tree, newPaneId } = splitPaneOp(t.tree, paneId, axis);
				return { ...t, tree, activePaneId: newPaneId };
			}),
		),

	closePane: (paneId) =>
		set((s) => {
			const patch = withActiveTab(s, (t) => {
				const { tree, nextActivePaneId } = closePaneOp(t.tree, paneId);
				return { ...t, tree, activePaneId: nextActivePaneId };
			});
			return { ...patch, maximizedPaneId: s.maximizedPaneId === paneId ? null : s.maximizedPaneId };
		}),

	setRatio: (splitId, ratio) => set((s) => withActiveTab(s, (t) => ({ ...t, tree: setRatioOp(t.tree, splitId, ratio) }))),

	toggleMaximizePane: (paneId) => set((s) => ({ maximizedPaneId: s.maximizedPaneId === paneId ? null : paneId })),

	toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
	setTheme: (theme) => set({ theme }),
}));

// Persist a minimal slice on change.
useShell.subscribe((s) => {
	try {
		const data: PersistShape = { tabs: s.tabs, activeTabId: s.activeTabId, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme };
		localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
	} catch {
		/* ignore quota / private-mode errors */
	}
});

export const activeTab = (s: ShellState): Tab => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
