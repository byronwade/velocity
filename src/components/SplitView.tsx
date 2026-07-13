import { useRef } from 'react';
import type { Node } from '../lib/types';
import { useShell } from '../lib/store';
import { PaneChrome } from './PaneChrome';

export function SplitView({ node }: { node: Node }) {
	if (node.kind === 'leaf') {
		return <PaneChrome pane={node.pane} />;
	}
	return <Split node={node} />;
}

function Split({ node }: { node: Extract<Node, { kind: 'split' }> }) {
	const setRatio = useShell((s) => s.setRatio);
	const ref = useRef<HTMLDivElement>(null);
	const aRef = useRef<HTMLDivElement>(null);
	const bRef = useRef<HTMLDivElement>(null);
	const draggingRef = useRef(false);
	// Live ratio during a drag, plus a coalescing rAF handle. We update the
	// panes' flex-basis imperatively on each frame and only commit to the
	// store on release — so a drag never triggers a React re-render per move.
	const liveRatio = useRef(node.ratio);
	const rafRef = useRef(0);

	const aPct = `${node.ratio * 100}%`;
	const bPct = `${(1 - node.ratio) * 100}%`;

	function paint() {
		rafRef.current = 0;
		const r = liveRatio.current;
		if (aRef.current) aRef.current.style.flex = `0 0 ${r * 100}%`;
		if (bRef.current) bRef.current.style.flex = `0 0 ${(1 - r) * 100}%`;
	}

	function onPointerDown(e: React.PointerEvent) {
		e.preventDefault();
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		draggingRef.current = true;
		(e.currentTarget as HTMLElement).classList.add('dragging');
	}
	function onPointerMove(e: React.PointerEvent) {
		if (!draggingRef.current || !ref.current) {
			return;
		}
		const rect = ref.current.getBoundingClientRect();
		const raw = node.axis === 'row'
			? (e.clientX - rect.left) / rect.width
			: (e.clientY - rect.top) / rect.height;
		liveRatio.current = Math.max(0.1, Math.min(0.9, raw));
		if (!rafRef.current) {
			rafRef.current = requestAnimationFrame(paint);
		}
	}
	function endDrag(e: React.PointerEvent) {
		if (!draggingRef.current) return;
		draggingRef.current = false;
		if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
		(e.currentTarget as HTMLElement).classList.remove('dragging');
		setRatio(node.id, liveRatio.current);
	}
	function onKeyDown(e: React.KeyboardEvent) {
		const step = e.shiftKey ? 0.1 : 0.02;
		const dec = (node.axis === 'row' && e.key === 'ArrowLeft') || (node.axis === 'col' && e.key === 'ArrowUp');
		const inc = (node.axis === 'row' && e.key === 'ArrowRight') || (node.axis === 'col' && e.key === 'ArrowDown');
		if (dec) { e.preventDefault(); setRatio(node.id, node.ratio - step); }
		else if (inc) { e.preventDefault(); setRatio(node.id, node.ratio + step); }
		else if (e.key === 'Home') { e.preventDefault(); setRatio(node.id, 0.15); }
		else if (e.key === 'End') { e.preventDefault(); setRatio(node.id, 0.85); }
	}

	return (
		<div className={`splitview ${node.axis}`} ref={ref}>
			<div className="split-child" ref={aRef} style={{ flex: `0 0 ${aPct}` }}>
				<SplitView node={node.a} />
			</div>
			<div
				className={`resizer ${node.axis}`}
				role="separator"
				tabIndex={0}
				aria-label="Resize panes"
				aria-orientation={node.axis === 'row' ? 'vertical' : 'horizontal'}
				aria-valuenow={Math.round(node.ratio * 100)}
				aria-valuemin={15}
				aria-valuemax={85}
				onKeyDown={onKeyDown}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
			/>
			<div className="split-child" ref={bRef} style={{ flex: `0 0 ${bPct}` }}>
				<SplitView node={node.b} />
			</div>
		</div>
	);
}
