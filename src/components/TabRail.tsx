// Vertical tab rail (Arc-style). Replaces the top tab strip: open tabs stack in
// the left sidebar, each showing its dominant mode glyph + title + close.

import { useRef } from 'react';
import { useShell } from '../lib/store';
import { MODE_DEFS } from '../modes/registry';
import { Icon } from '../lib/icons';
import { leaves } from '../lib/tree';
import { closeTabWithCleanup } from '../lib/closeTab';
import type { Tab } from '../lib/types';

function tabMode(tab: Tab) {
	const active = leaves(tab.tree).find((l) => l.pane.id === tab.activePaneId) ?? leaves(tab.tree)[0];
	return active.pane.mode;
}

export function TabRail() {
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);
	const setActiveTab = useShell((s) => s.setActiveTab);
	const addTab = useShell((s) => s.addTab);
	const refs = useRef<Record<string, HTMLDivElement | null>>({});

	function onKey(e: React.KeyboardEvent, idx: number, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setActiveTab(id);
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = tabs[(idx + (e.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length];
			setActiveTab(next.id);
			requestAnimationFrame(() => refs.current[next.id]?.focus());
		}
	}

	return (
		<div className="arc-tabs" role="tablist" aria-label="Open tabs" aria-orientation="vertical">
			{tabs.map((t, i) => {
				const Glyph = Icon[MODE_DEFS[tabMode(t)].icon];
				const active = t.id === activeTabId;
				return (
					<div
						key={t.id}
						ref={(el) => { refs.current[t.id] = el; }}
						role="tab"
						aria-selected={active}
						tabIndex={active ? 0 : -1}
						className={`arc-tab${active ? ' active' : ''}`}
						onClick={() => setActiveTab(t.id)}
						onKeyDown={(e) => onKey(e, i, t.id)}
						onAuxClick={(e) => { if (e.button === 1) { closeTabWithCleanup(t.id); } }}
						title={t.title}
					>
						<span className="glyph"><Glyph /></span>
						<span className="tt">{t.title}</span>
						<button className="x" aria-label={`Close ${t.title}`} onClick={(e) => { e.stopPropagation(); closeTabWithCleanup(t.id); }}><Icon.close /></button>
					</div>
				);
			})}
			<button className="arc-newtab" onClick={() => addTab()}><Icon.plus />New tab</button>
		</div>
	);
}
