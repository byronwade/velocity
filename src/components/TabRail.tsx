// Vertical, project-grouped tab rail (Arc "spaces" / Cursor "repositories").
// Tabs are scoped under projects: each project is a collapsible group with its
// own tabs and a per-project "new tab". Replaces the top tab strip.

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

function ArcTab({ t, active, onSelect }: { t: Tab; active: boolean; onSelect: () => void }) {
	const Glyph = Icon[MODE_DEFS[tabMode(t)].icon];
	return (
		<div
			role="tab"
			aria-selected={active}
			tabIndex={active ? 0 : -1}
			className={`arc-tab${active ? ' active' : ''}`}
			onClick={onSelect}
			onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
			onAuxClick={(e) => { if (e.button === 1) { closeTabWithCleanup(t.id); } }}
			title={t.title}
		>
			<span className="glyph"><Glyph /></span>
			<span className="tt">{t.title}</span>
			<button className="x" aria-label={`Close ${t.title}`} onClick={(e) => { e.stopPropagation(); closeTabWithCleanup(t.id); }}><Icon.close /></button>
		</div>
	);
}

export function TabRail() {
	const tabs = useShell((s) => s.tabs);
	const projects = useShell((s) => s.projects);
	const activeTabId = useShell((s) => s.activeTabId);
	const collapsed = useShell((s) => s.collapsedProjects);
	const setActiveTab = useShell((s) => s.setActiveTab);
	const addTab = useShell((s) => s.addTab);
	const addProject = useShell((s) => s.addProject);
	const toggleProject = useShell((s) => s.toggleProject);

	const byProject = new Map<string, Tab[]>();
	for (const p of projects) {
		byProject.set(p.id, []);
	}
	const orphans: Tab[] = [];
	for (const t of tabs) {
		const arr = byProject.get(t.projectId);
		if (arr) {
			arr.push(t);
		} else {
			orphans.push(t);
		}
	}

	return (
		<div className="arc-tabs" role="tablist" aria-label="Projects and tabs">
			{projects.map((p) => {
				const list = byProject.get(p.id) ?? [];
				const isCollapsed = collapsed.includes(p.id);
				return (
					<div className="arc-group" key={p.id}>
						<div className="arc-group-head">
							<button className="gtw" onClick={() => toggleProject(p.id)} aria-expanded={!isCollapsed} aria-label={`Toggle ${p.name}`}>
								<span className={`tw${isCollapsed ? '' : ' open'}`}><Icon.chevron /></span>
							</button>
							<span className="pdot" style={{ background: p.color }} />
							<span className="pname">{p.name}</span>
							<span className="pcount">{list.length}</span>
							<button className="padd" title={`New tab in ${p.name}`} aria-label={`New tab in ${p.name}`} onClick={() => addTab('agents', p.id)}><Icon.plus /></button>
						</div>
						{!isCollapsed && list.map((t) => <ArcTab key={t.id} t={t} active={t.id === activeTabId} onSelect={() => setActiveTab(t.id)} />)}
					</div>
				);
			})}
			{orphans.length > 0 && (
				<div className="arc-group">
					{orphans.map((t) => <ArcTab key={t.id} t={t} active={t.id === activeTabId} onSelect={() => setActiveTab(t.id)} />)}
				</div>
			)}
			<button className="arc-newproj" onClick={() => addProject()}><Icon.plus />New project</button>
		</div>
	);
}
