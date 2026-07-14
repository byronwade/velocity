import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShell } from '../lib/store';
import { applyCockpitMode } from './ModeRail';
import { Icon } from '../lib/icons';

interface Member { name: string; initial: string; color: string; role: string; pending?: boolean }

const AVATAR_COLORS = ['linear-gradient(135deg,#0ea5e9,#22d3ee)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#22c55e,#14b8a6)', 'linear-gradient(135deg,#a855f7,#ec4899)'];

async function copy(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export function ShareSheet({ kind, onClose }: { kind: 'invite' | 'share'; onClose: () => void }) {
	const titleId = useId();
	const project = useShell((s) => s.projects.find((p) => p.id === (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0])?.projectId));
	const addProject = useShell((s) => s.addProject);
	const slug = (project?.name ?? 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-');
	const url = `https://velocity.dev/@byron/${slug}`;

	const [members, setMembers] = useState<Member[]>([{ name: 'Byron (you)', initial: 'B', color: 'linear-gradient(135deg,#7c5cff,#d94fb0)', role: 'Admin' }]);
	const [email, setEmail] = useState('');
	const [publicLink, setPublicLink] = useState(false);
	const [copied, setCopied] = useState<'' | 'link' | 'embed'>('');

	const embedSnippet = useMemo(() => `<iframe src="${url}/embed" width="100%" height="600" style="border:0;border-radius:12px" title="${project?.name ?? 'Velocity'}"></iframe>`, [url, project?.name]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);

	function invite() {
		const e = email.trim();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return;
		const name = e.split('@')[0];
		setMembers((ms) => [...ms, { name: e, initial: name[0]?.toUpperCase() ?? '?', color: AVATAR_COLORS[ms.length % AVATAR_COLORS.length], role: 'Editor', pending: true }]);
		setEmail('');
	}

	function setRole(idx: number, role: string) {
		setMembers((ms) => ms.map((m, i) => (i === idx ? { ...m, role } : m)));
	}

	async function copyLink() { if (await copy(url)) { setCopied('link'); setTimeout(() => setCopied(''), 1500); } }
	async function copyEmbed() { if (await copy(embedSnippet)) { setCopied('embed'); setTimeout(() => setCopied(''), 1500); } }
	function fork() { addProject(`${project?.name ?? 'workspace'} fork`); onClose(); }
	function deploy() { applyCockpitMode('ship'); onClose(); }

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
								<input placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') invite(); }} />
								<button className="btn brand" onClick={invite} disabled={!email.trim()}>Invite</button>
							</div>
							{members.map((m, i) => (
								<div className="row-p" key={m.name}>
									<span className="av" style={{ background: m.color }}>{m.initial}</span>
									<span className="row-p-name">{m.name}{m.pending && <span className="row-p-pending">pending</span>}</span>
									{m.role === 'Admin' ? (
										<span className="role-static">Admin</span>
									) : (
										<select className="role-sel" value={m.role} onChange={(e) => setRole(i, e.target.value)} aria-label={`Role for ${m.name}`}>
											<option>Editor</option>
											<option>Viewer</option>
										</select>
									)}
								</div>
							))}
						</>
					) : (
						<>
							<div className="field">
								<input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
								<button className="btn" onClick={copyLink}><Icon.share />{copied === 'link' ? 'Copied!' : 'Copy'}</button>
							</div>
							<div className="field">
								<button className={`btn${publicLink ? ' on' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setPublicLink((v) => !v)}>
									{publicLink ? <Icon.check /> : null}
									{publicLink ? 'Public · anyone with the link can view' : 'Private · only invited members'}
								</button>
							</div>
							<div className="field">
								<button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={fork}>Fork</button>
								<button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={copyEmbed}>{copied === 'embed' ? 'Copied!' : 'Embed'}</button>
								<button className="btn brand" style={{ flex: 1, justifyContent: 'center' }} onClick={deploy}><Icon.rocket />Deploy</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
