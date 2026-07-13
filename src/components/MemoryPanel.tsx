// Memory panel — view and manage what the agent remembers across sessions.
// Opened from the account menu; edits persist immediately (services/memory).

import { useState } from 'react';
import { useMemories, addMemory, removeMemory, clearMemory } from '../services/memory';
import { Icon } from '../lib/icons';

export function MemoryPanel({ onClose }: { onClose: () => void }) {
	const notes = useMemories();
	const [draft, setDraft] = useState('');

	function add() {
		const t = draft.trim();
		if (!t) return;
		addMemory(t);
		setDraft('');
	}

	return (
		<div className="modal-scrim" onMouseDown={onClose}>
			<div className="mempanel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Agent memory">
				<div className="mem-head">
					<span><Icon.sparkle />Agent memory</span>
					<button className="mem-close" onClick={onClose} aria-label="Close"><Icon.close /></button>
				</div>
				<p className="mem-sub">Durable facts the agent recalls in every conversation. It also saves these itself when you say “remember …”.</p>
				<div className="mem-add">
					<input value={draft} placeholder="Add something to remember…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
					<button className="btn brand" onClick={add} disabled={!draft.trim()}>Add</button>
				</div>
				<div className="mem-list">
					{notes.length === 0 && <div className="mem-empty">Nothing remembered yet.</div>}
					{notes.map((n) => (
						<div className="mem-item" key={n.id}>
							<Icon.check />
							<span className="mem-text">{n.text}</span>
							<button className="mem-x" title="Forget" aria-label="Forget" onClick={() => removeMemory(n.id)}><Icon.close /></button>
						</div>
					))}
				</div>
				{notes.length > 0 && (
					<div className="mem-foot">
						<span>{notes.length} memor{notes.length === 1 ? 'y' : 'ies'}</span>
						<button className="mem-clear" onClick={() => clearMemory()}>Clear all</button>
					</div>
				)}
			</div>
		</div>
	);
}
