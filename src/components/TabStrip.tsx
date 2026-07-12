import { useRef } from 'react';
import { useShell } from '../lib/store';
import { MODE_DEFS } from '../modes/registry';
import { Icon } from '../lib/icons';
import { leaves } from '../lib/tree';
import { closeTabWithCleanup } from '../lib/closeTab';
import type { Tab } from '../lib/types';

/** The dominant mode of a tab = the mode of its active pane (drives the tab glyph). */
function tabMode(tab: Tab) {
	const active = leaves(tab.tree).find((l) => l.pane.id === tab.activePaneId) ?? leaves(tab.tree)[0];
	return active.pane.mode;
}

export function TabStrip() {
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);
	const setActiveTab = useShell((s) => s.setActiveTab);
	const closeTab = closeTabWithCleanup;
	const addTab = useShell((s) => s.addTab);
	const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

	function onTabKey(e: React.KeyboardEvent, idx: number, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setActiveTab(id);
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			const next = e.key === 'Home' ? tabs[0]
				: e.key === 'End' ? tabs[tabs.length - 1]
					: tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
			setActiveTab(next.id);
			requestAnimationFrame(() => tabRefs.current[next.id]?.focus());
		}
	}

	return (
		<div className="tabstrip">
			<div className="traffic" aria-hidden><i className="r" /><i className="y" /><i className="g" /></div>
			<div className="tabs" role="tablist" aria-label="Open tabs">
				{tabs.map((t, i) => {
					const Glyph = Icon[MODE_DEFS[tabMode(t)].icon];
					const active = t.id === activeTabId;
					return (
						<div
							key={t.id}
							ref={(el) => { tabRefs.current[t.id] = el; }}
							role="tab"
							aria-selected={active}
							tabIndex={active ? 0 : -1}
							className={`tab${active ? ' active' : ''}`}
							onClick={() => setActiveTab(t.id)}
							onKeyDown={(e) => onTabKey(e, i, t.id)}
							onAuxClick={(e) => { if (e.button === 1) { closeTab(t.id); } }}
							title={t.title}
						>
							<span className="glyph"><Glyph /></span>
							<span className="tt">{t.title}</span>
							<button className="x" aria-label={`Close ${t.title}`} onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}><Icon.close /></button>
						</div>
					);
				})}
				<button className="ib tabadd" title="New tab (⌘T)" aria-label="New tab" onClick={() => addTab()}><Icon.plus /></button>
			</div>
		</div>
	);
}
