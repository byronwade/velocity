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
import { Icon } from '../lib/icons';

export function CommandBar() {
	const { agent } = useServices();
	const activeProjectId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0])?.projectId);
	const brainKey = `proj:${activeProjectId ?? 'global'}`;
	const { thread, busy, queued } = useAgentThread(brainKey);

	const [open, setOpen] = useState(false);
	const [input, setInput] = useState('');
	const taRef = useRef<HTMLTextAreaElement>(null);

	const hasHistory = thread.some((m) => m.role === 'user');
	const lastAsst = [...thread].reverse().find((m) => m.role === 'assistant');
	const runningTool = lastAsst?.tools.find((t) => t.status === 'running');
	const activity = runningTool ? runningTool.label : busy ? 'Thinking…' : '';

	// Collapse the thread panel on Escape.
	useEffect(() => {
		if (!open) return;
		const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); taRef.current?.blur(); } };
		document.addEventListener('keydown', esc);
		return () => document.removeEventListener('keydown', esc);
	}, [open]);

	// ⌘J / Ctrl-J focuses the command bar from anywhere.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); taRef.current?.focus(); if (hasHistory) setOpen(true); }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
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
					<button className="cbar-plus" title="Add context / plugins" aria-label="Add context"><Icon.plus /></button>
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
