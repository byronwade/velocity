// ---------------------------------------------------------------------------
// Orchestration: open a file into the right pane.
//
// Prefer the active pane when it is already an editor; otherwise reuse any
// editor pane in the tab; otherwise convert the active pane to an editor. Keeps
// the store (layout) and the editor service (documents) cleanly separated —
// this is the one place that bridges them.
// ---------------------------------------------------------------------------

import { useShell } from './store';
import { findLeafByPane, leaves } from './tree';
import { pushRecent } from './recentFiles';
import type { EditorService } from '../services/editorService';

export function openFileInActivePane(editor: EditorService, path: string): void {
	pushRecent(path);
	const s = useShell.getState();
	const tab = s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];

	const activeLeaf = findLeafByPane(tab.tree, tab.activePaneId);
	if (activeLeaf && activeLeaf.pane.mode === 'editor') {
		void editor.bindPane(activeLeaf.pane.id, path);
		return;
	}

	const editorLeaf = leaves(tab.tree).find((l) => l.pane.mode === 'editor');
	if (editorLeaf) {
		s.setActivePane(editorLeaf.pane.id);
		void editor.bindPane(editorLeaf.pane.id, path);
		return;
	}

	s.setPaneMode(tab.activePaneId, 'editor');
	void editor.bindPane(tab.activePaneId, path);
}
