// The Home dashboard — the cockpit's landing surface.
//
// A live overview of the whole project, aggregated from the real services: the
// graph, the working-tree diff, the database, telemetry, deploys, and agents.
// Every stat is genuine and most tiles jump you to the matching mode; recent
// changes open in the editor. It is the "one graph, many views" thesis at a
// glance.

import { useSyncExternalStore } from 'react';
import { useShell } from '../lib/store';
import { useServices } from '../services/container';
import { useGraph } from '../services/graph';
import { useReview } from '../services/review';
import { useDb } from '../services/db';
import { useObservability } from '../services/observability';
import { useDeploy } from '../services/deploy';
import { openFileInActivePane } from '../lib/openFile';
import { basename } from '../lib/graph';
import { Icon, type IconName } from '../lib/icons';
import type { CockpitMode } from '../lib/types';

function count(kind: string, nodes: Map<string, { kind: string }>): number {
	let n = 0;
	for (const v of nodes.values()) if (v.kind === kind) n++;
	return n;
}

export function HomeDashboard(_props: { paneId: string }) {
	const { editor, agent } = useServices();
	useSyncExternalStore(agent.subscribe, agent.getSnapshot);

	const activeTab = useShell((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]);
	const project = useShell((s) => s.projects.find((p) => p.id === activeTab?.projectId));
	const projects = useShell((s) => s.projects);
	const setCockpitMode = useShell((s) => s.setCockpitMode);

	const graph = useGraph();
	const review = useReview();
	const { schema, data } = useDb();
	const logs = useObservability();
	const { builds, envs } = useDeploy();

	const added = review.reduce((s, f) => s + f.added, 0);
	const removed = review.reduce((s, f) => s + f.removed, 0);
	const rows = schema.reduce((s, t) => s + (data.get(t.name)?.length ?? 0), 0);
	const errors = logs.filter((l) => l.level === 'error').length;
	const live = Object.values(envs).filter((e) => e.current).length;
	const working = projects.filter((p) => agent.isBusy(`proj:${p.id}`)).length;

	interface Tile { label: string; value: string; sub?: string; icon: IconName; mode?: CockpitMode; }
	const tiles: Tile[] = [
		{ label: 'Files', value: String(count('file', graph.nodes)), icon: 'file', mode: 'build' },
		{ label: 'Components', value: String(count('component', graph.nodes)), icon: 'builder', mode: 'design' },
		{ label: 'Changed', value: String(review.length), sub: review.length ? `+${added} −${removed}` : 'clean', icon: 'diff' },
		{ label: 'Tables', value: String(schema.length), sub: `${rows} rows`, icon: 'database', mode: 'data' },
		{ label: 'Errors', value: String(errors), sub: errors ? 'needs attention' : 'all clear', icon: 'activity', mode: 'observe' },
		{ label: 'Builds', value: String(builds.length), sub: live ? `${live} live` : 'none live', icon: 'rocket', mode: 'ship' },
		{ label: 'Workers', value: String(projects.length), sub: working ? `${working} working` : 'idle', icon: 'agents', mode: 'agents' },
		{ label: 'Objects', value: String(Math.max(0, graph.nodes.size - 1)), sub: `${graph.edges.length} links`, icon: 'sparkle' },
	];

	const recent = review.slice(0, 6);

	return (
		<div className="home">
			<div className="home-hero">
				<span className="home-dot" style={{ background: project?.color }} />
				<div>
					<div className="home-title">{project?.name ?? 'Workspace'}</div>
					<div className="home-branch"><Icon.git />main · {graph.nodes.size > 1 ? 'graph live' : 'empty'}</div>
				</div>
			</div>

			<div className="home-tiles">
				{tiles.map((t) => {
					const Glyph = Icon[t.icon];
					return (
						<button key={t.label} className={`tile${t.mode ? ' clickable' : ''}`} onClick={() => t.mode && setCockpitMode(t.mode)} disabled={!t.mode}>
							<span className="tile-ic"><Glyph /></span>
							<span className="tile-val">{t.value}</span>
							<span className="tile-label">{t.label}</span>
							{t.sub && <span className="tile-sub">{t.sub}</span>}
						</button>
					);
				})}
			</div>

			<div className="home-cols">
				<section className="home-card">
					<div className="home-card-head">Recent changes</div>
					{recent.length === 0 ? (
						<div className="home-muted">No changes against the baseline yet.</div>
					) : (
						recent.map((f) => (
							<button className="home-row" key={f.path} onClick={() => openFileInActivePane(editor, f.path)} title={f.path}>
								<span className={`home-badge b-${f.status}`}>{f.status[0].toUpperCase()}</span>
								<span className="home-name">{basename(f.path)}</span>
								<span className="home-stat"><b className="add">+{f.added}</b> <b className="del">−{f.removed}</b></span>
							</button>
						))
					)}
				</section>

				<section className="home-card">
					<div className="home-card-head">Jump to</div>
					<div className="home-jump">
						{(['build', 'data', 'test', 'ship', 'observe', 'design'] as CockpitMode[]).map((m) => (
							<button key={m} onClick={() => setCockpitMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
