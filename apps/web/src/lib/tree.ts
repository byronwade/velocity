// ---------------------------------------------------------------------------
// Pure, immutable operations on the recursive pane tree.
// ---------------------------------------------------------------------------
// Every operation returns a new tree (structural sharing where possible) so the
// store stays immutable and React re-renders are cheap and predictable.

import type { Axis, Mode, Node, LeafNode } from './types';

let counter = 0;
export function uid(prefix = 'n'): string {
	counter += 1;
	return `${prefix}_${counter.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function makeLeaf(mode: Mode): LeafNode {
	return { id: uid('leaf'), kind: 'leaf', pane: { id: uid('pane'), mode } };
}

/** All leaves, left-to-right / top-to-bottom (traversal order). */
export function leaves(node: Node): LeafNode[] {
	if (node.kind === 'leaf') {
		return [node];
	}
	return [...leaves(node.a), ...leaves(node.b)];
}

export function findLeafByPane(node: Node, paneId: string): LeafNode | undefined {
	return leaves(node).find((l) => l.pane.id === paneId);
}

/** Replace the leaf that hosts `paneId` with `replacement`, preserving structure. */
function replaceLeaf(node: Node, paneId: string, replacement: Node): Node {
	if (node.kind === 'leaf') {
		return node.pane.id === paneId ? replacement : node;
	}
	return { ...node, a: replaceLeaf(node.a, paneId, replacement), b: replaceLeaf(node.b, paneId, replacement) };
}

/** Split the pane `paneId` along `axis`; the new pane inherits the same mode (a familiar default). */
export function splitPane(node: Node, paneId: string, axis: Axis, mode?: Mode): { tree: Node; newPaneId: string } {
	const target = findLeafByPane(node, paneId);
	if (!target) {
		return { tree: node, newPaneId: paneId };
	}
	const fresh = makeLeaf(mode ?? target.pane.mode);
	const split: Node = { id: uid('split'), kind: 'split', axis, ratio: 0.5, a: target, b: fresh };
	return { tree: replaceLeaf(node, paneId, split), newPaneId: fresh.pane.id };
}

/**
 * Remove the pane `paneId`. Its parent split collapses and the sibling subtree
 * is promoted into the parent's place. Removing the last remaining pane is a
 * no-op (a tab always has at least one pane).
 */
export function closePane(node: Node, paneId: string): { tree: Node; nextActivePaneId: string } {
	if (node.kind === 'leaf') {
		return { tree: node, nextActivePaneId: node.pane.id };
	}
	// If either child is the target leaf, promote the sibling.
	if (node.a.kind === 'leaf' && node.a.pane.id === paneId) {
		return { tree: node.b, nextActivePaneId: leaves(node.b)[0].pane.id };
	}
	if (node.b.kind === 'leaf' && node.b.pane.id === paneId) {
		return { tree: node.a, nextActivePaneId: leaves(node.a)[0].pane.id };
	}
	// Recurse into whichever branch contains the pane.
	if (findLeafByPane(node.a, paneId)) {
		const res = closePane(node.a, paneId);
		return { tree: { ...node, a: res.tree }, nextActivePaneId: res.nextActivePaneId };
	}
	if (findLeafByPane(node.b, paneId)) {
		const res = closePane(node.b, paneId);
		return { tree: { ...node, b: res.tree }, nextActivePaneId: res.nextActivePaneId };
	}
	return { tree: node, nextActivePaneId: paneId };
}

export function setPaneMode(node: Node, paneId: string, mode: Mode): Node {
	if (node.kind === 'leaf') {
		return node.pane.id === paneId ? { ...node, pane: { ...node.pane, mode } } : node;
	}
	return { ...node, a: setPaneMode(node.a, paneId, mode), b: setPaneMode(node.b, paneId, mode) };
}

export function setRatio(node: Node, splitId: string, ratio: number): Node {
	if (node.kind === 'leaf') {
		return node;
	}
	if (node.id === splitId) {
		return { ...node, ratio: Math.min(0.85, Math.max(0.15, ratio)) };
	}
	return { ...node, a: setRatio(node.a, splitId, ratio), b: setRatio(node.b, splitId, ratio) };
}
