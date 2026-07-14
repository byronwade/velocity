// ---------------------------------------------------------------------------
// Editor theme — driven entirely by the app's design tokens.
//
// Colors are `var(--token)`, so the single theme follows `data-theme` and needs
// no separate light/dark variants: switch the shell theme and the editor tracks
// it in the same paint. Syntax colors reuse the shared palette (--k/--s/--n/…)
// so code in the editor matches code shown anywhere else in the product.
// ---------------------------------------------------------------------------

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const highlightStyle = HighlightStyle.define([
	{ tag: [t.keyword, t.moduleKeyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword], color: 'var(--k)' },
	{ tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: 'var(--f)' },
	{ tag: [t.string, t.special(t.string), t.regexp], color: 'var(--s)' },
	{ tag: [t.number, t.bool, t.null, t.atom], color: 'var(--n)' },
	{ tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--c)', fontStyle: 'italic' },
	{ tag: [t.typeName, t.className, t.namespace, t.self], color: 'var(--ty)' },
	{ tag: [t.tagName], color: 'var(--s)' },
	{ tag: [t.propertyName, t.attributeName, t.labelName], color: 'var(--f)' },
	{ tag: [t.operator, t.punctuation, t.separator, t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], color: 'var(--muted)' },
	{ tag: [t.variableName, t.definition(t.variableName)], color: 'var(--fg)' },
	{ tag: [t.meta, t.annotation], color: 'var(--faint)' },
	{ tag: [t.heading], color: 'var(--k)', fontWeight: '600' },
	{ tag: [t.strong], fontWeight: '600' },
	{ tag: [t.emphasis], fontStyle: 'italic' },
	{ tag: [t.link, t.url], color: 'var(--f)', textDecoration: 'underline' },
	{ tag: [t.invalid], color: 'var(--danger)' },
]);

const chrome = EditorView.theme({
	'&': {
		height: '100%',
		color: 'var(--fg)',
		backgroundColor: 'transparent',
		fontSize: '12.5px',
	},
	'.cm-scroller': {
		fontFamily: 'var(--mono)',
		lineHeight: '1.7',
		overflow: 'auto',
	},
	'.cm-content': {
		caretColor: 'var(--accent)',
		padding: '8px 0',
	},
	'.cm-gutters': {
		backgroundColor: 'transparent',
		color: 'var(--faint)',
		border: 'none',
	},
	'.cm-lineNumbers .cm-gutterElement': {
		padding: '0 10px 0 14px',
		minWidth: '2.2em',
	},
	'.cm-foldGutter .cm-gutterElement': {
		color: 'var(--faint)',
	},
	'.cm-activeLine': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.07)',
	},
	'.cm-activeLineGutter': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.07)',
		color: 'var(--fg)',
	},
	'&.cm-focused .cm-cursor': {
		borderLeftColor: 'var(--accent)',
		borderLeftWidth: '2px',
	},
	'.cm-content ::selection': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.20)',
	},
	// Match the base theme's selector depth so the token overlay wins the cascade
	// in BOTH themes (a shallower rule loses to CodeMirror's built-in focused rule).
	'& .cm-selectionLayer .cm-selectionBackground': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.16)',
	},
	'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.24)',
	},
	'.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.12)',
		outline: '1px solid var(--line-2)',
	},
	'.cm-selectionMatch': {
		backgroundColor: 'rgba(var(--fg-rgb), 0.10)',
	},
	'.cm-tooltip': {
		backgroundColor: 'var(--panel)',
		border: '1px solid var(--line-2)',
		borderRadius: 'var(--r-sm)',
		color: 'var(--fg)',
		boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
	},
	'.cm-tooltip-autocomplete > ul > li[aria-selected]': {
		backgroundColor: 'var(--accent)',
		color: '#fff',
	},
}, { dark: false });

/** Editor chrome + syntax highlighting, wired to the design tokens. */
export const editorTheme = [chrome, syntaxHighlighting(highlightStyle)];
