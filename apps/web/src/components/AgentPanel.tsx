// The workspace navigator — the persistent left panel for the IDE. A view
// switcher shows different lenses on the project (Files · Map · Review). Talking
// to the agent lives in the floating command bar, not here, so this panel stays
// focused on navigating and understanding the workspace.

import { useEffect, useState } from 'react';
import { useShell } from '../lib/store';
import { Explorer } from './Sidebar';
import { MapView } from './MapView';
import { ReviewView } from './ReviewView';
import { BrowserSidebar } from './BrowserSidebar';
import { useServices } from '../services/container';
import { Icon } from '../lib/icons';
import type { CockpitMode } from '../lib/types';
import type { GraphKind } from '../lib/graph';

type View = 'files' | 'map' | 'changes';

// The cockpit mode sets the panel's default lens; the view tabs still override.
const MODE_VIEW: Record<CockpitMode, View> = {
	home: 'map', build: 'files', design: 'map', browse: 'files', data: 'map',
	test: 'map', ship: 'map', observe: 'changes', agents: 'map', library: 'map',
};
// When a mode's lens is the map, focus it on that mode's kinds.
const MODE_FOCUS: Partial<Record<CockpitMode, GraphKind[]>> = {
	design: ['route', 'component'], data: ['table'], test: ['test'],
	ship: ['deployment'], library: ['component'],
};

export function AgentPanel() {
	const activeTab = useShell((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]);
	const project = useShell((s) => s.projects.find((p) => p.id === activeTab?.projectId));
	const projects = useShell((s) => s.projects);
	const setActiveProject = useShell((s) => s.setActiveProject);
	const addProject = useShell((s) => s.addProject);
	const cockpitMode = useShell((s) => s.cockpitMode);
	const toggleBrain = useShell((s) => s.toggleBrain);
	const [view, setView] = useState<View>('files');
	const [wsOpen, setWsOpen] = useState(false);
	const { graph } = useServices();

	// Keep the graph's root project node named after the active workspace.
	useEffect(() => {
		if (project?.name) {
			graph.setProjectName(project.name);
		}
	}, [graph, project?.name]);

	// The chosen operating mode drives the brain's lens.
	useEffect(() => {
		setView(MODE_VIEW[cockpitMode]);
	}, [cockpitMode]);

	// Dismiss the workspace menu on outside click.
	useEffect(() => {
		if (!wsOpen) return;
		const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.wsswitch')) setWsOpen(false); };
		document.addEventListener('mousedown', close);
		return () => document.removeEventListener('mousedown', close);
	}, [wsOpen]);

	const mapFocus = MODE_FOCUS[cockpitMode];

	return (
		<section className="brain">
			<div className="brain-head">
				<div className="wsswitch">
					<button className="wsbtn" onClick={() => setWsOpen((o) => !o)} aria-expanded={wsOpen} title="Switch workspace">
						<span className="pdot" style={{ background: project?.color }} />
						<b className="bname">{project?.name ?? 'Project'}</b>
						<Icon.chevron />
					</button>
					{wsOpen && (
						<div className="wsmenu">
							{projects.map((p) => (
								<button key={p.id} className={p.id === project?.id ? 'on' : ''} onClick={() => { setActiveProject(p.id); setWsOpen(false); }}>
									<span className="pdot" style={{ background: p.color }} />
									<span className="wsname">{p.name}</span>
									{p.id === project?.id && <Icon.check />}
								</button>
							))}
							<button className="wsadd" onClick={() => { addProject(); setWsOpen(false); }}><Icon.plus />New workspace</button>
						</div>
					)}
				</div>
				<span className="bbranch"><Icon.git />main</span>
				<span className="sp" />
				<button className="ib bcollapse" onClick={toggleBrain} title="Hide panel (⌘B)" aria-label="Hide panel"><Icon.panelLeft /></button>
			</div>
			{cockpitMode === 'browse' ? (
				<div className="brain-body"><BrowserSidebar /></div>
			) : (
				<>
					<div className="bviews" role="tablist" aria-label="Workspace views">
						{(['files', 'map', 'changes'] as View[]).map((v) => (
							<button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
								{v === 'changes' ? 'Review' : v[0].toUpperCase() + v.slice(1)}
							</button>
						))}
					</div>
					<div className="brain-body">
						{view === 'files' && <div className="brain-files"><Explorer /></div>}
						{view === 'map' && <MapView focus={mapFocus} />}
						{view === 'changes' && <ReviewView />}
					</div>
				</>
			)}
		</section>
	);
}
