// The Design studio — the workspace's design system, for real.
//
// Colour and value tokens are parsed from the project's own CSS (DesignService);
// the component and route inventories come straight from the shared graph. A
// component here is a real application component — click it to open its source.

import { useMemo } from 'react';
import { useDesign } from '../services/design';
import { useGraph } from '../services/graph';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';
import type { GraphNode } from '../lib/graph';

export function DesignStudio(_props: { paneId: string }) {
	const tokens = useDesign();
	const graph = useGraph();
	const { editor } = useServices();

	const colors = tokens.filter((t) => t.isColor);
	const values = tokens.filter((t) => !t.isColor);

	const components = useMemo(() => [...graph.nodes.values()].filter((n) => n.kind === 'component').sort((a, b) => a.label.localeCompare(b.label)), [graph]);
	const routes = useMemo(() => [...graph.nodes.values()].filter((n) => n.kind === 'route').sort((a, b) => a.label.localeCompare(b.label)), [graph]);

	function open(n: GraphNode) {
		if (n.path) openFileInActivePane(editor, n.path);
	}

	const empty = tokens.length === 0 && components.length === 0;
	if (empty) {
		return <div className="ds-empty">No design system yet.<br />Add CSS custom properties or components and they'll appear here.</div>;
	}

	return (
		<div className="design">
			{colors.length > 0 && (
				<section className="ds-sec">
					<div className="ds-sec-head"><span>Colors</span><span className="ds-n">{colors.length}</span></div>
					<div className="ds-swatches">
						{colors.map((t) => (
							<div className="ds-swatch" key={t.name} title={`${t.name}: ${t.value}`}>
								<div className="ds-chip" style={{ background: t.value }} />
								<div className="ds-sw-name">{t.name}</div>
								<div className="ds-sw-val">{t.value}</div>
							</div>
						))}
					</div>
				</section>
			)}

			{values.length > 0 && (
				<section className="ds-sec">
					<div className="ds-sec-head"><span>Tokens</span><span className="ds-n">{values.length}</span></div>
					<div className="ds-tokens">
						{values.map((t) => (
							<div className="ds-token" key={t.name}>
								<span className="ds-tk-name">{t.name}</span>
								<span className="ds-tk-val">{t.value}</span>
							</div>
						))}
					</div>
				</section>
			)}

			{components.length > 0 && (
				<section className="ds-sec">
					<div className="ds-sec-head"><span>Components</span><span className="ds-n">{components.length}</span></div>
					<div className="ds-grid">
						{components.map((n) => (
							<button className="ds-card" key={n.id} onClick={() => open(n)} title={n.path}>
								<span className="ds-card-ic"><Icon.builder /></span>
								<span className="ds-card-name">{n.label}</span>
								{n.path && <span className="ds-card-file">{n.path}</span>}
							</button>
						))}
					</div>
				</section>
			)}

			{routes.length > 0 && (
				<section className="ds-sec">
					<div className="ds-sec-head"><span>Routes</span><span className="ds-n">{routes.length}</span></div>
					<div className="ds-routes">
						{routes.map((n) => (
							<button className="ds-route" key={n.id} onClick={() => open(n)} title={n.path}><Icon.browser />{n.label}</button>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
