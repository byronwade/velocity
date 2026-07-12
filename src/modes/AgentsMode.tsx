// ---------------------------------------------------------------------------
// Agents — the AI-first surface. The composer drives a real agent (AgentService)
// whose tool calls operate this workspace: run commands, create/open files,
// scaffold apps, search. Tool cards stream in as the agent works. The "model" is
// a local backend today; swapping it for Claude is a one-line container change.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { useServices } from '../services/container';
import { useAgentThread, type AgentMessage, type ToolCall } from '../services/agent';
import { Icon, type IconName } from '../lib/icons';

const TOOL_ICON: Record<string, IconName> = {
	terminal: 'terminal',
	write: 'file',
	open: 'editor',
	read: 'files',
	search: 'search',
	plan: 'sparkle',
};

/** Minimal inline formatter: `code` spans and • bullet lines. */
function Prose({ text }: { text: string }) {
	return (
		<>
			{text.split('\n').map((line, i) => (
				<p key={i} className={line.startsWith('•') ? 'bul' : undefined}>
					{line.split(/(`[^`]+`)/g).map((seg, j) =>
						seg.startsWith('`') && seg.endsWith('`') ? <code key={j}>{seg.slice(1, -1)}</code> : <span key={j}>{seg}</span>,
					)}
				</p>
			))}
		</>
	);
}

function ToolCardView({ tc }: { tc: ToolCall }) {
	const Glyph = Icon[TOOL_ICON[tc.tool] ?? 'command'];
	return (
		<div className={`toolcard ${tc.status}`}>
			<span className="tk"><Glyph /></span>
			<span className="tlabel">{tc.label}</span>
			<span className="tstat">{tc.status === 'running' ? <span className="spin" /> : tc.status === 'error' ? '!' : <Icon.check />}</span>
			{tc.output && <pre className="tout">{tc.output}</pre>}
		</div>
	);
}

function MessageView({ m }: { m: AgentMessage }) {
	if (m.role === 'user') {
		return (
			<div className="msg req">
				<div className="b">{m.text}</div>
			</div>
		);
	}
	return (
		<div className="msg res">
			<div className="role">
				<span className="av"><Icon.sparkle /></span>Velocity Agent
			</div>
			{m.tools.map((tc) => (
				<ToolCardView key={tc.id} tc={tc} />
			))}
			{m.text && <div className="prose"><Prose text={m.text} /></div>}
			{m.pending && !m.text && m.tools.length === 0 && <div className="typing"><i /><i /><i /></div>}
		</div>
	);
}

export function AgentsMode({ paneId }: { paneId: string }) {
	const { agent } = useServices();
	const { thread, busy } = useAgentThread(paneId);
	const [input, setInput] = useState('');
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [thread, busy]);

	function send() {
		const t = input.trim();
		if (!t || busy) {
			return;
		}
		setInput('');
		void agent.send(paneId, t);
	}

	return (
		<div className="mode agents">
			<div className="agent-thread" ref={scrollRef}>
				{thread.map((m) => (
					<MessageView key={m.id} m={m} />
				))}
			</div>
			<div className="composer">
				<div className="in">
					<textarea
						rows={1}
						value={input}
						placeholder="Ask the agent to build, run, open, or explain…"
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								send();
							}
						}}
					/>
					<div className="r">
						<span className="chip">Agent</span>
						<span className="chip">Local</span>
						<button className="send" aria-label="Send" disabled={busy || !input.trim()} onClick={send}>
							<Icon.send />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
