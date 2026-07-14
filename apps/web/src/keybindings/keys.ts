// Key parsing, matching, and formatting — the low-level layer of the keybinding
// system. Modeled on VS Code: bindings are written as chord sequences of
// `mod+shift+key` tokens (space-separated for multi-chord sequences like
// `ctrl+k ctrl+s`). Matching is done against `KeyboardEvent.code` (physical key)
// so it's layout- and shift-stable, exactly like VS Code's keycode dispatch.

export const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform);

export interface Chord {
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	meta: boolean;
	key: string; // canonical lowercase token, e.g. 'a', '1', '/', 'enter', 'up', 'f5'
}

// Map a physical KeyboardEvent.code to our canonical token.
const CODE_MAP: Record<string, string> = {
	Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']',
	Backquote: '`', Minus: '-', Equal: '=', Semicolon: ';', Quote: "'",
	Space: 'space', Enter: 'enter', Escape: 'escape', Tab: 'tab', Backspace: 'backspace',
	Delete: 'delete', Insert: 'insert', Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',
	ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

function codeToToken(code: string): string {
	if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
	if (/^Digit[0-9]$/.test(code)) return code.slice(5);
	if (/^Numpad[0-9]$/.test(code)) return 'num' + code.slice(6);
	if (/^F[0-9]{1,2}$/.test(code)) return code.toLowerCase();
	return CODE_MAP[code] ?? '';
}

// Synonyms accepted when parsing binding strings.
const KEY_SYNONYMS: Record<string, string> = {
	esc: 'escape', del: 'delete', return: 'enter', ins: 'insert',
	pgup: 'pageup', pgdn: 'pagedown', pagedown: 'pagedown', pageup: 'pageup',
	arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
};

export function eventToChord(e: KeyboardEvent): Chord | null {
	// Ignore lone modifier presses — they can't complete a chord.
	if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
	const key = codeToToken(e.code) || (e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase());
	if (!key) return null;
	return { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey, key };
}

/** Parse one chord token like "ctrl+shift+p" or "mod+k". Returns null if invalid. */
export function parseChord(token: string): Chord | null {
	const parts = token.toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
	const c: Chord = { ctrl: false, shift: false, alt: false, meta: false, key: '' };
	for (const p of parts) {
		if (p === 'ctrl' || p === 'control') c.ctrl = true;
		else if (p === 'shift') c.shift = true;
		else if (p === 'alt' || p === 'option' || p === 'opt') c.alt = true;
		else if (p === 'cmd' || p === 'meta' || p === 'super' || p === 'win' || p === 'command') c.meta = true;
		else if (p === 'mod') { if (isMac) c.meta = true; else c.ctrl = true; }
		else c.key = KEY_SYNONYMS[p] ?? p;
	}
	return c.key ? c : null;
}

/** Parse a full binding string (space-separated chords) into a chord sequence. */
export function parseKeybinding(s: string): Chord[] {
	const chords = s.trim().split(/\s+/).map(parseChord);
	return chords.every(Boolean) ? (chords as Chord[]) : [];
}

export function chordsEqual(a: Chord, b: Chord): boolean {
	return a.ctrl === b.ctrl && a.shift === b.shift && a.alt === b.alt && a.meta === b.meta && a.key === b.key;
}

// --- Human-readable formatting (for the shortcuts UI) -----------------------

const KEY_LABEL: Record<string, string> = {
	enter: '↵', escape: 'Esc', space: 'Space', tab: 'Tab', backspace: '⌫', delete: 'Del',
	up: '↑', down: '↓', left: '←', right: '→', pageup: 'PgUp', pagedown: 'PgDn', home: 'Home', end: 'End',
};

function keyLabel(key: string): string {
	if (KEY_LABEL[key]) return KEY_LABEL[key];
	if (/^f[0-9]{1,2}$/.test(key)) return key.toUpperCase();
	return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
}

/** Format one chord with platform-appropriate glyphs. */
export function formatChord(c: Chord): string {
	const parts: string[] = [];
	if (isMac) {
		if (c.ctrl) parts.push('⌃');
		if (c.alt) parts.push('⌥');
		if (c.shift) parts.push('⇧');
		if (c.meta) parts.push('⌘');
		parts.push(keyLabel(c.key));
		return parts.join('');
	}
	if (c.ctrl) parts.push('Ctrl');
	if (c.shift) parts.push('Shift');
	if (c.alt) parts.push('Alt');
	if (c.meta) parts.push('Win');
	parts.push(keyLabel(c.key));
	return parts.join('+');
}

/** Format a chord sequence (e.g. "⌘K ⌘S"). */
export function formatKeybinding(chords: Chord[]): string {
	return chords.map(formatChord).join(' ');
}

/** Normalize a binding string to a canonical internal form for equality checks. */
export function canonicalKey(s: string): string {
	return parseKeybinding(s)
		.map((c) => [c.ctrl && 'ctrl', c.alt && 'alt', c.shift && 'shift', c.meta && 'meta', c.key].filter(Boolean).join('+'))
		.join(' ');
}
