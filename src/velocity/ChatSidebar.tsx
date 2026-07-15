// ---------------------------------------------------------------------------
// Chat sidebar — the collaborative record, v0-style on the left.
//
// One feed: messages from humans AND coworkers (agents answer, and riff off
// each other), pinned work items, and the activity stream (started / landed /
// completed), so it doubles as a live progress log. It is deliberately NOT the
// core of the product — directing work stays on the app via comments; this is
// where the team talks about it and where you watch it move.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Pin, Activity } from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';

export function ChatSidebar() {
	const state = useWorkspace();
	const [draft, setDraft] = useState('');
	const scrollRef = useRef<HTMLDivElement>(null);
	const feed = state.feed;

	// Stick to the bottom as new entries land.
	useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [feed.length]);

	if (!state.layout.chatOpen) return null;

	const send = () => {
		const t = draft.trim();
		if (!t) return;
		runtime.sendChat(t);
		setDraft('');
	};

	return (
		<aside className="vs-chat" aria-label="Chat and activity">
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
					<div key={f.id} className={`vs-chat-msg${f.fromCoworker ? ' bot' : ''}`}>
						<span className="vs-avatar sm neutral">{f.authorName.slice(0, 2).toUpperCase()}</span>
						<div className="vs-chat-msg-body">
							<div className="vs-chat-msg-head"><b>{f.authorName}</b>{f.fromCoworker && <em>coworker</em>}<span>{f.tsLabel}</span></div>
							<div className="vs-chat-msg-text">{f.text}</div>
						</div>
					</div>
				) : (
					<div key={f.id} className={`vs-chat-row ${f.kind}`}>
						{f.kind === 'work' ? <Pin size={11} /> : <Activity size={11} />}
						<span className="vs-chat-row-text">{f.kind === 'work' ? `${f.authorName} pinned: ${f.text}` : f.text}</span>
					</div>
				))}
			</div>
			<div className="vs-chat-composer">
				<textarea value={draft} rows={1} placeholder="Message the team — @Name to direct it"
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
				<button className="vs-icon sm" disabled={!draft.trim()} onClick={send} aria-label="Send"><Send size={14} /></button>
			</div>
		</aside>
	);
}
