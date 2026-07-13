// The living architecture map — a real view over the shared project graph.
// Nodes are grouped by kind; selecting one reveals everything connected to it
// (the click-through query). Selecting a file opens it in the editor. This is
// the same graph the command palette and, later, every studio read from.

import { useMemo, useState } from 'react';
import { useGraph } from '../services/graph';
import { connected, groupByKind, KIND_LABEL, type GraphKind, type GraphNode } from '../lib/graph';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { Icon, type IconName } from '../lib/icons';

const KIND_ICON: Record<GraphKind, IconName> = {
	project: 'home',
	file: 'file',
	component: 'builder',
	route: 'browser',
	endpoint: 'command',
	table: 'files',
	test: 'check',
	deployment: 'rocket',
	agent: 'agents',
	task: 'diff',
};

const EDGE_VERB: Record<string, string> = {
	contains: 'contains', imports: 'imports', defines: 'defines',
	renders: 'renders', routes: 'serves', tests: 'tests', calls: 'calls',
};

function KindIcon({ kind }: { kind: GraphKind }) {
	const Glyph = Icon[KIND_ICON[kind]];
	return <Glyph />;
}

export function MapView({ focus }: { focus?: GraphKind[] }) {
	const graph = useGraph();
	const { editor } = useServices();
	const allGroups = useMemo(() => groupByKind(graph), [graph]);
	const groups = focus ? allGroups.filter((g) => focus.includes(g.kind)) : allGroups.filter((g) => g.kind !== 'project');
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const selected = selectedId ? connected(graph, selectedId) : null;

	function activate(node: GraphNode) {
		if (node.path && node.kind === 'file') {
			openFileInActivePane(editor, node.path);
		}
		setSelectedId(node.id);
	}

	if (graph.nodes.size <= 1) {
		return <div className="brain-empty">Mapping the workspace…<br />Add or open files to grow the graph.</div>;
	}

	const total = graph.nodes.size - 1; // exclude the project root

	return (
		<div className="mapview">
			<div className="map-head">
				<Icon.sparkle />
				<span>{total} objects · {graph.edges.length} links</span>
			</div>

			{selected && (
				<div className="map-focus">
					<div className="mf-head">
						<span className={`mchip k-${selected.node.kind}`}><KindIcon kind={selected.node.kind} />{selected.node.label}</span>
						<button className="mf-clear" onClick={() => setSelectedId(null)} title="Clear selection"><Icon.close /></button>
					</div>
					{selected.neighbours.length === 0 ? (
						<div className="mf-empty">No connections yet.</div>
					) : (
						<ul className="mf-list">
							{selected.neighbours.map(({ node, edge, direction }) => (
								<li key={node.id}>
									<button className="mf-row" onClick={() => activate(node)}>
										<span className="mf-verb">{direction === 'out' ? EDGE_VERB[edge.kind] : `${EDGE_VERB[edge.kind]} by`}</span>
										<span className="mf-ic"><KindIcon kind={node.kind} /></span>
										<span className="mf-name">{node.label}</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{focus && groups.length === 0 && (
				<div className="brain-empty">Nothing here yet.<br />The agent will populate this as the project grows.</div>
			)}

			<div className="map-groups">
				{groups.map((g) => (
					<div className="map-group" key={g.kind}>
						<div className="mg-head"><KindIcon kind={g.kind} /><span>{KIND_LABEL[g.kind]}</span><span className="mg-count">{g.nodes.length}</span></div>
						<div className="mg-nodes">
							{g.nodes.map((n) => (
								<button
									key={n.id}
									className={`mnode${selectedId === n.id ? ' on' : ''}`}
									onClick={() => activate(n)}
									title={n.path ?? n.label}
								>
									<KindIcon kind={n.kind} />
									<span className="mn-label">{n.label}</span>
								</button>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
