import { useEffect, useState } from 'react';
import { X, FileCode } from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';
import { useServices } from '../services/container';
import { firstLeafOfView } from './panes';
import { LENS_ORDER } from './model';
import { TabBar } from './TabBar';
import { Stage } from './Stage';
import { Dock } from './Dock';
import { MissionSheet, RightRail, ToolDrawer, CommandBar, ShipSheet } from './surfaces';
import { SettingsSheet } from './SettingsSheet';
import './velocity.css';


const SHORTCUTS: { group: string; keys: [string, string][] }[] = [
	{ group: 'Views', keys: [['1 – 8', 'Switch the active pane\'s view'], ['C', 'Compare Candidate vs Stable'], ['F', 'Focus mode']] },
	{ group: 'Panes', keys: [['⌘ \\', 'Split active pane right'], ['⌘ ⇧ \\', 'Split active pane down'], ['⌘ J', 'Toggle terminal'], ['⌘ P', 'Go to file']] },
	{ group: 'Work', keys: [['⌘ ⇧ N', 'New work'], ['⌘ ⇧ C', 'Chat — toggle and focus'], ['⌘ ⇧ D', 'Ship'], ['. ', 'Pause / resume all'], ['⌘ K', 'Command palette']] },
	{ group: 'General', keys: [['?', 'This shortcuts help'], ['Esc', 'Close the topmost surface']] },
];

function HelpOverlay({ onClose }: { onClose: () => void }) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);
	return (
		<div className="vs-scrim" onClick={onClose}>
			<div className="vs-help" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
				<header className="vs-help-head"><h2>Keyboard shortcuts</h2><button className="vs-icon" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
				<div className="vs-help-body">
					{SHORTCUTS.map((g) => (
						<div key={g.group} className="vs-help-group">
							<div className="vs-help-grouphead">{g.group}</div>
							{g.keys.map(([k, d]) => <div key={k} className="vs-help-row"><kbd>{k}</kbd><span>{d}</span></div>)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/** ⌘P — go to any workspace file; opens it in a Code pane (creating the view
 *  on the active pane if none is showing code). */
function QuickOpen({ onClose }: { onClose: () => void }) {
	const { fs, editor } = useServices();
	const [files, setFiles] = useState<string[]>([]);
	const [q, setQ] = useState('');
	const [sel, setSel] = useState(0);
	useEffect(() => { void fs.list().then(setFiles); }, [fs]);
	const matches = files.filter((f) => f.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
	const open = (path: string) => {
		const st = runtime.getState();
		const leaf = firstLeafOfView(st.layout.panes, 'code');
		const paneId = leaf ? leaf.id : st.layout.activePaneId;
		if (!leaf) runtime.setPaneView(paneId, 'code');
		void editor.bindPane(`velocity:editor:${paneId}`, path);
		onClose();
	};
	return (
		<div className="vs-scrim top" onClick={onClose}>
			<div className="vs-cmd" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Go to file">
				<input autoFocus value={q} placeholder="Go to file…" spellCheck={false}
					onChange={(e) => { setQ(e.target.value); setSel(0); }}
					onKeyDown={(e) => {
						if (e.key === 'Escape') onClose();
						if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, matches.length - 1)); }
						if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
						if (e.key === 'Enter' && matches[sel]) open(matches[sel]);
					}} />
				<div className="vs-cmd-list">
					{matches.length === 0 && <div className="vs-cmd-empty">No files match.</div>}
					{matches.map((f, i) => (
						<button key={f} className={`vs-cmd-row${i === sel ? ' sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => open(f)}>
							<FileCode size={14} /><span>{f.slice(f.lastIndexOf('/') + 1)}</span>
							{f.includes('/') && <kbd>{f.slice(0, f.lastIndexOf('/'))}</kbd>}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

function Confetti() {
	const state = useWorkspace();
	if (!state.celebrate) return null;
	return (
		<div className="vs-confetti" aria-hidden>
			{Array.from({ length: 42 }).map((_, i) => (
				<span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 40}ms`, background: ['#6f74c9', '#4a8dd1', '#2f9e8f', '#e0b34d', '#c96f9a'][i % 5] }} />
			))}
		</div>
	);
}

function Toast() {
	const state = useWorkspace();
	if (!state.toast) return null;
	return <div className="vs-toast" role="status">{state.toast}</div>;
}

export function VelocityApp() {
	const [helpOpen, setHelpOpen] = useState(false);
	const [quickOpen, setQuickOpen] = useState(false);
	// Tab layout: classic top row or an Arc-style vertical rail (Settings →
	// Appearance). Settings dispatches velocity:tablayout when it changes.
	const [tabLayout, setTabLayout] = useState(() => { try { return localStorage.getItem('vs-tablayout') ?? 'top'; } catch { return 'top'; } });
	useEffect(() => {
		const onLayout = (e: Event) => setTabLayout((e as CustomEvent<string>).detail || 'top');
		window.addEventListener('velocity:tablayout', onLayout);
		return () => window.removeEventListener('velocity:tablayout', onLayout);
	}, []);
	// Apply saved density / motion preferences on load.
	useEffect(() => {
		try {
			const d = localStorage.getItem('vs-density'); if (d) document.documentElement.dataset.density = d;
			const m = localStorage.getItem('vs-motion'); if (m) document.documentElement.dataset.motion = m;
		} catch { /* ignore */ }
	}, []);
	// Prototype-scoped keyboard. The production shell routes these through the
	// keybinding engine; here a single scoped listener keeps the demo self-contained.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			const tag = (e.target as HTMLElement)?.tagName;
			const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
			if (e.key === 'Escape') { runtime.closeTopmost(); return; }
			if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); runtime.openCommand(true); return; }
			if (mod && !e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setQuickOpen(true); return; }
			if (mod && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); runtime.armWork(true); return; }
			if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
				e.preventDefault();
				// Chat is a pane lens: toggle one open/closed, and land in the composer.
				const open = !firstLeafOfView(runtime.getState().layout.panes, 'chat');
				runtime.openChat(open);
				if (open) requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.vs-chatbox textarea')?.focus());
				return;
			}
			if (mod && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); runtime.openShip(true); return; }
			if (mod && e.key === '\\') { e.preventDefault(); runtime.splitPane(runtime.getState().layout.activePaneId, e.shiftKey ? 'col' : 'row'); return; }
			if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); runtime.openTool(runtime.getState().layout.openTool ? null : 'terminal'); return; }
			if (typing || mod) return;
			if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
			if (e.key >= '1' && e.key <= '8') { runtime.setLens(LENS_ORDER[Number(e.key) - 1]); return; }
			if (e.key.toLowerCase() === 'c') runtime.comparePreview('stable');
			if (e.key.toLowerCase() === 'f') runtime.toggleFocus();
			if (e.key === '.') runtime.togglePause();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const focusMode = useWorkspace().layout.focusMode;
	const sideTabs = tabLayout === 'side';
	return (
		<div className={`vs-shell${sideTabs ? ' side-tabs' : ''}`}>
			{!focusMode && <TabBar vertical={sideTabs} />}
			<div className="vs-hbody">
				<div className={`vs-root${focusMode ? ' focus' : ''}`}>
				<div className="vs-main">
					<Stage />
				</div>
				<ToolDrawer />
				<RightRail />
				<Dock />
				<MissionSheet />
				<ShipSheet />
				<SettingsSheet />
				{helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
				{quickOpen && <QuickOpen onClose={() => setQuickOpen(false)} />}
				<CommandBar />
				<Toast />
				<Confetti />
				</div>
			</div>
		</div>
	);
}
