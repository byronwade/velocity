// ---------------------------------------------------------------------------
// Agent memory — durable notes the agent recalls across sessions (like the
// memory features in ChatGPT / Claude). Persisted to localStorage; injected
// into a model backend's system prompt and writable via the `remember` tool.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';

export interface MemoryNote {
	id: string;
	text: string;
	ts: number;
}

const KEY = 'velocity.memory.v1';
let seq = 0;

function load(): MemoryNote[] {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as MemoryNote[];
			if (Array.isArray(parsed)) return parsed;
		}
	} catch { /* ignore */ }
	return [];
}

let notes: MemoryNote[] = load();
const listeners = new Set<() => void>();
let rev = 0;

function persist(): void {
	try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* ignore */ }
	rev++;
	for (const l of listeners) l();
}

export function getMemories(): MemoryNote[] {
	return notes;
}

export function addMemory(text: string): MemoryNote {
	const t = text.trim();
	const note: MemoryNote = { id: `mem${(seq++).toString(36)}${Date.now().toString(36)}`, text: t, ts: Date.now() };
	notes = [...notes, note];
	persist();
	return note;
}

export function removeMemory(id: string): void {
	notes = notes.filter((n) => n.id !== id);
	persist();
}

export function clearMemory(): void {
	notes = [];
	persist();
}

/** A compact block for a model system prompt (empty string when no memory). */
export function memoryPrompt(): string {
	if (notes.length === 0) return '';
	return ['What you remember about this user/project:', ...notes.map((n) => `- ${n.text}`)].join('\n');
}

const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => rev;

export function useMemories(): MemoryNote[] {
	useSyncExternalStore(subscribe, getSnapshot);
	return notes;
}
