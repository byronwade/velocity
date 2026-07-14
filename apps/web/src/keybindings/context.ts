// Context keys — the boolean/string facts that `when` clauses test against
// (editorTextFocus, inputFocus, terminalFocus, …). A single focus tracker keeps
// the focus-related keys current; other keys can be set imperatively.

import { evaluateWhen } from './when';

const ctx = new Map<string, unknown>();
const listeners = new Set<() => void>();

export function setContext(key: string, value: unknown): void {
	if (ctx.get(key) === value) return;
	ctx.set(key, value);
	listeners.forEach((l) => l());
}

export function getContext(key: string): unknown {
	return ctx.get(key);
}

export function onContextChange(l: () => void): () => void {
	listeners.add(l);
	return () => listeners.delete(l);
}

/** Evaluate a `when` clause against the live context. */
export function whenMatches(expr: string | undefined): boolean {
	return evaluateWhen(expr, getContext);
}

// Keep focus-derived context keys current. Uses the DOM focus target so it works
// regardless of which component owns the focused element.
function updateFocusContexts(): void {
	const el = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
	const inEditor = !!el?.closest?.('.cm-editor');
	const inTerminal = !!el?.closest?.('.term-input, .terminal, .term');
	const isField = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
	setContext('editorTextFocus', inEditor);
	setContext('editorFocus', inEditor);
	setContext('terminalFocus', inTerminal);
	setContext('inputFocus', isField);
	setContext('textInputFocus', isField && !inEditor);
}

let installed = false;
export function installFocusTracking(): void {
	if (installed || typeof document === 'undefined') return;
	installed = true;
	document.addEventListener('focusin', updateFocusContexts, true);
	// focusout fires before the next element is focused; defer a tick.
	document.addEventListener('focusout', () => setTimeout(updateFocusContexts, 0), true);
	updateFocusContexts();
}
