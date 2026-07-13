// ---------------------------------------------------------------------------
// Velocity shell — core types
// ---------------------------------------------------------------------------
// The workspace of every tab is a recursive split-pane tree. Each leaf hosts a
// single pane, and every pane runs one of the five modes. Mode is per-pane, so a
// tab can show (e.g.) a Live Editor split beside a Browser with a Terminal below.

export type Mode = 'agents' | 'editor' | 'terminal' | 'browser' | 'builder' | 'database' | 'observe';

export const MODES: Mode[] = ['agents', 'editor', 'terminal', 'browser', 'builder', 'database', 'observe'];

/** The modes an "app" tab can be — the agent is the persistent brain, not an app. */
export const APP_MODES: Mode[] = ['editor', 'terminal', 'browser', 'builder', 'database', 'observe'];

/** Split direction. `row` = side-by-side (vertical divider); `col` = stacked (horizontal divider). */
export type Axis = 'row' | 'col';

export interface Pane {
	readonly id: string;
	mode: Mode;
}

export type Node = LeafNode | SplitNode;

export interface LeafNode {
	readonly id: string;
	readonly kind: 'leaf';
	readonly pane: Pane;
}

export interface SplitNode {
	readonly id: string;
	readonly kind: 'split';
	readonly axis: Axis;
	/** Fraction [0..1] of space given to child `a`; `b` gets the remainder. */
	readonly ratio: number;
	readonly a: Node;
	readonly b: Node;
}

export interface Tab {
	readonly id: string;
	title: string;
	tree: Node;
	/** The focused leaf's pane id — the mode dropdown and contextual actions target this pane. */
	activePaneId: string;
	/** The project this tab is scoped under (its tab group in the sidebar). */
	projectId: string;
}

/** A project groups tabs (an Arc "space" / a repo) and scopes the workspace. */
export interface Project {
	readonly id: string;
	name: string;
	color: string;
}

/** The cockpit's operating modes — the far-left global rail. Each is a lens over
 *  the one project graph, not a separate app. */
export type CockpitMode =
	| 'home' | 'build' | 'design' | 'browse' | 'data'
	| 'test' | 'ship' | 'observe' | 'agents' | 'library';

export const COCKPIT_MODES: CockpitMode[] = ['home', 'build', 'design', 'browse', 'data', 'test', 'ship', 'observe', 'agents', 'library'];

export type Theme = 'light' | 'dark';
