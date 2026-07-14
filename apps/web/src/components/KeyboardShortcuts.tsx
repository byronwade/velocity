// Keyboard Shortcuts editor — the VS Code-style table of every command and its
// keybinding, fully searchable and rebindable. Opened with ⌘K ⌘S or from the
// account menu. Record a new chord (including sequences like ⌘K ⌘S), reset to
// default, remove a binding, or add another. User changes persist like
// keybindings.json and can be exported/imported.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { allCommands, onCommandsChange, type Command } from '../keybindings/commands';
import {
	effectiveBindings, bindingsForCommand, onBindingsChange, addUserBinding, removeBinding,
	changeBinding, resetCommand, isCommandModified, exportUserBindings, importUserBindings, resetAllBindings,
	type ResolvedBinding,
} from '../keybindings/service';
import { eventToChord, formatKeybinding, canonicalKey, type Chord } from '../keybindings/keys';
import { Icon } from '../lib/icons';

// --- Chord recorder ---------------------------------------------------------

function ChordRecorder({ onDone, onCancel }: { onDone: (key: string) => void; onCancel: () => void }) {
	const [chords, setChords] = useState<Chord[]>([]);
	const boxRef = useRef<HTMLDivElement>(null);

	useEffect(() => { boxRef.current?.focus(); }, []);

	function onKeyDown(e: React.KeyboardEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.key === 'Escape') { onCancel(); return; }
		if (e.key === 'Enter' && chords.length) { commit(chords); return; }
		if (e.key === 'Backspace') { setChords((c) => c.slice(0, -1)); return; }
		const chord = eventToChord(e.nativeEvent);
		if (!chord) return; // modifier-only
		const next = [...chords, chord].slice(-2); // sequences up to 2 chords
		setChords(next);
	}

	function commit(cs: Chord[]) {
		const key = cs.map((c) => [c.ctrl && 'ctrl', c.alt && 'alt', c.shift && 'shift', c.meta && 'meta', c.key].filter(Boolean).join('+')).join(' ');
		onDone(key);
	}

	return (
		<div className="kbd-recorder" ref={boxRef} tabIndex={0} onKeyDown={onKeyDown} role="textbox" aria-label="Press desired key combination">
			<span className="kbd-rec-keys">{chords.length ? formatKeybinding(chords) : 'Press keys…'}</span>
			<span className="kbd-rec-hint">{chords.length ? 'Enter to accept · Esc to cancel' : 'Esc to cancel'}</span>
		</div>
	);
}

// --- Main editor ------------------------------------------------------------

interface Row { command: Command; bindings: ResolvedBinding[] }

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
	// Re-render on either command or binding changes.
	const version = useSyncExternalStore(
		(cb) => { const a = onCommandsChange(cb); const b = onBindingsChange(cb); return () => { a(); b(); }; },
		() => `${allCommands().length}:${effectiveBindings().length}`,
	);
	const [q, setQ] = useState('');
	const [onlyModified, setOnlyModified] = useState(false);
	const [recording, setRecording] = useState<{ command: string; when?: string; replace?: ResolvedBinding } | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => { searchRef.current?.focus(); }, []);

	const rows = useMemo<Row[]>(() => {
		void version;
		const needle = q.trim().toLowerCase();
		return allCommands()
			.map((command) => ({ command, bindings: bindingsForCommand(command.id) }))
			.filter(({ command, bindings }) => {
				if (onlyModified && !isCommandModified(command.id)) return false;
				if (!needle) return true;
				const hay = `${command.title} ${command.id} ${command.category ?? ''} ${bindings.map((b) => b.key).join(' ')}`.toLowerCase();
				return hay.includes(needle);
			})
			.sort((a, b) => (a.command.category ?? '').localeCompare(b.command.category ?? '') || a.command.title.localeCompare(b.command.title));
	}, [q, onlyModified, version]);

	function doExport() {
		const blob = new Blob([exportUserBindings()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = 'keybindings.json'; a.click();
		URL.revokeObjectURL(url);
	}

	function doImport() {
		const input = document.createElement('input');
		input.type = 'file'; input.accept = 'application/json,.json';
		input.onchange = () => {
			const file = input.files?.[0];
			if (!file) return;
			void file.text().then((t) => importUserBindings(t));
		};
		input.click();
	}

	return (
		<div className="modal-scrim" onMouseDown={onClose}>
			<div className="kbd-editor" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard Shortcuts">
				<div className="kbd-head">
					<span><Icon.command />Keyboard Shortcuts</span>
					<div className="kbd-head-actions">
						<button className="kbd-mini" onClick={doImport} title="Import keybindings.json"><Icon.file /></button>
						<button className="kbd-mini" onClick={doExport} title="Export keybindings.json"><Icon.share /></button>
						<button className="kbd-mini danger" onClick={() => { if (confirm('Reset all keybindings to defaults?')) resetAllBindings(); }} title="Reset all"><Icon.reload /></button>
						<button className="mem-close" onClick={onClose} aria-label="Close"><Icon.close /></button>
					</div>
				</div>
				<div className="kbd-toolbar">
					<div className="kbd-search"><Icon.search /><input ref={searchRef} value={q} placeholder="Type to search in keybindings" onChange={(e) => setQ(e.target.value)} /></div>
					<label className="kbd-filter"><input type="checkbox" checked={onlyModified} onChange={(e) => setOnlyModified(e.target.checked)} />User-modified</label>
				</div>
				<div className="kbd-table" role="table">
					<div className="kbd-tr kbd-thead" role="row">
						<span className="kbd-c-cmd">Command</span>
						<span className="kbd-c-key">Keybinding</span>
						<span className="kbd-c-when">When</span>
						<span className="kbd-c-act" />
					</div>
					{rows.length === 0 && <div className="kbd-empty">No commands match.</div>}
					{rows.map(({ command, bindings }) => (
						<div className="kbd-tr" role="row" key={command.id}>
							<span className="kbd-c-cmd">
								<span className="kbd-cmd-title">{command.title}</span>
								<span className="kbd-cmd-id">{command.id}</span>
							</span>
							<span className="kbd-c-key">
								{bindings.length === 0 && <button className="kbd-add-inline" onClick={() => setRecording({ command: command.id, when: command.when })}>Add keybinding…</button>}
								{bindings.map((b) => (
									<span key={b.id} className={`kbd-chip${b.source === 'user' ? ' user' : ''}`} title={b.source === 'user' ? 'User' : 'Default'}>
										<button className="kbd-chip-key" onClick={() => setRecording({ command: command.id, when: b.when, replace: b })}>{formatKeybinding(b.chords)}</button>
										<button className="kbd-chip-x" title="Remove" onClick={() => removeBinding(b)}><Icon.close /></button>
									</span>
								))}
							</span>
							<span className="kbd-c-when">{bindings.find((b) => b.when)?.when ?? command.when ?? ''}</span>
							<span className="kbd-c-act">
								<button className="kbd-mini" title="Add keybinding" onClick={() => setRecording({ command: command.id, when: command.when })}><Icon.plus /></button>
								{isCommandModified(command.id) && <button className="kbd-mini" title="Reset to default" onClick={() => resetCommand(command.id)}><Icon.reload /></button>}
							</span>
						</div>
					))}
				</div>
				<div className="kbd-foot">{allCommands().length} commands · {effectiveBindings().length} keybindings · changes save automatically</div>
			</div>

			{recording && (
				<div className="kbd-rec-scrim" onMouseDown={(e) => { e.stopPropagation(); setRecording(null); }}>
					<div className="kbd-rec-card" onMouseDown={(e) => e.stopPropagation()}>
						<div className="kbd-rec-title">Press the desired key combination{recording.replace ? ' (replaces existing)' : ''}</div>
						<ChordRecorder
							onCancel={() => setRecording(null)}
							onDone={(key) => {
								if (!key) { setRecording(null); return; }
								// Avoid duplicate identical binding.
								const dup = bindingsForCommand(recording.command).some((b) => canonicalKey(b.key) === canonicalKey(key));
								if (recording.replace) changeBinding(recording.replace, key);
								else if (!dup) addUserBinding(recording.command, key, recording.when);
								setRecording(null);
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
