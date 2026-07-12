import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../lib/icons';

const MEMBERS = [
	{ name: 'Byron (you)', initial: 'B', color: 'linear-gradient(135deg,#7c5cff,#d94fb0)', role: 'Admin' },
	{ name: 'Maya Chen', initial: 'M', color: 'linear-gradient(135deg,#0ea5e9,#22d3ee)', role: 'Editor' },
	{ name: 'Kai Rivera', initial: 'K', color: 'linear-gradient(135deg,#f59e0b,#ef4444)', role: 'Editor' },
];

export function ShareSheet({ kind, onClose }: { kind: 'invite' | 'share'; onClose: () => void }) {
	const titleId = useId();
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') { onClose(); }
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);
	return createPortal(
		<div className="overlay" onMouseDown={onClose}>
			<div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(e) => e.stopPropagation()}>
				<div className="sh">
					<h2 id={titleId}>{kind === 'invite' ? 'Invite to workspace' : 'Share this workspace'}</h2>
					<span style={{ flex: 1 }} />
					<button className="ib" aria-label="Close" onClick={onClose}><Icon.close /></button>
				</div>
				<div className="sb">
					{kind === 'invite' ? (
						<>
							<div className="field">
								<input placeholder="name@company.com" />
								<button className="btn brand">Invite</button>
							</div>
							{MEMBERS.map((m) => (
								<div className="row-p" key={m.name}>
									<span className="av" style={{ background: m.color }}>{m.initial}</span>
									{m.name}
									<span className="role">{m.role} ▾</span>
								</div>
							))}
						</>
					) : (
						<>
							<div className="field">
								<input readOnly value="https://velocity.dev/@byron/streamline" />
								<button className="btn"><Icon.share />Copy</button>
							</div>
							<div className="field"><button className="btn" style={{ flex: 1, justifyContent: 'center' }}>Public link · anyone with the link can view</button></div>
							<div className="field">
								<button className="btn" style={{ flex: 1, justifyContent: 'center' }}>Fork</button>
								<button className="btn" style={{ flex: 1, justifyContent: 'center' }}>Embed</button>
								<button className="btn brand" style={{ flex: 1, justifyContent: 'center' }}><Icon.rocket />Deploy</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
