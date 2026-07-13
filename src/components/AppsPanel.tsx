// The Apps panel — the right side: the project's "apps" (Editor / Terminal /
// Browser / Builder) as a tab strip the agent opens and controls, plus the site
// actions. The active app's content (a mode, splittable) floats as a card.

import { useEffect, useState } from 'react';
import { useShell } from '../lib/store';
import { findLeafByPane, leaves } from '../lib/tree';
import { APP_MODES, type Tab } from '../lib/types';
import { MODE_DEFS } from '../modes/registry';
import { Icon } from '../lib/icons';
import { SplitView } from './SplitView';
import { PaneChrome } from './PaneChrome';
import { ShareSheet } from './ShareSheet';
import { ActivityShelf } from './ActivityShelf';
import { AgentsMenu } from './AgentsMenu';
import { CockpitModeMenu } from './CockpitModeMenu';
import { closeTabWithCleanup } from '../lib/closeTab';

const PEOPLE = [
	{ initial: 'B', color: 'linear-gradient(135deg,#7c5cff,#d94fb0)' },
	{ initial: 'M', color: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
	{ initial: 'K', color: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
];

function tabMode(tab: Tab) {
	const active = leaves(tab.tree).find((l) => l.pane.id === tab.activePaneId) ?? leaves(tab.tree)[0];
	return active.pane.mode;
}

export function AppsPanel() {
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);
	const setActiveTab = useShell((s) => s.setActiveTab);
	const addTab = useShell((s) => s.addTab);
	const maximizedPaneId = useShell((s) => s.maximizedPaneId);
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	const [sheet, setSheet] = useState<null | 'invite' | 'share'>(null);
	const [addOpen, setAddOpen] = useState(false);

	const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const projectId = activeTab?.projectId;
	const appTabs = tabs.filter((t) => t.projectId === projectId);
	const maximizedLeaf = maximizedPaneId ? findLeafByPane(activeTab.tree, maximizedPaneId) : undefined;

	useEffect(() => {
		if (!addOpen) {
			return;
		}
		const close = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.addwrap')) {
				setAddOpen(false);
			}
		};
		document.addEventListener('mousedown', close);
		return () => document.removeEventListener('mousedown', close);
	}, [addOpen]);

	return (
		<section className="apps">
			<div className="apps-head">
				<CockpitModeMenu />
				<div className="apps-tabs" role="tablist" aria-label="Apps">
					{appTabs.map((t) => {
						const mode = tabMode(t);
						const Glyph = Icon[MODE_DEFS[mode].icon];
						// Editor/browser tabs keep their file/site title; a studio tab
						// shows the studio name so it isn't mislabeled "App.tsx".
						const label = mode === 'editor' || mode === 'browser' || mode === 'terminal' ? t.title : MODE_DEFS[mode].name;
						const active = t.id === activeTabId;
						return (
							<div
								key={t.id}
								role="tab"
								aria-selected={active}
								tabIndex={active ? 0 : -1}
								className={`atab${active ? ' active' : ''}`}
								onClick={() => setActiveTab(t.id)}
								onKeyDown={(e) => { if (e.key === 'Enter') { setActiveTab(t.id); } }}
								onAuxClick={(e) => { if (e.button === 1) { closeTabWithCleanup(t.id); } }}
								title={t.title}
							>
								<span className="glyph"><Glyph /></span>
								<span className="tt">{label}</span>
								<button className="x" aria-label={`Close ${t.title}`} onClick={(e) => { e.stopPropagation(); closeTabWithCleanup(t.id); }}><Icon.close /></button>
							</div>
						);
					})}
					<div className="addwrap">
						<button className="atab-add" title="New app" aria-label="New app" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}><Icon.plus /></button>
						{addOpen && (
							<div className="addmenu">
								{APP_MODES.map((m) => {
									const d = MODE_DEFS[m];
									const G = Icon[d.icon];
									return (
										<button key={m} onClick={() => { addTab(m, projectId); setAddOpen(false); }}>
											<span className="ic"><G /></span>
											<div><div className="t">{d.name}</div><div className="d">{d.blurb}</div></div>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
				<span className="sp" />
				<button className="ib" title="Run / Preview" aria-label="Run"><Icon.play /></button>
				<div className="presence" title="3 collaborators live">
					{PEOPLE.map((p) => (<span key={p.initial} className="av" style={{ background: p.color }}>{p.initial}</span>))}
					<span className="av more">+4</span>
				</div>
				<AgentsMenu />
				<button className="ib" title={theme === 'dark' ? 'Light theme' : 'Dark theme'} aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Icon.moon /> : <Icon.sun />}</button>
				<button className="btn ghost" onClick={() => setSheet('invite')}><Icon.invite />Invite</button>
				<button className="btn brand" onClick={() => setSheet('share')}><Icon.share />Share</button>
			</div>
			<div className="apps-stage">
				{maximizedLeaf ? <PaneChrome pane={maximizedLeaf.pane} /> : <SplitView key={activeTab.id} node={activeTab.tree} />}
			</div>
			<ActivityShelf />
			{sheet && <ShareSheet kind={sheet} onClose={() => setSheet(null)} />}
		</section>
	);
}
