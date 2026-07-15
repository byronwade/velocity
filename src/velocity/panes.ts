// ---------------------------------------------------------------------------
// Pure helpers for the split-pane tree. No React, no side effects — the runtime
// calls these to produce a new immutable tree, then stores it in layout.panes.
// ---------------------------------------------------------------------------

import type { CompareSource, Lens, PaneLeaf, PaneNode, SplitDir } from './model';

export function firstLeafId(node: PaneNode): string {
	return node.kind === 'leaf' ? node.id : firstLeafId(node.a);
}

export function findLeaf(node: PaneNode, id: string): PaneLeaf | undefined {
	if (node.kind === 'leaf') return node.id === id ? node : undefined;
	return findLeaf(node.a, id) ?? findLeaf(node.b, id);
}

export function leafIds(node: PaneNode): string[] {
	return node.kind === 'leaf' ? [node.id] : [...leafIds(node.a), ...leafIds(node.b)];
}

export function setView(node: PaneNode, id: string, view: Lens): PaneNode {
	if (node.kind === 'leaf') return node.id === id ? { ...node, view } : node;
	return { ...node, a: setView(node.a, id, view), b: setView(node.b, id, view) };
}

export function setCompareSource(node: PaneNode, id: string, source: CompareSource): PaneNode {
	if (node.kind === 'leaf') return node.id === id ? { ...node, compareSource: source } : node;
	return { ...node, a: setCompareSource(node.a, id, source), b: setCompareSource(node.b, id, source) };
}

export function firstLeafOfView(node: PaneNode, view: Lens): PaneLeaf | undefined {
	if (node.kind === 'leaf') return node.view === view ? node : undefined;
	return firstLeafOfView(node.a, view) ?? firstLeafOfView(node.b, view);
}

export function setRatio(node: PaneNode, splitId: string, ratio: number): PaneNode {
	if (node.kind === 'leaf') return node;
	if (node.id === splitId) return { ...node, ratio: Math.min(0.82, Math.max(0.18, ratio)) };
	return { ...node, a: setRatio(node.a, splitId, ratio), b: setRatio(node.b, splitId, ratio) };
}

/** Replace the leaf `id` with a split of [original, new leaf]. */
export function splitLeaf(node: PaneNode, id: string, dir: SplitDir, newId: string, newView: Lens): PaneNode {
	if (node.kind === 'leaf') {
		if (node.id !== id) return node;
		return { kind: 'split', id: `s-${newId}`, dir, ratio: 0.5, a: node, b: { kind: 'leaf', id: newId, view: newView } };
	}
	return { ...node, a: splitLeaf(node.a, id, dir, newId, newView), b: splitLeaf(node.b, id, dir, newId, newView) };
}

/** Remove the leaf `id`, collapsing its parent split into the sibling. */
export function removeLeaf(node: PaneNode, id: string): PaneNode {
	if (node.kind === 'leaf') return node; // root leaf can't be removed here
	if (node.a.kind === 'leaf' && node.a.id === id) return node.b;
	if (node.b.kind === 'leaf' && node.b.id === id) return node.a;
	return { ...node, a: removeLeaf(node.a, id), b: removeLeaf(node.b, id) };
}

/** Which edge of a target pane a drop lands on. */
export type DropEdge = 'left' | 'right' | 'top' | 'bottom';

/** Replace the leaf `targetId` with a split of it and an existing leaf. */
function insertBeside(node: PaneNode, targetId: string, leaf: PaneLeaf, edge: DropEdge): PaneNode {
	if (node.kind === 'leaf') {
		if (node.id !== targetId) return node;
		const dir: SplitDir = edge === 'left' || edge === 'right' ? 'row' : 'col';
		const first = edge === 'left' || edge === 'top';
		return {
			kind: 'split', id: `s-${leaf.id}-${targetId}`, dir, ratio: 0.5,
			a: first ? leaf : node,
			b: first ? node : leaf,
		};
	}
	return { ...node, a: insertBeside(node.a, targetId, leaf, edge), b: insertBeside(node.b, targetId, leaf, edge) };
}

/** Move the leaf `srcId` next to `targetId` on the given edge (drag & drop).
 *  Returns the tree unchanged when the move is a no-op or impossible. */
export function movePane(node: PaneNode, srcId: string, targetId: string, edge: DropEdge): PaneNode {
	if (srcId === targetId) return node;
	const src = findLeaf(node, srcId);
	if (!src || !findLeaf(node, targetId)) return node;
	if (node.kind === 'leaf') return node; // a single pane has nowhere to go
	const without = removeLeaf(node, srcId);
	return insertBeside(without, targetId, src, edge);
}
