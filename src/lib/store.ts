// ---------------------------------------------------------------------------
// Velocity shell store (zustand). Holds tabs, per-tab pane trees, and chrome
// state. Persisted to localStorage so layouts survive reloads (a stand-in for
// the future CRDT/server sync). Selective subscriptions keep re-renders cheap.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Axis, CockpitMode, Mode, Project, Tab, Theme } from './types';
import { closePane as closePaneOp, makeLeaf, setPaneMode as setPaneModeOp, setRatio as setRatioOp, splitPane as splitPaneOp, uid } from './tree';

const PERSIST_KEY = 'velocity.shell.v3';
const PROJECT_COLORS = ['#5b5bd6', '#3fae6a', '#e8863c', '#d0567f', '#4a90d9', '#7b5bd6'];

interface PersistShape {
	projects: Project[];
	tabs: Tab[];
	activeTabId: string;
	collapsedProjects: string[];
	sidebarCollapsed: boolean;
	brainWidth: number;
	brainCollapsed: boolean;
	cockpitMode: CockpitMode;
	dockCollapsed: boolean;
	shelfCollapsed: boolean;
	theme: Theme;
}

interface ShellState extends PersistShape {
	maximizedPaneId: string | null;

	// projects (each is a workspace with its own agent brain + app tabs)
	addProject: (name?: string) => void;
	renameProject: (id: string, name: string) => void;
	toggleProject: (id: string) => void;
	setActiveProject: (projectId: string) => void;

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
	setBrainWidth: (w: number) => void;
	toggleBrain: () => void;
	setCockpitMode: (mode: CockpitMode) => void;
	toggleDock: () => void;
	toggleShelf: () => void;
	setTheme: (theme: Theme) => void;
}

function newTab(mode: Mode = 'editor', title = 'New tab', projectId = ''): Tab {
	const leaf = makeLeaf(mode);
	return { id: uid('tab'), title, tree: leaf, activePaneId: leaf.pane.id, projectId };
}

function newProject(name: string, color: string): Project {
	return { id: uid('proj'), name, color };
}

/** An app tab that shows a split (Editor over Terminal) — splits still work per app. */
function workspaceTab(projectId: string): Tab {
	const editor = makeLeaf('editor');
	const terminal = makeLeaf('terminal');
	const tree = { id: uid('split'), kind: 'split' as const, axis: 'col' as const, ratio: 0.68, a: editor, b: terminal };
	return { id: uid('tab'), title: 'App.tsx', tree, activePaneId: editor.pane.id, projectId };
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
	const tabs = [workspaceTab(p1.id), newTab('browser', 'localhost:3000', p1.id), newTab('builder', 'New app', p2.id)];
	return { projects: [p1, p2], tabs, activeTabId: tabs[0].id, collapsedProjects: [], sidebarCollapsed: false, brainWidth: 424, brainCollapsed: false, cockpitMode: 'build' as CockpitMode, dockCollapsed: false, shelfCollapsed: true, theme: 'dark' as Theme };
})();
if (!seed.cockpitMode) {
	seed.cockpitMode = 'build';
}
if (seed.shelfCollapsed === undefined) {
	seed.shelfCollapsed = true;
}
if (!seed.brainWidth) {
	seed.brainWidth = 424;
}

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
			const t = newTab('editor', 'Editor', p.id);
			return { projects: [...s.projects, p], tabs: [...s.tabs, t], activeTabId: t.id, maximizedPaneId: null };
		}),
	renameProject: (id, name) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) })),
	toggleProject: (id) =>
		set((s) => ({ collapsedProjects: s.collapsedProjects.includes(id) ? s.collapsedProjects.filter((x) => x !== id) : [...s.collapsedProjects, id] })),
	setActiveProject: (projectId) =>
		set((s) => {
			const first = s.tabs.find((t) => t.projectId === projectId);
			if (first) {
				return { activeTabId: first.id, maximizedPaneId: null };
			}
			const t = newTab('editor', 'Editor', projectId);
			return { tabs: [...s.tabs, t], activeTabId: t.id, maximizedPaneId: null };
		}),

	addTab: (mode = 'editor', projectId) =>
		set((s) => {
			const active = s.tabs.find((t) => t.id === s.activeTabId);
			const pid = projectId ?? active?.projectId ?? s.projects[0]?.id ?? '';
			const titles: Record<string, string> = { editor: 'Editor', terminal: 'Terminal', browser: 'New tab', builder: 'New app', agents: 'Chat' };
			const t = newTab(mode, titles[mode] ?? 'New tab', pid);
			return { tabs: [...s.tabs, t], activeTabId: t.id, maximizedPaneId: null };
		}),

	moveTabToProject: (tabId, projectId) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, projectId } : t)) })),

	closeTab: (tabId) =>
		set((s) => {
			const closing = s.tabs.find((t) => t.id === tabId);
			const pid = closing?.projectId ?? '';
			const siblings = s.tabs.filter((t) => t.projectId === pid && t.id !== tabId);
			// Closing the last tab in a project leaves a fresh editor so the project isn't empty.
			if (siblings.length === 0) {
				const t = newTab('editor', 'Editor', pid);
				const tabs = [...s.tabs.filter((x) => x.id !== tabId), t];
				return { tabs, activeTabId: s.activeTabId === tabId ? t.id : s.activeTabId, maximizedPaneId: null };
			}
			const tabs = s.tabs.filter((t) => t.id !== tabId);
			// If the active tab closed, prefer a sibling in the same project.
			const activeTabId = s.activeTabId === tabId ? siblings[0].id : s.activeTabId;
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
	setBrainWidth: (w) => set({ brainWidth: Math.max(320, Math.min(680, Math.round(w))) }),
	toggleBrain: () => set((s) => ({ brainCollapsed: !s.brainCollapsed })),
	setCockpitMode: (mode) => set({ cockpitMode: mode }),
	toggleDock: () => set((s) => ({ dockCollapsed: !s.dockCollapsed })),
	toggleShelf: () => set((s) => ({ shelfCollapsed: !s.shelfCollapsed })),
	setTheme: (theme) => set({ theme }),
}));

// Persist a minimal slice on change.
useShell.subscribe((s) => {
	try {
		const data: PersistShape = { projects: s.projects, tabs: s.tabs, activeTabId: s.activeTabId, collapsedProjects: s.collapsedProjects, sidebarCollapsed: s.sidebarCollapsed, brainWidth: s.brainWidth, brainCollapsed: s.brainCollapsed, cockpitMode: s.cockpitMode, dockCollapsed: s.dockCollapsed, shelfCollapsed: s.shelfCollapsed, theme: s.theme };
		localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
	} catch {
		/* ignore quota / private-mode errors */
	}
});

export const activeTab = (s: ShellState): Tab => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
