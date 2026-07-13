// Mission Control — the swarm's task graph.
//
// The orchestrator's decomposition of an objective into specialist tasks, with
// live status and the real evidence each task produced. Gated tasks (deploy)
// wait here for approval. Start a mission from an objective; watch it drive
// itself through scaffold → test → review → (approve) → deploy.

import { useState } from 'react';
import { useMission, type Specialist, type Task, type TaskStatus } from '../services/mission';
import { useServices } from '../services/container';
import { Icon, type IconName } from '../lib/icons';

const SPECIALIST_ICON: Record<Specialist, IconName> = {
	architecture: 'sparkle', frontend: 'builder', design: 'layers',
	testing: 'beaker', review: 'diff', deployment: 'rocket',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
	blocked: 'blocked', ready: 'queued', running: 'running', done: 'done', 'awaiting-approval': 'approval',
};

function TaskCard({ task }: { task: Task }) {
	const { mission } = useServices();
	const Glyph = Icon[SPECIALIST_ICON[task.specialist]];
	return (
		<div className={`mc-task s-${task.status}`}>
			<span className="mc-rail"><span className="mc-node" /></span>
			<div className="mc-body">
				<div className="mc-top">
					<span className="mc-spec"><Glyph />{task.specialist}</span>
					<span className="mc-title">{task.title}</span>
					<span className={`mc-status st-${task.status}`}>{task.status === 'running' ? <><span className="spin" />running</> : STATUS_LABEL[task.status]}</span>
				</div>
				{task.evidence && <div className="mc-evidence">{task.evidence}</div>}
				{task.status === 'awaiting-approval' && (
					<button className="mc-approve" onClick={() => mission.approve(task.id)}><Icon.check />Approve &amp; deploy</button>
				)}
			</div>
		</div>
	);
}

export function MissionControl(_props: { paneId: string }) {
	const mission = useMission();
	const { mission: svc } = useServices();
	const [objective, setObjective] = useState('');

	function start() {
		const t = objective.trim();
		if (!t) return;
		svc.start(t);
		setObjective('');
	}

	const done = mission?.tasks.filter((t) => t.status === 'done').length ?? 0;
	const total = mission?.tasks.length ?? 0;

	return (
		<div className="mc">
			<div className="mc-compose">
				<input
					value={objective}
					placeholder="Give the swarm an objective — e.g. build a pricing page"
					onChange={(e) => setObjective(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
				/>
				<button className="mc-start" onClick={start}><Icon.sparkle />Start</button>
			</div>

			{!mission ? (
				<div className="mc-empty">
					<Icon.agents />
					<div>No active mission.</div>
					<div className="mc-empty-sub">The orchestrator will decompose your objective into specialist tasks and drive them — scaffold, test, review, then deploy on your approval.</div>
				</div>
			) : (
				<>
					<div className="mc-head">
						<div className="mc-obj">{mission.objective}</div>
						<div className="mc-meta">started {mission.startedAt} · <b>{done}/{total}</b> complete</div>
					</div>
					<div className="mc-tasks">
						{mission.tasks.map((t) => <TaskCard key={t.id} task={t} />)}
					</div>
				</>
			)}
		</div>
	);
}
