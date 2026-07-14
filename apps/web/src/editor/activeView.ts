// The currently-focused editor — the target for editor commands dispatched by
// the keybinding service (save, format, multi-cursor, fold, …). CodeMirrorHost
// registers its view on focus; the reference persists after blur so commands
// invoked from menus still act on the last-focused editor.

import type { EditorView } from '@codemirror/view';

export interface ActiveEditor {
	view: EditorView;
	path: string;
	save: () => void;
}

let active: ActiveEditor | null = null;

export function setActiveEditor(a: ActiveEditor): void {
	active = a;
}

export function clearActiveEditor(view: EditorView): void {
	if (active?.view === view) active = null;
}

export function getActiveEditor(): ActiveEditor | null {
	return active;
}
