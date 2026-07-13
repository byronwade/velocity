// The agent dock — the cockpit's right side.
//
// Agents as observable workers, not chat logs. When a mission is running, a live
// summary sits on top: objective, progress, and the specialist currently at
// work. Below, each workspace's agent shows its status, objective, model, and
// the changes it has made — all read from the real services. Clicking a worker
// focuses its workspace; the footer is the approval inbox. Collapsible.

import { useSyncExternalStore } from 'react';
import { useShell } from '../lib/store';
import { useServices } from '../services/container';
import { useMission } from '../services/mission';
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

function MissionSummary({ onOpen }: { onOpen: () => void }) {
	const mission = useMission();
	if (!mission) return null;
	const done = mission.tasks.filter((t) => t.status === 'done').length;
	const total = mission.tasks.length;
	const running = mission.tasks.find((t) => t.status === 'running');
	const awaiting = mission.tasks.find((t) => t.status === 'awaiting-approval');
	const complete = done === total;
	const state = awaiting ? 'approval' : running ? 'running' : complete ? 'complete' : 'queued';
	const stateLabel = { approval: 'needs approval', running: 'running', complete: 'complete', queued: 'queued' }[state];

	return (
		<button className={`mission-card st-${state}`} onClick={onOpen}>
			<div className="mcx-top">
				<span className="mcx-badge"><Icon.agents /></span>
				<span className="mcx-title">Mission</span>
				<span className={`mcx-state s-${state}`}>{state === 'running' && <span className="spin" />}{stateLabel}</span>
			</div>
			<div className="mcx-obj">{mission.objective}</div>
			<div className="mcx-bar"><span className="mcx-fill" style={{ width: `${(done / total) * 100}%` }} /></div>
			<div className="mcx-foot">
				<span className="mcx-count">{done}/{total} tasks</span>
				{running && <span className="mcx-now"><Icon.play />{running.specialist}</span>}
				{awaiting && <span className="mcx-now approve"><Icon.lock />{awaiting.title}</span>}
			</div>
		</button>
	);
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
	const mission = useMission();
	const pending = mission?.tasks.filter((t) => t.status === 'awaiting-approval').length ?? 0;

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
	const openMission = () => setCockpitMode('agents');

	function focusWorker(projectId: string) {
		setActiveProject(projectId);
		setCockpitMode('agents');
	}

	if (collapsed) {
		return (
			<aside className="adock collapsed">
				<button className="adock-expand" onClick={toggleDock} aria-label="Show agents" title="Show agents">
					<Icon.dock />
					{(workingCount > 0 || pending > 0) && <span className={`adot${pending ? ' warn' : ''}`} />}
				</button>
			</aside>
		);
	}

	return (
		<aside className="adock">
			<div className="adock-head">
				<Icon.agents />
				<b>Agents</b>
				<span className="adock-sub">{workingCount ? `${workingCount} working` : `${workers.length} ready`}</span>
				<span className="sp" />
				<button className="ib" onClick={toggleDock} aria-label="Collapse agents"><Icon.dock /></button>
			</div>
			<div className="adock-body">
				{mission && <MissionSummary onOpen={openMission} />}
				<div className="adock-label">Workspaces</div>
				{workers.map((w) => (
					<button key={w.projectId} className={`wcard${w.projectId === activeProjectId ? ' on' : ''}`} onClick={() => focusWorker(w.projectId)}>
						<span className="wc-av" style={{ background: `linear-gradient(140deg, ${w.color}, color-mix(in srgb, ${w.color} 55%, #000))` }}>{w.name.slice(0, 1).toUpperCase()}</span>
						<div className="wc-main">
							<div className="wc-top">
								<span className="wc-name">{w.name}</span>
								<span className={`wc-status s-${w.status}`}><span className="wc-dotp" />{w.status === 'working' ? 'working' : w.status}</span>
							</div>
							<div className="wc-obj">{w.objective}</div>
							<div className="wc-meta">
								<span className="wc-chip"><Icon.git />main</span>
								<span className="wc-chip"><Icon.sparkle />Local</span>
								{w.filesChanged > 0 && (
									<span className="wc-chip"><Icon.diff /><b className="add">+{w.added}</b> <b className="del">−{w.removed}</b></span>
								)}
							</div>
						</div>
					</button>
				))}
			</div>
			{pending > 0 ? (
				<button className="adock-foot pending" onClick={openMission}>
					<Icon.lock />
					<span>{pending} approval{pending === 1 ? '' : 's'} pending</span>
					<Icon.chevron />
				</button>
			) : (
				<div className="adock-foot">
					<Icon.check />
					<span>No approvals pending</span>
				</div>
			)}
		</aside>
	);
}
