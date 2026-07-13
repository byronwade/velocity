// The Library studio — a live catalog of the project's reusable pieces.
//
// Everything is read from the shared project graph: the components the codebase
// defines, what each one renders and is rendered by, and the file it lives in.
// It's a real inventory (counts update as files change), and every card opens
// its source in the editor.

import { useMemo } from 'react';
import { useGraph } from '../services/graph';
import { useServices } from '../services/container';
import { connected, type GraphNode } from '../lib/graph';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';

interface CardData {
	node: GraphNode;
	renders: GraphNode[];
	renderedBy: GraphNode[];
}

export function LibraryMode(_props: { paneId: string }) {
	const graph = useGraph();
	const { editor } = useServices();

	const { cards, counts } = useMemo(() => {
		const all = [...graph.nodes.values()];
		const components = all.filter((n) => n.kind === 'component').sort((a, b) => a.label.localeCompare(b.label));
		const cards: CardData[] = components.map((node) => {
			const conn = connected(graph, node.id);
			const renders = conn?.neighbours.filter((x) => x.edge.kind === 'renders' && x.direction === 'out').map((x) => x.node) ?? [];
			const renderedBy = conn?.neighbours.filter((x) => x.edge.kind === 'renders' && x.direction === 'in').map((x) => x.node) ?? [];
			return { node, renders, renderedBy };
		});
		const count = (k: string) => all.filter((n) => n.kind === k).length;
		return { cards, counts: { component: count('component'), route: count('route'), endpoint: count('endpoint'), file: count('file') } };
	}, [graph]);

	function open(node: GraphNode) {
		if (node.path) {
			openFileInActivePane(editor, node.path);
		}
	}

	return (
		<div className="library">
			<div className="lib-head">
				<div className="lib-title"><Icon.grid /><span>Component Library</span></div>
				<div className="lib-stats">
					<span className="lib-stat"><b>{counts.component}</b> components</span>
					<span className="lib-stat"><b>{counts.route}</b> routes</span>
					<span className="lib-stat"><b>{counts.endpoint}</b> endpoints</span>
					<span className="lib-stat"><b>{counts.file}</b> files</span>
				</div>
			</div>
			{cards.length === 0 ? (
				<div className="lib-empty">No components yet. Export a React component from a <code>.tsx</code> file to see it here.</div>
			) : (
				<div className="lib-grid">
					{cards.map(({ node, renders, renderedBy }) => (
						<button key={node.id} className="lib-card" onClick={() => open(node)} title={`Open ${node.path ?? node.label}`}>
							<div className="lib-card-top">
								<span className="lib-badge"><Icon.builder /></span>
								<span className="lib-name">{node.label}</span>
								<Icon.forward />
							</div>
							{node.path && <div className="lib-path">{node.path}</div>}
							<div className="lib-rel">
								{renders.length > 0 && (
									<div className="lib-rel-row"><span className="lib-rel-k">renders</span>{renders.map((r) => <span key={r.id} className="lib-chip">{r.label}</span>)}</div>
								)}
								{renderedBy.length > 0 && (
									<div className="lib-rel-row"><span className="lib-rel-k">used by</span>{renderedBy.map((r) => <span key={r.id} className="lib-chip">{r.label}</span>)}</div>
								)}
								{renders.length === 0 && renderedBy.length === 0 && (
									<div className="lib-rel-row"><span className="lib-rel-none">leaf component</span></div>
								)}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
