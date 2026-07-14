// KeybindingService — resolves default + user keybindings into an effective set,
// installs a single global key handler with chord-sequence support, and
// dispatches to commands (honoring `when` clauses). Also the API the Keyboard
// Shortcuts editor uses to add/change/remove/reset and import/export bindings —
// the user layer is persisted like VS Code's keybindings.json.

import { type Chord, canonicalKey, chordsEqual, eventToChord, isMac, parseKeybinding } from './keys';
import { DEFAULT_KEYBINDINGS } from './defaults';
import { runCommand, getCommand } from './commands';
import { whenMatches, setContext, installFocusTracking } from './context';

export interface UserRule { command: string; key: string; when?: string; remove?: boolean }

export interface ResolvedBinding {
	id: string;
	key: string;      // platform-resolved binding string (still uses mod token internally)
	chords: Chord[];
	command: string;
	when?: string;
	source: 'default' | 'user';
}

const STORE_KEY = 'velocity.keybindings.v1';
const CHORD_TIMEOUT = 1600;

let userRules: UserRule[] = load();
let cache: ResolvedBinding[] | null = null;
const listeners = new Set<() => void>();

function load(): UserRule[] {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		return raw ? (JSON.parse(raw) as UserRule[]) : [];
	} catch {
		return [];
	}
}

function persist(): void {
	try {
		localStorage.setItem(STORE_KEY, JSON.stringify(userRules));
	} catch {
		/* ignore */
	}
	cache = null;
	listeners.forEach((l) => l());
}

function platformKey(d: { key: string; mac?: string }): string {
	return isMac && d.mac ? d.mac : d.key;
}

/** The effective binding set: defaults minus user removals, plus user additions. */
export function effectiveBindings(): ResolvedBinding[] {
	if (cache) return cache;
	const removed = new Set(
		userRules.filter((r) => r.remove).map((r) => `${r.command}::${canonicalKey(r.key)}`),
	);
	const out: ResolvedBinding[] = [];
	for (const d of DEFAULT_KEYBINDINGS) {
		const key = platformKey(d);
		if (removed.has(`${d.command}::${canonicalKey(key)}`)) continue;
		const chords = parseKeybinding(key);
		if (chords.length) out.push({ id: `default:${d.command}:${canonicalKey(key)}`, key, chords, command: d.command, when: d.when, source: 'default' });
	}
	for (const r of userRules) {
		if (r.remove) continue;
		const chords = parseKeybinding(r.key);
		if (chords.length) out.push({ id: `user:${r.command}:${canonicalKey(r.key)}`, key: r.key, chords, command: r.command, when: r.when, source: 'user' });
	}
	cache = out;
	return out;
}

export function bindingsForCommand(command: string): ResolvedBinding[] {
	return effectiveBindings().filter((b) => b.command === command);
}

// --- Editing API (used by the Keyboard Shortcuts UI) ------------------------

export function addUserBinding(command: string, key: string, when?: string): void {
	userRules = [...userRules, { command, key, when }];
	persist();
}

export function removeBinding(b: ResolvedBinding): void {
	if (b.source === 'user') {
		userRules = userRules.filter((r) => !(!r.remove && r.command === b.command && canonicalKey(r.key) === canonicalKey(b.key)));
	} else {
		// Suppress a default with a removal rule.
		userRules = [...userRules, { command: b.command, key: b.key, when: b.when, remove: true }];
	}
	persist();
}

export function changeBinding(b: ResolvedBinding, newKey: string): void {
	removeBinding(b);
	addUserBinding(b.command, newKey, b.when);
}

/** Drop every user rule touching a command (restores its defaults). */
export function resetCommand(command: string): void {
	userRules = userRules.filter((r) => r.command !== command);
	persist();
}

export function isCommandModified(command: string): boolean {
	return userRules.some((r) => r.command === command);
}

export function getUserRules(): UserRule[] {
	return userRules;
}

export function exportUserBindings(): string {
	return JSON.stringify(userRules, null, 2);
}

export function importUserBindings(json: string): boolean {
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) return false;
		userRules = parsed.filter((r) => r && typeof r.command === 'string' && typeof r.key === 'string');
		persist();
		return true;
	} catch {
		return false;
	}
}

export function resetAllBindings(): void {
	userRules = [];
	persist();
}

export function onBindingsChange(l: () => void): () => void {
	listeners.add(l);
	return () => listeners.delete(l);
}

// --- Global key dispatch ----------------------------------------------------

let pending: Chord[] = [];
let pendingTimer: number | undefined;

function clearPending(): void {
	pending = [];
	if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = undefined; }
	window.dispatchEvent(new CustomEvent('velocity:chord', { detail: { text: '' } }));
}

function chordText(chords: Chord[]): string {
	// Lightweight text for the "waiting for second key" status.
	return chords.map((c) => [c.ctrl && 'Ctrl', c.alt && 'Alt', c.shift && 'Shift', c.meta && (isMac ? '⌘' : 'Win'), c.key.toUpperCase()].filter(Boolean).join('+')).join(' ');
}

function onKeyDown(e: KeyboardEvent): void {
	if (e.isComposing || e.keyCode === 229) return;
	const chord = eventToChord(e);
	if (!chord) return; // lone modifier

	const depth = pending.length;
	const bindings = effectiveBindings();
	// Bindings whose chord sequence matches `pending` so far AND this chord at `depth`.
	const matches = bindings.filter((b) =>
		b.chords.length > depth &&
		chordsEqual(b.chords[depth], chord) &&
		pending.every((pc, i) => chordsEqual(b.chords[i], pc)),
	);

	if (matches.length === 0) {
		// A dangling chord prefix that this key doesn't continue: abandon it.
		if (depth > 0) { clearPending(); e.preventDefault(); }
		return;
	}

	const complete = matches.filter((b) => b.chords.length === depth + 1);
	const longer = matches.filter((b) => b.chords.length > depth + 1);
	const satisfied = complete.filter((b) => whenMatches(b.when) && !isCommandInert(b.command));

	// A completable binding with no longer alternative → run it now.
	if (satisfied.length && longer.length === 0) {
		e.preventDefault();
		e.stopPropagation();
		clearPending();
		runCommand(pick(satisfied).command);
		return;
	}

	// This key is a prefix of a longer sequence → wait for the next chord.
	if (longer.length) {
		e.preventDefault();
		e.stopPropagation();
		pending = [...pending, chord];
		window.dispatchEvent(new CustomEvent('velocity:chord', { detail: { text: chordText(pending) } }));
		if (pendingTimer) clearTimeout(pendingTimer);
		pendingTimer = window.setTimeout(clearPending, CHORD_TIMEOUT);
		return;
	}

	// Both satisfied-complete and longer would have returned above. If we get here
	// the only matches are complete-but-gated (when=false): fall through so the
	// key reaches the editor/browser natively.
	if (depth > 0) { clearPending(); }
}

function isCommandInert(id: string): boolean {
	const c = getCommand(id);
	return !!c?.when && !whenMatches(c.when);
}

// Prefer user bindings, then the most recently defined.
function pick(list: ResolvedBinding[]): ResolvedBinding {
	const user = list.filter((b) => b.source === 'user');
	const pool = user.length ? user : list;
	return pool[pool.length - 1];
}

let installed = false;
export function installKeybindings(): void {
	if (installed || typeof window === 'undefined') return;
	installed = true;
	installFocusTracking();
	setContext('isMac', isMac);
	setContext('os', isMac ? 'mac' : 'other');
	// Capture phase so we can intercept before CodeMirror / inputs when a binding matches.
	window.addEventListener('keydown', onKeyDown, true);
}
