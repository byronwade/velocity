// The agent surface — a slim launcher that expands into a docked chat panel and
// collapses back to an icon. Idle: a small, solid, legible pill in the corner,
// out of the way. Open: a proper chat dock (thread + composer) with a solid
// background so it's always readable and its menus never get clipped. Working:
// the collapsed pill shows a spinner + what the agent is doing.

import { useEffect, useRef, useState } from 'react';
import { useShell } from '../lib/store';
import { useServices } from '../services/container';
import { useAgentThread } from '../services/agent';
import { AgentThread } from '../modes/AgentsMode';
import { ModelPicker } from './ModelPicker';
import { getActiveEditor } from '../editor/activeView';
import { Icon } from '../lib/icons';

export function CommandBar() {
	const { agent } = useServices();
	const activeProjectId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0])?.projectId);
	const brainKey = `proj:${activeProjectId ?? 'global'}`;
	const { thread, busy, queued, context } = useAgentThread(brainKey);

	const [open, setOpen] = useState(false);
	const [input, setInput] = useState('');
	const taRef = useRef<HTMLTextAreaElement>(null);

	const hasHistory = thread.some((m) => m.role === 'user');
	const lastAsst = [...thread].reverse().find((m) => m.role === 'assistant');
	const runningTool = lastAsst?.tools.find((t) => t.status === 'running');
	const activity = runningTool ? runningTool.label : busy ? 'Thinking…' : '';

	function expand() {
		setOpen(true);
		requestAnimationFrame(() => taRef.current?.focus());
	}

	// Attach context: reference the file open in the editor (like @-mentions).
	function addContext() {
		const path = getActiveEditor()?.path;
		const ref = path ? `@${path} ` : '@';
		setInput((v) => (!v || v.endsWith(' ') ? v : v + ' ') + ref);
		setOpen(true);
		taRef.current?.focus();
	}

	// Collapse the dock on Escape (unless a menu inside handles it first).
	useEffect(() => {
		if (!open) return;
		const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); taRef.current?.blur(); } };
		document.addEventListener('keydown', esc);
		return () => document.removeEventListener('keydown', esc);
	}, [open]);

	// Open + focus from anywhere (⌘J by default, dispatched by the keybinding service).
	useEffect(() => {
		const focus = () => expand();
		window.addEventListener('velocity:focus-commandbar', focus);
		return () => window.removeEventListener('velocity:focus-commandbar', focus);
	}, []);

	function send() {
		const t = input.trim();
		if (!t) return;
		setInput('');
		void agent.send(brainKey, t);
		setOpen(true);
	}

	// Collapsed → a slim launcher pill (shows live status while the agent works).
	if (!open) {
		return (
			<button className={`agent-launch${busy ? ' busy' : ''}`} onClick={expand} title="Ask the agent (⌘J)">
				{busy ? <span className="spin" /> : <Icon.sparkle />}
				<span className="agent-launch-label">{busy ? (activity || 'Working…') : 'Ask agent'}</span>
				{busy && queued.length > 0 && <span className="agent-launch-q">{queued.length}</span>}
			</button>
		);
	}

	// Expanded → a docked chat panel (solid, legible, self-contained).
	return (
		<div className="agent-dock" role="dialog" aria-label="Agent chat">
			<div className="agent-dock-head">
				<span className="agent-dock-title"><Icon.sparkle />Agent</span>
				<span className="agent-dock-sp" />
				<span className={`cbar-ctx${context.pct >= 80 ? ' hot' : ''}`} title={`~${context.tokens.toLocaleString()} tokens in context · auto-compacts when full`}>
					<span className="cbar-ctx-bar"><i style={{ width: `${context.pct}%` }} /></span>{context.pct}%
				</span>
				<button className="cbar-collapse" title="New chat" aria-label="New chat" onClick={() => agent.reset(brainKey)}><Icon.plus /></button>
				<button className="cbar-collapse" title="Collapse" aria-label="Collapse" onClick={() => setOpen(false)}><Icon.chevron /></button>
			</div>

			{hasHistory ? (
				<div className="agent-dock-thread"><AgentThread brainKey={brainKey} /></div>
			) : (
				<div className="agent-dock-empty">
					<Icon.sparkle />
					<p>Tell the agent what to build or change. It can read and edit files, run commands, and drive the browser.</p>
				</div>
			)}

			{busy && (
				<div className="agent-dock-working">
					<span className="spin" /><b>Agent is working</b>
					{activity && <span className="cbar-act">{activity}</span>}
					{queued.length > 0 && <span className="cbar-q">{queued.length} queued</span>}
				</div>
			)}

			<div className="agent-dock-composer">
				<button className="cbar-plus" title="Attach the current file as context" aria-label="Add context" onClick={addContext}><Icon.plus /></button>
				<textarea
					ref={taRef}
					rows={1}
					value={input}
					placeholder={busy ? 'Queue a follow-up…' : 'Ask the agent…'}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
				/>
				<ModelPicker />
				<button className="cbar-send" onClick={send} disabled={!input.trim()} title={busy ? 'Queue follow-up' : 'Send'} aria-label="Send">
					{busy ? <Icon.plus /> : <Icon.send />}
				</button>
			</div>
		</div>
	);
}
