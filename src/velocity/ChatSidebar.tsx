// ---------------------------------------------------------------------------
// Chat sidebar — the collaborative record, v0-style on the left.
//
// One feed: messages from humans AND coworkers (agents answer, and riff off
// each other), pinned work items, and the activity stream (started / landed /
// completed), so it doubles as a live progress log. It is deliberately NOT the
// core of the product — directing work stays on the app via comments.
//
// The surface follows the Vercel AI SDK Elements vocabulary — Conversation,
// Message (user bubbles right, assistant plain left), PromptInput,
// Suggestions, and per-message Actions — implemented on Velocity's token
// system (this repo is not Tailwind/shadcn). Resizable like every panel.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Pin, Activity, Copy, Check } from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';

const MIN_W = 300;
const MAX_W = 600;

const SUGGESTIONS = [
	'@Maya tighten the hero spacing',
	'Add tests for the checkout flow',
	'Make the onboarding responsive',
];

/** AI Elements "Actions" — hover utilities on a message. */
function MsgActions({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button className="vs-chat-act" title="Copy message" aria-label="Copy message"
			onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
			{copied ? <Check size={12} /> : <Copy size={12} />}
		</button>
	);
}

export function ChatSidebar() {
	const state = useWorkspace();
	const [draft, setDraft] = useState('');
	const scrollRef = useRef<HTMLDivElement>(null);
	const taRef = useRef<HTMLTextAreaElement>(null);
	const feed = state.feed;

	// Resizable like every other panel — the grip lives on the right edge.
	const [width, setWidth] = useState(() => {
		try { return Math.min(MAX_W, Math.max(MIN_W, Number(localStorage.getItem('vs-chatw')) || 380)); } catch { return 380; }
	});
	const drag = useRef<{ x: number; w: number } | null>(null);
	useEffect(() => {
		const move = (e: MouseEvent) => { if (drag.current) setWidth(Math.min(MAX_W, Math.max(MIN_W, drag.current.w + (e.clientX - drag.current.x)))); };
		const up = () => {
			if (!drag.current) return;
			drag.current = null;
			document.body.style.userSelect = '';
			setWidth((w) => { try { localStorage.setItem('vs-chatw', String(w)); } catch { /* ignore */ } return w; });
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', up);
		return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
	}, []);

	// Conversation behavior: stick to the bottom as new entries land.
	useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [feed.length]);

	if (!state.layout.chatOpen) return null;

	const send = (text?: string) => {
		const t = (text ?? draft).trim();
		if (!t) return;
		runtime.sendChat(t);
		setDraft('');
		if (taRef.current) taRef.current.style.height = 'auto';
	};

	return (
		<aside className="vs-chat" style={{ width, flexBasis: width }} aria-label="Chat and activity">
			<header className="vs-chat-head">
				<MessageSquare size={14} />
				<b>Chat</b>
				<span>team · coworkers · activity</span>
			</header>
			<div className="vs-chat-feed" ref={scrollRef}>
				{feed.length === 0 && (
					<div className="vs-chat-empty">
						Talk to your team — coworkers answer here, work pins and
						progress land here automatically.
					</div>
				)}
				{feed.map((f) => f.kind === 'msg' ? (
					f.fromCoworker ? (
						<div key={f.id} className="vs-chat-msg bot">
							<span className="vs-avatar sm neutral">{f.authorName.slice(0, 2).toUpperCase()}</span>
							<div className="vs-chat-msg-body">
								<div className="vs-chat-msg-head"><b>{f.authorName}</b><em>coworker</em><span>{f.tsLabel}</span>{f.text && <MsgActions text={f.text} />}</div>
								{f.text
									? <div className="vs-chat-msg-text">{f.text}</div>
									: <span className="vs-chat-typing" aria-label={`${f.authorName} is typing`}><i /><i /><i /></span>}
							</div>
						</div>
					) : (
						<div key={f.id} className="vs-chat-msg user">
							<div className="vs-chat-bubble">
								{f.text}
								<span className="vs-chat-bubble-acts">
									<button className="vs-chat-act" title="Pin as work — auto-assigns a coworker" aria-label="Pin as work"
										onClick={() => { runtime.addComment('browser', 46, 42, f.text); runtime.notify('Pinned as work.'); }}>
										<Pin size={12} />
									</button>
									<MsgActions text={f.text} />
								</span>
							</div>
						</div>
					)
				) : (
					<div key={f.id} className={`vs-chat-row ${f.kind}`}>
						{f.kind === 'work' ? <Pin size={11} /> : <Activity size={11} />}
						<span className="vs-chat-row-text">{f.kind === 'work' ? `${f.authorName} pinned: ${f.text}` : f.text}</span>
					</div>
				))}
			</div>
			{!feed.some((f) => f.kind === 'msg') && (
				<div className="vs-chat-suggests" aria-label="Suggestions">
					{SUGGESTIONS.map((s) => <button key={s} className="vs-chat-suggest" onClick={() => send(s)}>{s}</button>)}
				</div>
			)}
			<div className="vs-chat-input">
				<textarea ref={taRef} value={draft} rows={1} placeholder="Message the team — @Name to direct it"
					onChange={(e) => {
						setDraft(e.target.value);
						e.target.style.height = 'auto';
						e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
					}}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
				<button className="vs-chat-send" disabled={!draft.trim()} onClick={() => send()} aria-label="Send"><Send size={13} /></button>
			</div>
			<div className="vs-chat-resize" onMouseDown={(e) => { drag.current = { x: e.clientX, w: width }; document.body.style.userSelect = 'none'; }} aria-hidden />
		</aside>
	);
}
