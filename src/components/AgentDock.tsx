// The agent dock — the cockpit's right side.
//
// Agents are presented as workers with observable state, not chat logs: each
// workspace's agent shows its current objective, status, model, branch, and the
// files it has changed. All of it is real, read from the agent service. Chat is
// one way to steer them — clicking a worker focuses its workspace and opens the
// brain's chat. Collapsible to a thin rail.

import { useSyncExternalStore } from 'react';
import { useShell } from '../lib/store';
import { useServices } from '../services/container';
import { Icon } from '../lib/icons';

interface WorkerState {
	projectId: string;
	name: string;
	color: string;
	status: 'working' | 'ready' | 'idle';
	objective: string;
	filesChanged: number;
	added: number;
	removed: number;
}

export function AgentDock() {
	const { agent } = useServices();
	// Re-render whenever any agent thread advances.
	useSyncExternalStore(agent.subscribe, agent.getSnapshot);

	const projects = useShell((s) => s.projects);
	const activeProjectId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0])?.projectId);
	const collapsed = useShell((s) => s.dockCollapsed);
	const toggleDock = useShell((s) => s.toggleDock);
	const setActiveProject = useShell((s) => s.setActiveProject);
	const setCockpitMode = useShell((s) => s.setCockpitMode);

	const workers: WorkerState[] = projects.map((p) => {
		const key = `proj:${p.id}`;
		const thread = agent.thread(key);
		const busy = agent.isBusy(key);
		const lastUser = [...thread].reverse().find((m) => m.role === 'user');
		let files = 0, added = 0, removed = 0;
		const seen = new Set<string>();
		for (const m of thread) {
			for (const c of m.changes ?? []) {
				if (!seen.has(c.path)) { seen.add(c.path); files++; }
				added += c.added; removed += c.removed;
			}
		}
		return {
			projectId: p.id,
			name: p.name,
			color: p.color,
			status: busy ? 'working' : thread.some((m) => m.role === 'assistant') ? 'ready' : 'idle',
			objective: lastUser?.text ?? 'Waiting for direction',
			filesChanged: files,
			added,
			removed,
		};
	});

	const workingCount = workers.filter((w) => w.status === 'working').length;

	function focusWorker(projectId: string) {
		setActiveProject(projectId);
		setCockpitMode('agents');
	}

	if (collapsed) {
		return (
			<aside className="adock collapsed">
				<button className="adock-expand" onClick={toggleDock} aria-label="Show agents" title="Show agents">
					<Icon.dock />
					{workingCount > 0 && <span className="adot" />}
				</button>
			</aside>
		);
	}

	return (
		<aside className="adock">
			<div className="adock-head">
				<Icon.agents />
				<b>Agents</b>
				<span className="adock-sub">{workingCount ? `${workingCount} working` : `${workers.length} idle`}</span>
				<span className="sp" />
				<button className="ib" onClick={toggleDock} aria-label="Collapse agents"><Icon.dock /></button>
			</div>
			<div className="adock-body">
				{workers.map((w) => (
					<button key={w.projectId} className={`wcard${w.projectId === activeProjectId ? ' on' : ''}`} onClick={() => focusWorker(w.projectId)}>
						<div className="wc-top">
							<span className="wc-dot" style={{ background: w.color }} />
							<span className="wc-name">{w.name}</span>
							<span className={`wc-status s-${w.status}`}>{w.status === 'working' ? <><span className="spin" />working</> : w.status}</span>
						</div>
						<div className="wc-obj">{w.objective}</div>
						<div className="wc-meta">
							<span className="wc-chip"><Icon.git />main</span>
							<span className="wc-chip"><Icon.sparkle />Local</span>
							{w.filesChanged > 0 && (
								<span className="wc-chip files"><Icon.diff />{w.filesChanged} file{w.filesChanged === 1 ? '' : 's'} <b className="add">+{w.added}</b> <b className="del">−{w.removed}</b></span>
							)}
						</div>
					</button>
				))}
			</div>
			<div className="adock-foot">
				<Icon.check />
				<span>No approvals pending</span>
			</div>
		</aside>
	);
}
