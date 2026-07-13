// The Design studio — a Framer-style canvas over the REAL project.
//
// The workspace app is rendered live (PreviewService) into device artboards
// (Desktop · Tablet · Mobile) on an infinite, pannable, zoomable canvas — so
// you see the actual running product at each breakpoint, not a mockup. Routes
// and components from the shared graph appear as additional frames. The left
// panel lists everything (Pages / Layers); the right panel is the Style
// inspector: the project's real design tokens are LIVE-EDITABLE — change a
// colour and the app + every artboard restyle instantly.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useDesign } from '../services/design';
import { usePreview } from '../services/preview';
import { useGraph } from '../services/graph';
import { useServices } from '../services/container';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';
import { connected, type GraphNode, type ProjectGraph } from '../lib/graph';
import type { Token } from '../lib/design';
import type { IFileSystem } from '../services/filesystem';

type FrameKind = 'device' | 'route' | 'component';
interface Frame {
	id: string;
	label: string;
	kind: FrameKind;
	node: GraphNode | null;
	x: number;
	y: number;
	w: number;
	h: number;
}

const GAP = 72;
const DEVICES = [
	{ id: 'desktop', label: 'Desktop', w: 1440, h: 900 },
	{ id: 'tablet', label: 'Tablet', w: 834, h: 1040 },
	{ id: 'mobile', label: 'Mobile', w: 390, h: 844 },
];
const ROUTE = { w: 420, h: 560 };
const COMP = { w: 300, h: 200 };

/** Lay out device artboards in a row, routes to their right, components below. */
function layout(routes: GraphNode[], components: GraphNode[]): Frame[] {
	const frames: Frame[] = [];
	let x = 0;
	const rowH = Math.max(...DEVICES.map((d) => d.h));
	for (const d of DEVICES) {
		frames.push({ id: `device:${d.id}`, label: `${d.label} · ${d.w}`, kind: 'device', node: null, x, y: 0, w: d.w, h: d.h });
		x += d.w + GAP;
	}
	for (const n of routes) {
		frames.push({ id: n.id, label: n.label, kind: 'route', node: n, x, y: 0, w: ROUTE.w, h: ROUTE.h });
		x += ROUTE.w + GAP;
	}
	const cols = Math.max(4, Math.min(6, components.length));
	const top = rowH + GAP + 44;
	components.forEach((n, i) => {
		frames.push({ id: n.id, label: n.label, kind: 'component', node: n, x: (i % cols) * (COMP.w + GAP), y: top + Math.floor(i / cols) * (COMP.h + GAP), w: COMP.w, h: COMP.h });
	});
	return frames;
}

/** Deterministic 0..1 from a string — varies the component wireframes. */
function hash(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
	return (Math.abs(h) % 1000) / 1000;
}

/** A schematic wireframe for a component/route frame (Figma-thumbnail style). */
function Wire({ frame }: { frame: Frame }) {
	const h = hash(frame.label);
	if (frame.kind === 'route') {
		return (
			<div className="dz-wire dz-wire-page">
				<div className="w-nav"><span className="w-logo" /><span className="w-navlinks"><i /><i /><i /></span></div>
				<div className="w-hero">
					<span className="w-pill" />
					<span className="w-h1" style={{ width: `${60 + h * 25}%` }} />
					<span className="w-h1 sm" style={{ width: `${40 + h * 20}%` }} />
					<span className="w-line" style={{ width: `${70 + h * 20}%` }} />
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

/** Rewrite a token's value in its source CSS and persist — the edit propagates
 *  through the DesignService and restyles every live artboard. */
async function writeToken(fs: IFileSystem, token: Token, next: string): Promise<void> {
	let css: string;
	try { css = await fs.readFile(token.file); } catch { return; }
	const re = new RegExp(`(${token.name.replace(/-/g, '\\-')}\\s*:\\s*)([^;]+)(;)`);
	if (!re.test(css)) return;
	await fs.writeFile(token.file, css.replace(re, `$1${next}$3`));
}

export function DesignStudio(_props: { paneId: string }) {
	const tokens = useDesign();
	const previewHtml = usePreview();
	const graph = useGraph() as ProjectGraph;
	const { editor, fs } = useServices();

	const colors = tokens.filter((t) => t.isColor);
	const values = tokens.filter((t) => !t.isColor);
	const isHex = (v: string) => /^#([0-9a-f]{6})$/i.test(v.trim());

	const routes = useMemo(() => [...graph.nodes.values()].filter((n) => n.kind === 'route').sort((a, b) => a.label.localeCompare(b.label)), [graph]);
	const components = useMemo(() => [...graph.nodes.values()].filter((n) => n.kind === 'component').sort((a, b) => a.label.localeCompare(b.label)), [graph]);
	const frames = useMemo(() => layout(routes, components), [routes, components]);

	const [sel, setSel] = useState<string | null>('device:desktop');
	const [view, setView] = useState({ x: 60, y: 90, z: 0.42 });
	const canvasRef = useRef<HTMLDivElement>(null);

	const onPointerDown = useCallback((e: React.PointerEvent) => {
		if ((e.target as HTMLElement).closest('.dz-frame')) return;
		setSel(null);
		const startX = e.clientX, startY = e.clientY;
		let base = { x: 0, y: 0 };
		setView((v) => { base = v; return v; });
		const move = (ev: PointerEvent) => setView((v) => ({ ...v, x: base.x + (ev.clientX - startX), y: base.y + (ev.clientY - startY) }));
		const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
		document.body.style.cursor = 'grabbing';
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}, []);

	const onWheel = useCallback((e: React.WheelEvent) => {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			const rect = canvasRef.current?.getBoundingClientRect();
			const cx = e.clientX - (rect?.left ?? 0), cy = e.clientY - (rect?.top ?? 0);
			setView((v) => {
				const z = Math.max(0.1, Math.min(2.5, v.z * (1 - e.deltaY * 0.0016)));
				const k = z / v.z;
				return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
			});
		} else {
			setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
		}
	}, []);

	const zoomBy = (factor: number) => setView((v) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		const cx = (rect?.width ?? 800) / 2, cy = (rect?.height ?? 600) / 2;
		const z = Math.max(0.1, Math.min(2.5, v.z * factor));
		const k = z / v.z;
		return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
	});
	const resetView = () => setView({ x: 60, y: 90, z: 0.42 });

	function focusFrame(f: Frame | undefined) {
		if (!f) return;
		setSel(f.id);
		const rect = canvasRef.current?.getBoundingClientRect();
		const cw = rect?.width ?? 800, ch = rect?.height ?? 600;
		const z = f.kind === 'device' ? Math.min(0.6, (ch - 120) / f.h) : 0.8;
		setView({ z, x: cw / 2 - (f.x + f.w / 2) * z, y: ch / 2 - (f.y + f.h / 2) * z });
	}

	const selFrame = frames.find((f) => f.id === sel) ?? null;
	const selNode = sel && !sel.startsWith('device:') ? graph.nodes.get(sel) ?? null : null;
	const conns = selNode ? connected(graph, selNode.id) : null;

	return (
		<div className="dz">
			{/* Left: pages + layers */}
			<aside className="dz-layers">
				<div className="dz-panel-tabs"><button className="on">Pages</button><button>Layers</button><button>Assets</button></div>
				<div className="dz-layer-scroll">
					<div className="dz-layer-group">Screens</div>
					{frames.filter((f) => f.kind === 'device').map((f) => (
						<button key={f.id} className={`dz-layer${sel === f.id ? ' on' : ''}`} onClick={() => focusFrame(f)}>
							<Icon.browser /><span>{f.label}</span>
						</button>
					))}
					{routes.length > 0 && <div className="dz-layer-group">Pages</div>}
					{routes.map((n) => (
						<button key={n.id} className={`dz-layer${sel === n.id ? ' on' : ''}`} onClick={() => focusFrame(frames.find((f) => f.id === n.id))}>
							<Icon.browser /><span>{n.label}</span>
						</button>
					))}
					{components.length > 0 && <div className="dz-layer-group">Components</div>}
					{components.map((n) => (
						<button key={n.id} className={`dz-layer${sel === n.id ? ' on' : ''}`} onClick={() => focusFrame(frames.find((f) => f.id === n.id))}>
							<Icon.builder /><span>{n.label}</span>
						</button>
					))}
				</div>
			</aside>

			{/* Center: canvas */}
			<div className="dz-stage">
				<div ref={canvasRef} className="dz-canvas" onPointerDown={onPointerDown} onWheel={onWheel}>
					<div className="dz-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
						{frames.map((f) => (
							<div
								key={f.id}
								className={`dz-frame${f.kind === 'device' ? ' device' : ''}${sel === f.id ? ' sel' : ''}`}
								style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
								onPointerDown={(e) => { e.stopPropagation(); setSel(f.id); }}
							>
								<div className="dz-frame-label">{f.label}</div>
								<div className="dz-frame-body">
									{f.kind === 'device'
										? <iframe title={f.label} className="dz-frame-frame" srcDoc={previewHtml} sandbox="allow-scripts allow-forms" scrolling="no" />
										: <Wire frame={f} />}
								</div>
							</div>
						))}
					</div>

					{/* Floating canvas toolbar (Framer-style) */}
					<div className="dz-float">
						<button className="on" title="Move"><Icon.command /></button>
						<button title="Hand"><Icon.grid /></button>
						<span className="dz-float-sep" />
						<button title="Zoom out" onClick={() => zoomBy(0.8)}><Icon.minus /></button>
						<button className="dz-float-z" title="Reset view" onClick={resetView}>{Math.round(view.z * 100)}%</button>
						<button title="Zoom in" onClick={() => zoomBy(1.25)}><Icon.plus /></button>
					</div>
				</div>
			</div>

			{/* Right: style inspector (live-editable tokens) */}
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
									<button key={nb.node.id} className="dz-conn" onClick={() => focusFrame(frames.find((x) => x.id === nb.node.id))}>
										<span className="dz-conn-edge">{nb.direction === 'out' ? nb.edge.kind : `${nb.edge.kind} by`}</span>
										<span className="dz-conn-name">{nb.node.label}</span>
									</button>
								))}
							</div>
						)}
					</div>
				) : (
					<div className="dz-insp-scroll">
						<div className="dz-panel-tabs"><button className="on">Style</button><button>Inspect</button></div>
						{selFrame?.kind === 'device' && (
							<div className="dz-insp-sec"><div className="dz-insp-row"><span>Artboard</span><b>{selFrame.label}px</b></div><div className="dz-insp-hint left">Live preview of the workspace app at this breakpoint.</div></div>
						)}
						{colors.length > 0 && (
							<div className="dz-insp-sec">
								<div className="dz-insp-title">Colors <span>{colors.length}</span></div>
								<div className="dz-tokens">
									{colors.map((t) => (
										<label className="dz-token" key={t.name} title={`${t.name}: ${t.value}`}>
											{isHex(t.value) ? (
												<input className="dz-color" type="color" value={t.value} onChange={(e) => void writeToken(fs, t, e.target.value)} aria-label={`Edit ${t.name}`} />
											) : (
												<span className="dz-chip" style={{ background: t.value }} />
											)}
											<span className="dz-tk-name">{t.name}</span>
											<span className="dz-tk-val">{t.value}</span>
										</label>
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
						{colors.length === 0 && values.length === 0 && <div className="dz-insp-hint">Design tokens from the project's CSS appear here.</div>}
					</div>
				)}
			</aside>
		</div>
	);
}
