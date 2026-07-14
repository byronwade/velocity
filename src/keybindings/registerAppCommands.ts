// Wires every command id referenced by the default keymap to a real handler:
// editor actions act on the focused CodeMirror view; workbench actions drive the
// shell store, services, and the various overlays (via lightweight events).

import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { undo, redo, selectAll, indentMore, indentLess, toggleComment, copyLineUp, copyLineDown, moveLineUp, moveLineDown, deleteLine } from '@codemirror/commands';
import { openSearchPanel, gotoLine, selectNextOccurrence, selectSelectionMatches } from '@codemirror/search';
import { foldCode, unfoldCode, foldAll, unfoldAll } from '@codemirror/language';
import { registerCommands, type Command } from './commands';
import { getActiveEditor } from '../editor/activeView';
import { useShell, activeTab } from '../lib/store';
import { closeTabWithCleanup } from '../lib/closeTab';
import { formatSource } from '../services/format';
import { getEditorPrefs } from '../services/editorPrefs';

function withView(fn: (v: EditorView) => void): void {
	const a = getActiveEditor();
	if (a) { fn(a.view); a.view.focus(); }
}

/** Format the focused view's buffer with Prettier, preserving the cursor. */
async function formatView(view: EditorView, path: string): Promise<void> {
	const before = view.state.doc.toString();
	const after = await formatSource(path, before);
	if (after === before) return;
	const head = Math.min(view.state.selection.main.head, after.length);
	view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: after }, selection: { anchor: head } });
}

// Add a cursor one line above/below each existing selection range.
function addCursorVertical(view: EditorView, dir: 1 | -1): boolean {
	const { state } = view;
	const ranges = state.selection.ranges;
	const extra = ranges
		.map((r) => {
			const line = state.doc.lineAt(r.head);
			const targetNo = line.number + dir;
			if (targetNo < 1 || targetNo > state.doc.lines) return null;
			const target = state.doc.line(targetNo);
			return EditorSelection.cursor(Math.min(target.from + (r.head - line.from), target.to));
		})
		.filter(Boolean) as ReturnType<typeof EditorSelection.cursor>[];
	if (!extra.length) return false;
	view.dispatch({ selection: EditorSelection.create([...ranges, ...extra]) });
	return true;
}

function activePaneId(): string {
	const s = useShell.getState();
	return activeTab(s).activePaneId;
}

function fire(name: string): void {
	window.dispatchEvent(new Event(name));
}

/** Summon a surface onto the Work canvas. The 4 core surfaces are always present;
 *  studios (database, api, test, …) appear on demand. The workbench listens. */
function openTool(tool: string): void {
	window.dispatchEvent(new CustomEvent('velocity:open-tool', { detail: { tool } }));
}

const EDITOR_WHEN = 'editorTextFocus';

export function registerAppCommands(): void {
	const cmds: Command[] = [
		// --- Editor: editing ---
		{ id: 'undo', title: 'Undo', category: 'Editor', when: EDITOR_WHEN, run: () => withView(undo) },
		{ id: 'redo', title: 'Redo', category: 'Editor', when: EDITOR_WHEN, run: () => withView(redo) },
		{ id: 'editor.action.selectAll', title: 'Select All', category: 'Editor', when: EDITOR_WHEN, run: () => withView(selectAll) },
		{ id: 'editor.action.commentLine', title: 'Toggle Line Comment', category: 'Editor', when: EDITOR_WHEN, run: () => withView(toggleComment) },
		{ id: 'editor.action.indentLines', title: 'Indent Line', category: 'Editor', when: EDITOR_WHEN, run: () => withView(indentMore) },
		{ id: 'editor.action.outdentLines', title: 'Outdent Line', category: 'Editor', when: EDITOR_WHEN, run: () => withView(indentLess) },
		{ id: 'editor.action.copyLinesDownAction', title: 'Copy Line Down', category: 'Editor', when: EDITOR_WHEN, run: () => withView(copyLineDown) },
		{ id: 'editor.action.copyLinesUpAction', title: 'Copy Line Up', category: 'Editor', when: EDITOR_WHEN, run: () => withView(copyLineUp) },
		{ id: 'editor.action.moveLinesDownAction', title: 'Move Line Down', category: 'Editor', when: EDITOR_WHEN, run: () => withView(moveLineDown) },
		{ id: 'editor.action.moveLinesUpAction', title: 'Move Line Up', category: 'Editor', when: EDITOR_WHEN, run: () => withView(moveLineUp) },
		{ id: 'editor.action.deleteLines', title: 'Delete Line', category: 'Editor', when: EDITOR_WHEN, run: () => withView(deleteLine) },

		// --- Editor: selection / cursors ---
		{ id: 'editor.action.addSelectionToNextFindMatch', title: 'Add Selection To Next Find Match', category: 'Editor', when: EDITOR_WHEN, run: () => withView(selectNextOccurrence) },
		{ id: 'editor.action.selectHighlights', title: 'Select All Occurrences', category: 'Editor', when: EDITOR_WHEN, run: () => withView(selectSelectionMatches) },
		{ id: 'editor.action.insertCursorBelow', title: 'Add Cursor Below', category: 'Editor', when: EDITOR_WHEN, run: () => withView((v) => addCursorVertical(v, 1)) },
		{ id: 'editor.action.insertCursorAbove', title: 'Add Cursor Above', category: 'Editor', when: EDITOR_WHEN, run: () => withView((v) => addCursorVertical(v, -1)) },

		// --- Editor: search / navigation ---
		{ id: 'actions.find', title: 'Find', category: 'Editor', when: EDITOR_WHEN, run: () => withView(openSearchPanel) },
		{ id: 'editor.action.startFindReplaceAction', title: 'Replace', category: 'Editor', when: EDITOR_WHEN, run: () => withView(openSearchPanel) },
		{ id: 'workbench.action.gotoLine', title: 'Go to Line/Column', category: 'Go', when: EDITOR_WHEN, run: () => withView(gotoLine) },

		// --- Editor: folding ---
		{ id: 'editor.fold', title: 'Fold', category: 'Editor Folding', when: EDITOR_WHEN, run: () => withView(foldCode) },
		{ id: 'editor.unfold', title: 'Unfold', category: 'Editor Folding', when: EDITOR_WHEN, run: () => withView(unfoldCode) },
		{ id: 'editor.foldAll', title: 'Fold All', category: 'Editor Folding', when: EDITOR_WHEN, run: () => withView(foldAll) },
		{ id: 'editor.unfoldAll', title: 'Unfold All', category: 'Editor Folding', when: EDITOR_WHEN, run: () => withView(unfoldAll) },

		// --- Editor: format / save ---
		{ id: 'editor.action.formatDocument', title: 'Format Document', category: 'Editor', when: EDITOR_WHEN, run: () => { const a = getActiveEditor(); if (a) void formatView(a.view, a.path); } },
		{
			id: 'workbench.action.files.save', title: 'Save', category: 'File', when: EDITOR_WHEN,
			run: () => {
				const a = getActiveEditor();
				if (!a) return;
				if (getEditorPrefs().formatOnSave) void formatView(a.view, a.path).finally(a.save);
				else a.save();
			},
		},

		// --- Workbench: navigation / overlays ---
		{ id: 'workbench.action.showCommands', title: 'Show All Commands', category: 'Workbench', run: () => fire('velocity:command-palette') },
		{ id: 'workbench.action.quickOpen', title: 'Go to File…', category: 'Workbench', run: () => window.dispatchEvent(new CustomEvent('velocity:quickopen', { detail: { mode: 'all' } })) },
		{ id: 'workbench.action.openRecent', title: 'Open Recent', category: 'Workbench', run: () => window.dispatchEvent(new CustomEvent('velocity:quickopen', { detail: { mode: 'recent' } })) },
		{ id: 'workbench.actions.view.problems', title: 'Problems: TODO / FIXME Index', category: 'Workbench', run: () => fire('velocity:todos') },
		{ id: 'workbench.action.openGlobalKeybindings', title: 'Preferences: Open Keyboard Shortcuts', category: 'Preferences', run: () => fire('velocity:open-keybindings') },
		{ id: 'workbench.action.openSettings', title: 'Preferences: Open Settings', category: 'Preferences', run: () => fire('velocity:open-settings') },
		{ id: 'velocity.focusCommandBar', title: 'Focus Agent Command Bar', category: 'Workbench', run: () => fire('velocity:focus-commandbar') },

		// --- Workbench: window / layout ---
		{ id: 'workbench.action.toggleSidebarVisibility', title: 'Toggle Side Panel', category: 'View', run: () => useShell.getState().toggleBrain() },
		{ id: 'workbench.action.files.newUntitledFile', title: 'New File', category: 'File', run: () => useShell.getState().addTab('editor') },
		{ id: 'workbench.action.closeActiveEditor', title: 'Close Tab', category: 'File', run: () => closeTabWithCleanup(useShell.getState().activeTabId) },
		{ id: 'workbench.action.splitEditor', title: 'Split Editor', category: 'View', run: () => useShell.getState().splitPane(activePaneId(), 'row') },
		{ id: 'workbench.action.terminal.toggleTerminal', title: 'Toggle Terminal', category: 'Terminal', run: () => useShell.getState().setPaneMode(activePaneId(), 'terminal') },
		{ id: 'workbench.action.toggleMaximizeEditor', title: 'Toggle Maximize Pane', category: 'View', run: () => useShell.getState().toggleMaximizePane(activePaneId()) },
		{ id: 'workbench.action.selectTheme', title: 'Toggle Color Theme', category: 'Preferences', run: () => { const s = useShell.getState(); s.setTheme(s.theme === 'dark' ? 'light' : 'dark'); } },

		// --- Work surfaces (⌘K) ---
			// The 4 core surfaces stay on the Work canvas; the 9 studios appear on
			// demand. ⌘1–4 keep the familiar surface switches; every tool is also
			// summonable by name here (and, later, by the agent when it needs one).
		{ id: 'velocity.paneMode.editor', title: 'Open Code Editor', category: 'Go to Tool', run: () => openTool('editor') },
			{ id: 'velocity.open.design', title: 'Open Design Canvas', category: 'Go to Tool', run: () => openTool('design') },
			{ id: 'velocity.open.database', title: 'Open Database Studio', category: 'Go to Tool', run: () => openTool('database') },
			{ id: 'velocity.open.api', title: 'Open API Runner', category: 'Go to Tool', run: () => openTool('api') },
			{ id: 'velocity.open.observe', title: 'Open Observability', category: 'Go to Tool', run: () => openTool('observe') },
			{ id: 'velocity.open.test', title: 'Open Tests', category: 'Go to Tool', run: () => openTool('test') },
			{ id: 'velocity.open.ship', title: 'Open Deployments', category: 'Go to Tool', run: () => openTool('ship') },
			{ id: 'velocity.open.home', title: 'Open Project Home', category: 'Go to Tool', run: () => openTool('home') },
			{ id: 'velocity.open.mission', title: 'Open Mission Control', category: 'Go to Tool', run: () => openTool('mission') },
			{ id: 'velocity.open.library', title: 'Open Component Library', category: 'Go to Tool', run: () => openTool('library') },
		{ id: 'velocity.paneMode.browser', title: 'Open Preview', category: 'Go to Tool', run: () => openTool('browser') },
		{ id: 'velocity.paneMode.terminal', title: 'Open Terminal', category: 'Go to Tool', run: () => openTool('terminal') },
		{ id: 'velocity.paneMode.builder', title: 'Open App Builder', category: 'Go to Tool', run: () => openTool('builder') },
	];
	registerCommands(cmds);
}
