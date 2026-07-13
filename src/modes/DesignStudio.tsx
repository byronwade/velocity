// The Design studio — a Framer/Figma-style canvas over the real project.
//
// Routes and components from the shared graph become frames on an infinite,
// pannable, zoomable canvas. A left Layers panel lists them; the right Inspector
// shows the selected frame's real facts (path, kind, graph connections) and the
// project's actual design tokens (colours + values parsed from its CSS). Click a
// frame's file to open the source. Everything shown is derived from the workspace.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useDesign } from '../services/design';
import { useGraph } from '../services/graph';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';
import { connected, type GraphNode, type ProjectGraph } from '../lib/graph';

interface Frame {
	node: GraphNode;
	kind: 'route' | 'component';
	x: number;
	y: number;
	w: number;
	h: number;
}

const GAP = 56;
const ROUTE = { w: 360, h: 460 };
const COMP = { w: 264, h: 184 };

/** Deterministically lay frames out on the world: routes in a top row, then
 *  components flowing in a grid beneath them. Pure function of the node list. */
function layout(routes: GraphNode[], components: GraphNode[]): Frame[] {
	const frames: Frame[] = [];
	let x = 0;
	for (const n of routes) {
		frames.push({ node: n, kind: 'route', x, y: 0, w: ROUTE.w, h: ROUTE.h });
		x += ROUTE.w + GAP;
	}
	const cols = Math.max(3, Math.min(4, Math.ceil(Math.sqrt(components.length))));
	const top = routes.length ? ROUTE.h + GAP + 40 : 0;
	components.forEach((n, i) => {
		const col = i % cols;
		const row = Math.floor(i / cols);
		frames.push({ node: n, kind: 'component', x: col * (COMP.w + GAP), y: top + row * (COMP.h + GAP), w: COMP.w, h: COMP.h });
	});
	return frames;
}

/** A small deterministic 0..1 from a string — used to vary the wireframes. */
function hash(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
	return (Math.abs(h) % 1000) / 1000;
}

/** A schematic preview of a frame's content (like a Figma frame thumbnail),
 *  derived from the node — not a screenshot, a wireframe built from its shape. */
function Wire({ frame }: { frame: Frame }) {
	const h = hash(frame.node.label);
	if (frame.kind === 'route') {
		return (
			<div className="dz-wire dz-wire-page">
				<div className="w-nav"><span className="w-logo" /><span className="w-navlinks"><i /><i /><i /></span></div>
				<div className="w-hero">
					<span className="w-pill" />
					<span className="w-h1" style={{ width: `${60 + h * 25}%` }} />
					<span className="w-h1 sm" style={{ width: `${40 + h * 20}%` }} />
					<span className="w-line" style={{ width: `${70 + h * 20}%` }} />
					<span className="w-line" style={{ width: `${55 + h * 25}%` }} />
					<span className="w-cta" />
				</div>
				<div className="w-cards">{[0, 1, 2].map((i) => <span key={i} className="w-card" />)}</div>
			</div>
		);
	}
	return (
		<div className="dz-wire dz-wire-comp">
			<span className="w-bar" style={{ width: `${45 + h * 30}%` }} />
			<span className="w-line" style={{ width: `${80 - h * 20}%` }} />
			<span className="w-line" style={{ width: `${65 - h * 15}%` }} />
			<span className="w-chip" />
		</div>
	);
}

export function DesignStudio(_props: { paneId: string }) {
	const tokens = useDesign();
	const graph = useGraph() as ProjectGraph;
	const { editor } = useServices();

	const colors = tokens.filter((t) => t.isColor);
	const values = tokens.filter((t) => !t.isColor);

	const routes = useMemo(() => [...graph.nodes.values()].filter((n) => n.kind === 'route').sort((a, b) => a.label.localeCompare(b.label)), [graph]);
	const components = useMemo(() => [...graph.nodes.values()].filter((n) => n.kind === 'component').sort((a, b) => a.label.localeCompare(b.label)), [graph]);
	const frames = useMemo(() => layout(routes, components), [routes, components]);

	const [sel, setSel] = useState<string | null>(null);
	const [view, setView] = useState({ x: 80, y: 72, z: 0.7 });
	const canvasRef = useRef<HTMLDivElement>(null);

	// Pan by dragging empty canvas.
	const onPointerDown = useCallback((e: React.PointerEvent) => {
		if ((e.target as HTMLElement).closest('.dz-frame')) return;
		setSel(null);
		const startX = e.clientX;
		const startY = e.clientY;
		let base = { x: 0, y: 0 };
		setView((v) => { base = v; return v; });
		const move = (ev: PointerEvent) => {
			setView((v) => ({ ...v, x: base.x + (ev.clientX - startX), y: base.y + (ev.clientY - startY) }));
		};
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			document.body.style.cursor = '';
		};
		document.body.style.cursor = 'grabbing';
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}, []);

	// ⌘/Ctrl + wheel zooms toward the cursor; plain wheel pans.
	const onWheel = useCallback((e: React.WheelEvent) => {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			const rect = canvasRef.current?.getBoundingClientRect();
			const cx = e.clientX - (rect?.left ?? 0);
			const cy = e.clientY - (rect?.top ?? 0);
			setView((v) => {
				const z = Math.max(0.15, Math.min(2.5, v.z * (1 - e.deltaY * 0.0016)));
				const k = z / v.z;
				return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
			});
		} else {
			setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
		}
	}, []);

	const zoomBy = (factor: number) => setView((v) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		const cx = (rect?.width ?? 800) / 2;
		const cy = (rect?.height ?? 600) / 2;
		const z = Math.max(0.15, Math.min(2.5, v.z * factor));
		const k = z / v.z;
		return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
	});
	const resetView = () => setView({ x: 80, y: 72, z: 0.7 });

	function focusFrame(f: Frame) {
		setSel(f.node.id);
		const rect = canvasRef.current?.getBoundingClientRect();
		const cw = rect?.width ?? 800;
		const ch = rect?.height ?? 600;
		setView((v) => ({ ...v, x: cw / 2 - (f.x + f.w / 2) * v.z, y: ch / 2 - (f.y + f.h / 2) * v.z }));
	}

	const selNode = sel ? graph.nodes.get(sel) ?? null : null;
	const conns = sel ? connected(graph, sel) : null;

	if (frames.length === 0 && tokens.length === 0) {
		return <div className="ds-empty">No design system yet.<br />Add routes, components, or CSS custom properties and they'll appear on the canvas.</div>;
	}

	return (
		<div className="dz">
			{/* Layers */}
			<aside className="dz-layers">
				<div className="dz-pane-head">Layers</div>
				<div className="dz-layer-scroll">
					{routes.length > 0 && <div className="dz-layer-group">Pages</div>}
					{routes.map((n) => (
						<button key={n.id} className={`dz-layer${sel === n.id ? ' on' : ''}`} onClick={() => focusFrame(frames.find((f) => f.node.id === n.id)!)}>
							<Icon.browser /><span>{n.label}</span>
						</button>
					))}
					{components.length > 0 && <div className="dz-layer-group">Components</div>}
					{components.map((n) => (
						<button key={n.id} className={`dz-layer${sel === n.id ? ' on' : ''}`} onClick={() => focusFrame(frames.find((f) => f.node.id === n.id)!)}>
							<Icon.builder /><span>{n.label}</span>
						</button>
					))}
				</div>
			</aside>

			{/* Canvas */}
			<div className="dz-stage">
				<div className="dz-toolbar">
					<div className="dz-tools">
						<button className="dz-tool on" title="Move" aria-label="Move"><Icon.command /></button>
						<button className="dz-tool" title="Frame" aria-label="Frame"><Icon.grid /></button>
						<button className="dz-tool" title="Layers" aria-label="Layers"><Icon.layers /></button>
					</div>
					<span className="dz-sp" />
					<div className="dz-zoom">
						<button title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(0.8)}><Icon.minus /></button>
						<button className="dz-zval" title="Reset view" onClick={resetView}>{Math.round(view.z * 100)}%</button>
						<button title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(1.25)}><Icon.plus /></button>
					</div>
				</div>
				<div ref={canvasRef} className="dz-canvas" onPointerDown={onPointerDown} onWheel={onWheel}>
					<div className="dz-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
						{frames.map((f) => (
							<div
								key={f.node.id}
								className={`dz-frame${sel === f.node.id ? ' sel' : ''}`}
								style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
								onPointerDown={(e) => { e.stopPropagation(); setSel(f.node.id); }}
							>
								<div className="dz-frame-label">{f.node.label}</div>
								<div className="dz-frame-body"><Wire frame={f} /></div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Inspector */}
			<aside className="dz-inspector">
				{selNode ? (
					<div className="dz-insp-scroll">
						<div className="dz-pane-head">{selNode.label}</div>
						<div className="dz-insp-sec">
							<div className="dz-insp-row"><span>Type</span><b>{selNode.kind}</b></div>
							{selNode.path && <div className="dz-insp-row"><span>File</span><b className="mono">{selNode.path}</b></div>}
							{selNode.path && <button className="dz-open" onClick={() => openFileInActivePane(editor, selNode.path!)}><Icon.editor />Open source</button>}
						</div>
						{conns && conns.neighbours.length > 0 && (
							<div className="dz-insp-sec">
								<div className="dz-insp-title">Connections</div>
								{conns.neighbours.map((nb) => (
									<button key={nb.node.id} className="dz-conn" onClick={() => { const f = frames.find((x) => x.node.id === nb.node.id); if (f) focusFrame(f); }}>
										<span className="dz-conn-edge">{nb.direction === 'out' ? nb.edge.kind : `${nb.edge.kind} by`}</span>
										<span className="dz-conn-name">{nb.node.label}</span>
									</button>
								))}
							</div>
						)}
					</div>
				) : (
					<div className="dz-insp-scroll">
						<div className="dz-pane-head">Design tokens</div>
						{colors.length > 0 && (
							<div className="dz-insp-sec">
								<div className="dz-insp-title">Colors <span>{colors.length}</span></div>
								<div className="dz-swatches">
									{colors.map((t) => (
										<div className="dz-swatch" key={t.name} title={`${t.name}: ${t.value}`}>
											<span className="dz-chip" style={{ background: t.value }} />
											<span className="dz-sw-name">{t.name}</span>
										</div>
									))}
								</div>
							</div>
						)}
						{values.length > 0 && (
							<div className="dz-insp-sec">
								<div className="dz-insp-title">Values <span>{values.length}</span></div>
								{values.map((t) => (
									<div className="dz-insp-row" key={t.name}><span className="mono">{t.name}</span><b className="mono">{t.value}</b></div>
								))}
							</div>
						)}
						<div className="dz-insp-hint">Select a frame to inspect it.</div>
					</div>
				)}
			</aside>
		</div>
	);
}
