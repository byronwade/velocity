// The Agent "brain" — the persistent left panel that controls the workspace.
// A view switcher shows different lenses on the project (Chat · Files · Changes)
// while the composer stays pinned at the bottom. The agent is scoped per project.

import { useEffect, useState } from 'react';
import { useShell } from '../lib/store';
import { AgentThread, AgentComposer } from '../modes/AgentsMode';
import { Explorer } from './Sidebar';
import { MapView } from './MapView';
import { useAgentThread } from '../services/agent';
import { useServices } from '../services/container';
import { Icon } from '../lib/icons';
import type { CockpitMode } from '../lib/types';
import type { GraphKind } from '../lib/graph';

type View = 'chat' | 'files' | 'map' | 'changes';

function basename(p: string): string {
	const i = p.lastIndexOf('/');
	return i === -1 ? p : p.slice(i + 1);
}

function ChangesView({ brainKey }: { brainKey: string }) {
	const { thread } = useAgentThread(brainKey);
	const map = new Map<string, { added: number; removed: number }>();
	for (const m of thread) {
		for (const c of m.changes ?? []) {
			const prev = map.get(c.path) ?? { added: 0, removed: 0 };
			map.set(c.path, { added: prev.added + c.added, removed: prev.removed + c.removed });
		}
	}
	const files = [...map.entries()];
	if (files.length === 0) {
		return <div className="brain-empty">No changes yet.<br />Ask the agent to build or edit something.</div>;
	}
	return (
		<div className="brain-changes">
			<div className="cc-head"><span>{files.length} File{files.length === 1 ? '' : 's'} Changed</span></div>
			{files.map(([path, s]) => (
				<div className="cc-row" key={path} title={path}>
					<Icon.file />
					<span className="cc-name">{basename(path)}</span>
					<span className="cc-stat"><span className="add">+{s.added}</span> <span className="del">−{s.removed}</span></span>
				</div>
			))}
		</div>
	);
}

// The cockpit mode sets the brain's default lens; the view tabs still override.
const MODE_VIEW: Record<CockpitMode, View> = {
	home: 'map', build: 'files', design: 'map', browse: 'chat', data: 'map',
	test: 'map', ship: 'map', observe: 'changes', agents: 'chat', library: 'map',
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
	const [view, setView] = useState<View>('chat');
	const [wsOpen, setWsOpen] = useState(false);
	const brainKey = `proj:${project?.id ?? 'none'}`;
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
				<div className="bviews" role="tablist" aria-label="Agent views">
					{(['chat', 'files', 'map', 'changes'] as View[]).map((v) => (
						<button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
							{v[0].toUpperCase() + v.slice(1)}
						</button>
					))}
				</div>
			</div>
			<div className="brain-body">
				{view === 'chat' && <AgentThread brainKey={brainKey} />}
				{view === 'files' && <div className="brain-files"><Explorer /></div>}
				{view === 'map' && <MapView focus={mapFocus} />}
				{view === 'changes' && <ChangesView brainKey={brainKey} />}
			</div>
			<AgentComposer brainKey={brainKey} />
		</section>
	);
}
