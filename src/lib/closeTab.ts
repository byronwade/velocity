// ---------------------------------------------------------------------------
// Closing a tab must release the per-pane runtime state (editor docs, shells,
// browser history, agent threads) for every pane it contained — the store only
// knows about layout, not services. Route every tab-close entry point through
// here so bindings don't leak (and stale docs don't pin the GC).
// ---------------------------------------------------------------------------

import { useShell } from './store';
import { leaves } from './tree';
import { getServices } from '../services/container';

export function closeTabWithCleanup(tabId: string): void {
	const s = useShell.getState();
	const tab = s.tabs.find((t) => t.id === tabId);
	if (tab) {
		const { editor, shell, browser, agent } = getServices();
		for (const l of leaves(tab.tree)) {
			editor.releasePane(l.pane.id);
			shell.release(l.pane.id);
			browser.release(l.pane.id);
			agent.release(l.pane.id);
		}
	}
	s.closeTab(tabId);
}
