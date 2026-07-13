// The floating command bar — the primary way to tell the agent what to do.
//
// Centered near the bottom on every page. Idle: a slim input. Focus/history:
// it morphs upward into a thread panel (emphasizing what the agent is thinking
// and doing — tool activity — over prose). Send: it collapses to a compact
// "working…" strip with a spinner; you can still queue follow-ups. This moves
// the agent from a persistent chat window to a command surface.

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

	// Attach context: reference the file open in the editor (like @-mentions), so
	// the agent knows which file you mean. Falls back to a bare "@" to type one.
	function addContext() {
		const path = getActiveEditor()?.path;
		const ref = path ? `@${path} ` : '@';
		setInput((v) => (!v || v.endsWith(' ') ? v : v + ' ') + ref);
		if (hasHistory) setOpen(true);
		taRef.current?.focus();
	}

	// Collapse the thread panel on Escape.
	useEffect(() => {
		if (!open) return;
		const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); taRef.current?.blur(); } };
		document.addEventListener('keydown', esc);
		return () => document.removeEventListener('keydown', esc);
	}, [open]);

	// Focus the command bar from anywhere. The keybinding (⌘J by default) is owned
	// by the central keybinding service, which dispatches this event.
	useEffect(() => {
		const focus = () => { taRef.current?.focus(); if (hasHistory) setOpen(true); };
		window.addEventListener('velocity:focus-commandbar', focus);
		return () => window.removeEventListener('velocity:focus-commandbar', focus);
	}, [hasHistory]);

	function send() {
		const t = input.trim();
		if (!t) return;
		setInput('');
		void agent.send(brainKey, t);
	}

	return (
		<>
			{open && <div className="cbar-scrim" onMouseDown={() => setOpen(false)} />}
			<div className={`cbar${open ? ' open' : ''}${busy ? ' busy' : ''}`}>
				{open && (
					<div className="cbar-thread">
						<div className="cbar-thread-head">
							<span><Icon.sparkle />Agent</span>
							<span className="cbar-sp" />
							<span className={`cbar-ctx${context.pct >= 80 ? ' hot' : ''}`} title={`~${context.tokens.toLocaleString()} tokens in context · auto-compacts when full`}>
								<span className="cbar-ctx-bar"><i style={{ width: `${context.pct}%` }} /></span>
								{context.pct}%
							</span>
							<button className="cbar-collapse" title="New chat" onClick={() => agent.reset(brainKey)}><Icon.plus /></button>
							<button className="cbar-collapse" title="Collapse" onClick={() => setOpen(false)}><Icon.chevron /></button>
						</div>
						<AgentThread brainKey={brainKey} />
					</div>
				)}

				{busy && !open && (
					<button className="cbar-activity" onClick={() => setOpen(true)} title="Show what the agent is doing">
						<span className="spin" />
						<b>Agent is working</b>
						{activity && <span className="cbar-act">{activity}</span>}
						{queued.length > 0 && <span className="cbar-q">{queued.length} queued</span>}
						<span className="cbar-up"><Icon.chevron /></span>
					</button>
				)}

				<div className="cbar-input">
					<button className="cbar-plus" title="Attach the current file as context" aria-label="Add context" onClick={addContext}><Icon.plus /></button>
					<textarea
						ref={taRef}
						rows={1}
						value={input}
						placeholder={busy ? 'Queue a follow-up…' : 'Tell the agent what to do…'}
						onFocus={() => { if (hasHistory) setOpen(true); }}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
					/>
					<ModelPicker />
					<button className="cbar-send" onClick={send} disabled={!input.trim()} title={busy ? 'Queue follow-up' : 'Send'} aria-label="Send">
						{busy ? <Icon.plus /> : <Icon.send />}
					</button>
				</div>
			</div>
		</>
	);
}
