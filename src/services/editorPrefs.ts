// Editor preferences — small, persisted, and observable. Kept deliberately tiny
// (localStorage + a listener set) so any component can read/toggle a pref and
// re-render, without pulling in the full app store.

import { useSyncExternalStore } from 'react';

export interface EditorPrefs {
	formatOnSave: boolean;
	wordWrap: boolean;
	fontSize: number;
	tabSize: number;
}

const KEY = 'velocity.editor.prefs.v1';
const DEFAULTS: EditorPrefs = { formatOnSave: true, wordWrap: false, fontSize: 13, tabSize: 2 };

function load(): EditorPrefs {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return DEFAULTS;
		return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<EditorPrefs>) };
	} catch {
		return DEFAULTS;
	}
}

let prefs: EditorPrefs = load();
const listeners = new Set<() => void>();

export function getEditorPrefs(): EditorPrefs {
	return prefs;
}

export function setEditorPrefs(patch: Partial<EditorPrefs>): void {
	prefs = { ...prefs, ...patch };
	try {
		localStorage.setItem(KEY, JSON.stringify(prefs));
	} catch {
		/* storage full / unavailable — keep the in-memory value */
	}
	listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
	listeners.add(l);
	return () => listeners.delete(l);
}

export function useEditorPrefs(): EditorPrefs {
	return useSyncExternalStore(subscribe, getEditorPrefs, getEditorPrefs);
}
