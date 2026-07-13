// Two readability extensions developers love, both pure CodeMirror decorations
// (no language server): rainbow bracket-pair colorization and inline color
// swatches. Kept lightweight — bracket depth is computed by a single pass over
// the document (guarded by a size cap), skipping strings/comments via the
// syntax tree so brackets inside literals aren't miscolored.

import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

// --- Rainbow brackets -------------------------------------------------------

const OPEN = '([{';
const CLOSE = ')]}';
const RB_DEPTH = 6;
const RB_MARKS = Array.from({ length: RB_DEPTH }, (_, i) => Decoration.mark({ class: `cm-rb-${i}` }));
const MAX_SCAN = 80_000; // don't rainbow enormous files — not worth the pass.

function buildBrackets(view: EditorView): DecorationSet {
	const doc = view.state.doc;
	const builder = new RangeSetBuilder<Decoration>();
	if (doc.length > MAX_SCAN) return builder.finish();
	const tree = syntaxTree(view.state);
	const text = doc.toString();
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const isOpen = OPEN.includes(ch);
		const isClose = !isOpen && CLOSE.includes(ch);
		if (!isOpen && !isClose) continue;
		const name = tree.resolveInner(i, 1).name;
		if (/String|Comment|Regex|Template|Documentation/.test(name)) continue;
		if (isOpen) {
			builder.add(i, i + 1, RB_MARKS[depth % RB_DEPTH]);
			depth++;
		} else {
			depth = Math.max(0, depth - 1);
			builder.add(i, i + 1, RB_MARKS[depth % RB_DEPTH]);
		}
	}
	return builder.finish();
}

const rainbowBrackets = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) { this.decorations = buildBrackets(view); }
		update(u: ViewUpdate) { if (u.docChanged || u.viewportChanged) this.decorations = buildBrackets(u.view); }
	},
	{ decorations: (v) => v.decorations },
);

// --- Inline color swatches --------------------------------------------------

const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;

class SwatchWidget extends WidgetType {
	constructor(readonly color: string) { super(); }
	eq(other: SwatchWidget) { return other.color === this.color; }
	toDOM() {
		const box = document.createElement('span');
		box.className = 'cm-color-swatch';
		box.style.backgroundColor = this.color;
		box.title = this.color;
		return box;
	}
	ignoreEvent() { return false; }
}

function buildSwatches(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		COLOR_RE.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = COLOR_RE.exec(text))) {
			const start = from + m.index;
			builder.add(start, start, Decoration.widget({ widget: new SwatchWidget(m[0]), side: -1 }));
		}
	}
	return builder.finish();
}

const colorSwatches = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) { this.decorations = buildSwatches(view); }
		update(u: ViewUpdate) { if (u.docChanged || u.viewportChanged) this.decorations = buildSwatches(u.view); }
	},
	{ decorations: (v) => v.decorations },
);

export const richEditing = [rainbowBrackets, colorSwatches];
