// ---------------------------------------------------------------------------
// Chat lens — the collaborative record as a pane view, not a special window.
//
// One feed: messages from humans AND coworkers (agents answer, and riff off
// each other), pinned work items, and the activity stream (started / landed /
// completed), so it doubles as a live progress log. It is deliberately NOT the
// core of the product — directing work stays on the app via comments.
//
// Chat is a Lens like Browser or Terminal: pick it from any pane's view
// dropdown (key 8), split it, drag it, resize it with the ordinary pane
// system. No bespoke sidebar, no second layout mechanism.
//
// The surface follows the Vercel AI SDK Elements vocabulary — Conversation,
// Message (user bubbles right, assistant plain left), PromptInput,
// Suggestions, and per-message Actions — on Velocity's token system.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, AtSign, Pin, Activity, Copy, Check, ChevronDown, Flag, Sparkles } from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';
import { chatModel, setChatModel, pinnedChatModel } from './chatai';
import { listOllamaModels, DEFAULT_OLLAMA_URL } from '../services/ollama';

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
	// Probe on mount; while offline, keep re-probing so the chip recovers the
	// moment Ollama comes up (chatModel resets its null cache every 15s).
	useEffect(() => {
		let alive = true;
		const sync = () => void chatModel().then((m) => { if (alive) setLabel(m ?? 'offline · canned'); });
		sync();
		const t = setInterval(() => { if (label.startsWith('offline')) sync(); }, 16_000);
		return () => { alive = false; clearInterval(t); };
	}, [label]);
	useEffect(() => {
		if (!open) return;
		// Re-probe on open so the chip recovers when Ollama comes online later.
		void chatModel().then((m) => setLabel(m ?? 'offline · canned'));
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
			<button type="button" className={`vs-mchip${label.startsWith('offline') ? ' off' : ''}`} title="Model answering the chat" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
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

export function ChatLens() {
	const state = useWorkspace();
	const [draft, setDraft] = useState('');
	const scrollRef = useRef<HTMLDivElement>(null);
	const taRef = useRef<HTMLTextAreaElement>(null);
	const feed = state.feed;

	// Conversation behavior: stick to the bottom as entries land AND while a
	// reply streams (text growth) — but never yank the user out of scrollback.
	const lastLen = feed.length ? feed[feed.length - 1].text.length : 0;
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
		if (nearBottom) el.scrollTo(0, el.scrollHeight);
	}, [feed.length, lastLen]);

	const send = (text?: string) => {
		const t = (text ?? draft).trim();
		if (!t) return;
		runtime.sendChat(t);
		setDraft('');
		if (taRef.current) taRef.current.style.height = 'auto';
	};

	return (
		<div className="vs-chat lens" aria-label="Chat and activity">
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
								<div className="vs-chat-msg-head"><b>{f.authorName}</b><em>coworker</em><span>{f.tsLabel}</span>
									{f.text && (
										<>
											<button className="vs-chat-act" title="Pin this reply as work — auto-assigns a coworker" aria-label="Pin as work"
												onClick={() => { runtime.addComment('browser', 46, 42, f.text.slice(0, 200)); runtime.notify('Pinned as work.'); }}>
												<Pin size={12} />
											</button>
											<MsgActions text={f.text} />
										</>
									)}
								</div>
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
				) : f.eventKind === 'checkpoint' ? (
					/* Activity you can act on: a landed checkpoint opens straight in Review. */
					<button key={f.id} className={`vs-chat-row ${f.kind} vs-chat-row-link`} title="Open in Review"
						onClick={() => {
							const cw = state.coworkers.find((c) => f.text.startsWith(c.name));
							const ckp = state.checkpoints.find((k) => k.state === 'ready' && (!cw || k.coworkerId === cw.id))
								?? state.checkpoints.find((k) => !cw || k.coworkerId === cw.id);
							runtime.openRight('checkpoint', ckp?.id);
						}}>
						<Flag size={11} />
						<span className="vs-chat-row-text">{f.text}</span>
					</button>
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
		</div>
	);
}
