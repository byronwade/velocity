// ---------------------------------------------------------------------------
// Velocity shell store (zustand). Holds tabs, per-tab pane trees, and chrome
// state. Persisted to localStorage so layouts survive reloads (a stand-in for
// the future CRDT/server sync). Selective subscriptions keep re-renders cheap.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Axis, Mode, Project, Tab, Theme } from './types';
import { closePane as closePaneOp, makeLeaf, setPaneMode as setPaneModeOp, setRatio as setRatioOp, splitPane as splitPaneOp, uid } from './tree';

const PERSIST_KEY = 'velocity.shell.v2';
const PROJECT_COLORS = ['#5b5bd6', '#3fae6a', '#e8863c', '#d0567f', '#4a90d9', '#7b5bd6'];

interface PersistShape {
	projects: Project[];
	tabs: Tab[];
	activeTabId: string;
	collapsedProjects: string[];
	sidebarCollapsed: boolean;
	theme: Theme;
}

interface ShellState extends PersistShape {
	maximizedPaneId: string | null;

	// projects (tab groups)
	addProject: (name?: string) => void;
	renameProject: (id: string, name: string) => void;
	toggleProject: (id: string) => void;

	// tabs
	addTab: (mode?: Mode, projectId?: string) => void;
	closeTab: (tabId: string) => void;
	setActiveTab: (tabId: string) => void;
	renameTab: (tabId: string, title: string) => void;
	moveTab: (from: number, to: number) => void;
	moveTabToProject: (tabId: string, projectId: string) => void;

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

function newTab(mode: Mode = 'agents', title = 'New tab', projectId = ''): Tab {
	const leaf = makeLeaf(mode);
	return { id: uid('tab'), title, tree: leaf, activePaneId: leaf.pane.id, projectId };
}

function newProject(name: string, color: string): Project {
	return { id: uid('proj'), name, color };
}

/** A welcome tab that showcases the recursive split: Agents beside (Editor over Terminal). */
function demoTab(projectId: string): Tab {
	const agents = makeLeaf('agents');
	const editor = makeLeaf('editor');
	const terminal = makeLeaf('terminal');
	const right = { id: uid('split'), kind: 'split' as const, axis: 'col' as const, ratio: 0.62, a: editor, b: terminal };
	const tree = { id: uid('split'), kind: 'split' as const, axis: 'row' as const, ratio: 0.42, a: agents, b: right };
	return { id: uid('tab'), title: 'streamline · workspace', tree, activePaneId: agents.pane.id, projectId };
}

function load(): PersistShape | null {
	try {
		const raw = localStorage.getItem(PERSIST_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as PersistShape;
		if (!parsed.tabs?.length || !parsed.projects?.length) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

const seed: PersistShape = load() ?? (() => {
	const p1 = newProject('streamline', PROJECT_COLORS[0]);
	const p2 = newProject('contextds', PROJECT_COLORS[1]);
	const tabs = [demoTab(p1.id), newTab('browser', 'localhost:3000', p1.id), newTab('builder', 'New app', p2.id)];
	return { projects: [p1, p2], tabs, activeTabId: tabs[0].id, collapsedProjects: [], sidebarCollapsed: false, theme: 'dark' as Theme };
})();

function withActiveTab(state: ShellState, fn: (tab: Tab) => Tab): Partial<ShellState> {
	const tabs = state.tabs.map((t) => (t.id === state.activeTabId ? fn(t) : t));
	return { tabs };
}

export const useShell = create<ShellState>((set) => ({
	...seed,
	maximizedPaneId: null,

	addProject: (name = 'New project') =>
		set((s) => {
			const p = newProject(name, PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length]);
			const t = newTab('agents', 'New session', p.id);
			return { projects: [...s.projects, p], tabs: [...s.tabs, t], activeTabId: t.id, maximizedPaneId: null };
		}),
	renameProject: (id, name) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) })),
	toggleProject: (id) =>
		set((s) => ({ collapsedProjects: s.collapsedProjects.includes(id) ? s.collapsedProjects.filter((x) => x !== id) : [...s.collapsedProjects, id] })),

	addTab: (mode = 'agents', projectId) =>
		set((s) => {
			const active = s.tabs.find((t) => t.id === s.activeTabId);
			const pid = projectId ?? active?.projectId ?? s.projects[0]?.id ?? '';
			const t = newTab(mode, mode === 'agents' ? 'New session' : 'New tab', pid);
			return { tabs: [...s.tabs, t], activeTabId: t.id, maximizedPaneId: null };
		}),

	moveTabToProject: (tabId, projectId) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, projectId } : t)) })),

	closeTab: (tabId) =>
		set((s) => {
			if (s.tabs.length === 1) {
				const pid = s.tabs[0].projectId || s.projects[0]?.id || '';
				const t = newTab('agents', 'New session', pid);
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
		set((s) => ({
			...withActiveTab(s, (t) => {
				const { tree, newPaneId } = splitPaneOp(t.tree, paneId, axis);
				return { ...t, tree, activePaneId: newPaneId };
			}),
			// Exit maximize on a structural change so the new pane is visible.
			maximizedPaneId: null,
		})),

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
		const data: PersistShape = { projects: s.projects, tabs: s.tabs, activeTabId: s.activeTabId, collapsedProjects: s.collapsedProjects, sidebarCollapsed: s.sidebarCollapsed, theme: s.theme };
		localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
	} catch {
		/* ignore quota / private-mode errors */
	}
});

export const activeTab = (s: ShellState): Tab => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
