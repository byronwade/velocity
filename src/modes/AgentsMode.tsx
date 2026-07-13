// ---------------------------------------------------------------------------
// Agents — an agent composer in the Cursor 2.x mold: rich markdown responses,
// streaming tool cards, a "Files Changed" review card for real edits, and a
// polished follow-up bar with a model selector. Every action is real (see
// services/agent.ts); the review card lists the files the agent actually wrote.
// ---------------------------------------------------------------------------

import { memo, useEffect, useRef, useState } from 'react';
import { useServices } from '../services/container';
import { useAgentThread, type AgentMessage, type FileChange, type ToolCall } from '../services/agent';
import { ModelPicker } from '../components/ModelPicker';
import { Icon, type IconName } from '../lib/icons';

const TOOL_ICON: Record<string, IconName> = {
	terminal: 'terminal',
	write: 'file',
	open: 'editor',
	read: 'files',
	search: 'search',
	plan: 'sparkle',
};

function basename(path: string): string {
	const i = path.lastIndexOf('/');
	return i === -1 ? path : path.slice(i + 1);
}

/** Inline formatting: `code` and **bold**. */
function renderInline(text: string, key: number) {
	const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
	return (
		<span key={key}>
			{parts.map((seg, j) => {
				if (seg.startsWith('`') && seg.endsWith('`')) {
					return <code key={j}>{seg.slice(1, -1)}</code>;
				}
				if (seg.startsWith('**') && seg.endsWith('**')) {
					return <strong key={j}>{seg.slice(2, -2)}</strong>;
				}
				return <span key={j}>{seg}</span>;
			})}
		</span>
	);
}

/** Block-level markdown: headings, bullet lists, paragraphs. */
function Prose({ text }: { text: string }) {
	const lines = text.split('\n');
	const blocks: React.ReactNode[] = [];
	let bullets: string[] = [];
	const flush = () => {
		if (bullets.length) {
			blocks.push(
				<ul key={`u${blocks.length}`}>
					{bullets.map((b, i) => (
						<li key={i}>{renderInline(b, i)}</li>
					))}
				</ul>,
			);
			bullets = [];
		}
	};
	for (const raw of lines) {
		const line = raw.trimEnd();
		if (/^[-•]\s+/.test(line)) {
			bullets.push(line.replace(/^[-•]\s+/, ''));
		} else if (/^###\s+/.test(line)) {
			flush();
			blocks.push(<h4 key={blocks.length}>{renderInline(line.replace(/^###\s+/, ''), 0)}</h4>);
		} else if (/^##\s+/.test(line)) {
			flush();
			blocks.push(<h3 key={blocks.length}>{renderInline(line.replace(/^##\s+/, ''), 0)}</h3>);
		} else if (line.trim() === '') {
			flush();
		} else {
			flush();
			blocks.push(<p key={blocks.length}>{renderInline(line, 0)}</p>);
		}
	}
	flush();
	return <>{blocks}</>;
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

function ChangesCard({ files }: { files: FileChange[] }) {
	const [expanded, setExpanded] = useState(false);
	const shown = expanded ? files : files.slice(0, 4);
	return (
		<div className="changes-card">
			<div className="cc-head">
				<span>{files.length} File{files.length === 1 ? '' : 's'} Changed</span>
				<span className="cc-review">Review</span>
			</div>
			{shown.map((f, i) => (
				<div className="cc-row" key={i} title={f.path}>
					<Icon.file />
					<span className="cc-name">{basename(f.path)}</span>
					<span className="cc-stat">
						<span className="add">+{f.added}</span> <span className="del">−{f.removed}</span>
					</span>
				</div>
			))}
			{files.length > 4 && (
				<button className="cc-more" onClick={() => setExpanded((e) => !e)}>
					{expanded ? 'Show less' : `Show ${files.length - 4} more`}
				</button>
			)}
		</div>
	);
}

// Memoized: with the agent service updating messages immutably, only the
// message whose object identity changed (the streaming one) re-renders — the
// rest of the conversation is skipped.
const MessageView = memo(function MessageView({ m }: { m: AgentMessage }) {
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
			{m.text && <div className="prose"><Prose text={m.text} />{m.pending && <span className="stream-caret" aria-hidden />}</div>}
			{m.changes && m.changes.length > 0 && <ChangesCard files={m.changes} />}
			{m.pending && !m.text && m.tools.length === 0 && <div className="typing"><i /><i /><i /></div>}
			{!m.pending && m.text && (
				<div className="msg-actions">
					<button title="Good response"><Icon.thumbUp /></button>
					<button title="Bad response"><Icon.thumbDown /></button>
					<button title="Copy" onClick={() => navigator.clipboard?.writeText(m.text)}><Icon.copy /></button>
				</div>
			)}
		</div>
	);
});

/** The scrollable conversation for an agent brain (keyed by `brainKey`). */
export function AgentThread({ brainKey }: { brainKey: string }) {
	const { thread, busy } = useAgentThread(brainKey);
	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [thread, busy]);
	return (
		<div className="agent-thread" ref={scrollRef}>
			{thread.map((m) => (
				<MessageView key={m.id} m={m} />
			))}
		</div>
	);
}

/** The persistent composer that drives an agent brain. */
export function AgentComposer({ brainKey }: { brainKey: string }) {
	const { agent } = useServices();
	const { thread, busy } = useAgentThread(brainKey);
	const [input, setInput] = useState('');

	function send() {
		const t = input.trim();
		if (!t || busy) {
			return;
		}
		setInput('');
		void agent.send(brainKey, t);
	}

	const lastChanges = [...thread].reverse().find((m) => m.changes && m.changes.length)?.changes;
	const added = lastChanges?.reduce((s, f) => s + f.added, 0) ?? 0;
	const removed = lastChanges?.reduce((s, f) => s + f.removed, 0) ?? 0;

	return (
		<div className="agent-composer">
			{lastChanges && (
				<div className="agent-chips">
					<span className="achip"><Icon.diff />Changes <b className="add">+{added}</b> <b className="del">−{removed}</b></span>
				</div>
			)}
			<div className="ac-box">
				<textarea
					rows={1}
					value={input}
					placeholder="Ask for follow-up changes…"
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							send();
						}
					}}
				/>
				<div className="ac-row">
					<button className="ac-plus" title="Add context" aria-label="Add context"><Icon.plus /></button>
					<span className="ac-sp" />
					<ModelPicker />
					<button className="ac-mic" title="Voice" aria-label="Voice"><Icon.mic /></button>
					<button className="ac-send" onClick={send} disabled={!input.trim() || busy} title="Send" aria-label="Send">
						{busy ? <span className="spin" /> : <Icon.send />}
					</button>
				</div>
			</div>
			<div className="ac-foot">
				<Icon.git />
				<span>main</span>
				<span className="dot">·</span>
				<span>Local agent</span>
				<span className="sp" />
				<span className={busy ? 'work' : undefined}>{busy ? 'working…' : 'ready'}</span>
			</div>
		</div>
	);
}

export function AgentsMode({ paneId }: { paneId: string }) {
	return (
		<div className="mode agents">
			<AgentThread brainKey={paneId} />
			<AgentComposer brainKey={paneId} />
		</div>
	);
}
