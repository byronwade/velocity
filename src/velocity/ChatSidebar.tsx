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
import { ArrowUp, AtSign, MessageSquare, Pin, Activity, Copy, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';
import { chatModel, setChatModel, pinnedChatModel } from './chatai';
import { listOllamaModels, DEFAULT_OLLAMA_URL } from '../services/ollama';

const MIN_W = 300;
const MAX_W = 600;

const SUGGESTIONS = [
	'@Maya tighten the hero spacing',
	'Add tests for the checkout flow',
	'Make the onboarding responsive',
];

/** The composer's model chip — shows which local model actually answers and
 *  lets you pin a specific installed one (or return to auto). Wired straight
 *  to chatai, so the choice is real, not decorative. */
function ModelChip() {
	const [open, setOpen] = useState(false);
	const [label, setLabel] = useState('…');
	const [models, setModels] = useState<string[]>([]);
	const wrapRef = useRef<HTMLDivElement>(null);
	useEffect(() => { void chatModel().then((m) => setLabel(m ?? 'offline · canned')); }, []);
	useEffect(() => {
		if (!open) return;
		void listOllamaModels(DEFAULT_OLLAMA_URL).then(setModels);
		const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
		const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		document.addEventListener('mousedown', close);
		document.addEventListener('keydown', esc);
		return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
	}, [open]);
	const pick = (m: string | null) => {
		setChatModel(m);
		setOpen(false);
		void chatModel().then((r) => setLabel(r ?? 'offline · canned'));
	};
	const pinned = pinnedChatModel();
	return (
		<div className="vs-mchip-wrap" ref={wrapRef}>
			<button type="button" className="vs-mchip" title="Model answering the chat" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
				<Sparkles size={12} /><span>{label}</span><ChevronDown size={11} />
			</button>
			{open && (
				<div className="vs-mpop" role="menu">
					<button className="vs-mpop-item" onClick={() => pick(null)}>
						<Sparkles size={13} /><span>Auto — best installed</span>{!pinned && <Check size={13} />}
					</button>
					{models.length > 0 && <div className="vs-mpop-group">Ollama · installed</div>}
					{models.map((m) => (
						<button key={m} className="vs-mpop-item" onClick={() => pick(m)}>
							<span className="vs-mpop-name">{m}</span>{pinned === m && <Check size={13} />}
						</button>
					))}
					{models.length === 0 && (
						<div className="vs-mpop-hint">No Ollama server reached — replies fall back to the deterministic lines. Run <code>ollama serve</code>.</div>
					)}
				</div>
			)}
		</div>
	);
}

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
			<div className="vs-chatbox" onClick={() => taRef.current?.focus()}>
				<textarea ref={taRef} value={draft} rows={1} placeholder="Message the team — @Name to direct it"
					onChange={(e) => {
						setDraft(e.target.value);
						e.target.style.height = 'auto';
						e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
					}}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
				<div className="vs-chatbox-tools" onClick={(e) => e.stopPropagation()}>
					<button className="vs-ctool" title="Mention a coworker — @Name routes the request"
						onClick={() => { setDraft((d) => (d && !d.endsWith(' ') ? `${d} @` : `${d}@`)); taRef.current?.focus(); }}>
						<AtSign size={14} />
					</button>
					<span className="vs-cspacer" />
					<ModelChip />
					<button className="vs-send" disabled={!draft.trim()} onClick={() => send()} aria-label="Send"><ArrowUp size={15} /></button>
				</div>
			</div>
			<div className="vs-chat-resize" onMouseDown={(e) => { drag.current = { x: e.clientX, w: width }; document.body.style.userSelect = 'none'; }} aria-hidden />
		</aside>
	);
}
