import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
	X, Plus, Check, RotateCcw, GitCompare, Eye, Pause, Play, Pencil, Trash2,
	CornerUpLeft, ShieldQuestion, FlaskConical, Camera, Activity, FileDiff, Circle,
	Users, ArchiveRestore, Terminal as TermIcon, Folder, AlertTriangle, GitBranch, Flag, EyeOff, ChevronRight,
} from 'lucide-react';
import { Link2, UserPlus, Check as CheckIcon, Rocket } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { TerminalMode } from '../modes/TerminalMode';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { useWorkspace, runtime } from './useWorkspace';
import { getServices } from '../services/container';
import { firstLeafOfView } from './panes';
import { isTauri } from './native';

// The real PTY terminal (xterm.js) — desktop only, loaded lazily so the
// browser bundle never carries it.
const NativeTerminal = lazy(() => import('./NativeTerminal'));

/** Jump from a changed-file row to the file in a Code pane. Seeded fixture
 *  paths may not exist in the workspace — say so instead of opening a blank. */
async function openInIDE(path: string): Promise<void> {
	const { fs, editor } = getServices();
	if (!(await fs.exists(path))) { runtime.notify(`${path} isn't in this workspace (seeded example).`); return; }
	const st = runtime.getState();
	const leaf = firstLeafOfView(st.layout.panes, 'code');
	const paneId = leaf ? leaf.id : st.layout.activePaneId;
	if (!leaf) runtime.setPaneView(paneId, 'code');
	await editor.bindPane(`velocity:editor:${paneId}`, path);
	runtime.closeRight();
}
import { AUTONOMY_LABEL, STATE_TONE, STATE_LABEL, LENS_META, EVENT_TONE, DEPLOY_TARGETS, checkpointReadiness } from './model';
import type { Autonomy, CollabRole, Coworker, EvidenceKind, Lens, Risk, ToolId, WorkspaceEvent } from './model';

// --------------------------------------------------------------------------
// Mission Sheet — structured intake (no chat composer).
// --------------------------------------------------------------------------
const EVIDENCE_KINDS: EvidenceKind[] = ['test', 'screenshot', 'trace', 'diff', 'health', 'recording'];

export function MissionSheet() {
	const state = useWorkspace();
	const [title, setTitle] = useState('');
	const [outcome, setOutcome] = useState('');
	const [criteria, setCriteria] = useState<string[]>(['']);
	const [include, setInclude] = useState('checkout, onboarding');
	const [exclude, setExclude] = useState('billing, auth provider');
	const [staffing, setStaffing] = useState<'auto' | 'manual'>('auto');
	const [autonomy, setAutonomy] = useState<Autonomy>('collaborative');
	const [risk, setRisk] = useState<Risk>('medium');
	const [evidence, setEvidence] = useState<EvidenceKind[]>(['test', 'screenshot']);
	const firstField = useRef<HTMLInputElement>(null);

	useEffect(() => { firstField.current?.focus(); }, []);
	if (!state.layout.missionSheetOpen) return null;

	const canSubmit = title.trim().length > 0 && outcome.trim().length > 0;
	const submit = () => {
		if (!canSubmit) return;
		runtime.createMission({
			title: title.trim(), outcome: outcome.trim(),
			acceptanceCriteria: criteria.map((c) => c.trim()).filter(Boolean),
			includedScope: include.split(',').map((s) => s.trim()).filter(Boolean),
			excludedScope: exclude.split(',').map((s) => s.trim()).filter(Boolean),
			staffing, autonomy, approvalPolicy: 'guarded',
			budget: { spent: 0, total: 8, unit: '$' }, environment: 'Candidate', risk,
			requiredEvidence: evidence,
		});
	};

	return (
		<div className="vs-scrim" onClick={() => runtime.openMissionSheet(false)}>
			<div className="vs-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New mission">
				<header className="vs-sheet-head">
					<div><h2>New mission</h2><p>Describe the outcome. Velocity staffs a coworker and works toward it.</p></div>
					<button className="vs-icon" onClick={() => runtime.openMissionSheet(false)} aria-label="Close"><X size={16} /></button>
				</header>
				<div className="vs-sheet-body">
					<label className="vs-f"><span>Title</span>
						<input ref={firstField} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rebuild checkout onboarding" /></label>
					<label className="vs-f"><span>Outcome</span>
						<textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} placeholder="A returning customer can sign in with a passkey and reach checkout in one step." /></label>
					<div className="vs-f"><span>Acceptance criteria</span>
						<div className="vs-crit">
							{criteria.map((c, i) => (
								<div key={i} className="vs-crit-row">
									<Circle size={7} />
									<input value={c} onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Passkey sign-in works on returning visit" />
									{criteria.length > 1 && <button className="vs-icon sm" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}><X size={13} /></button>}
								</div>
							))}
							<button className="vs-add" onClick={() => setCriteria([...criteria, ''])}><Plus size={13} />Add criterion</button>
						</div>
					</div>
					<div className="vs-f2">
						<label className="vs-f"><span>In scope</span><input value={include} onChange={(e) => setInclude(e.target.value)} /></label>
						<label className="vs-f"><span>Out of scope</span><input value={exclude} onChange={(e) => setExclude(e.target.value)} /></label>
					</div>
					<div className="vs-f3">
						<label className="vs-f"><span>Staffing</span>
							<select value={staffing} onChange={(e) => setStaffing(e.target.value as 'auto' | 'manual')}><option value="auto">Auto-staff</option><option value="manual">I'll assign</option></select></label>
						<label className="vs-f"><span>Autonomy</span>
							<select value={autonomy} onChange={(e) => setAutonomy(e.target.value as Autonomy)}>{Object.entries(AUTONOMY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
						<label className="vs-f"><span>Risk</span>
							<select value={risk} onChange={(e) => setRisk(e.target.value as Risk)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
					</div>
					<div className="vs-f"><span>Required evidence</span>
						<div className="vs-chips">
							{EVIDENCE_KINDS.map((k) => (
								<button key={k} className={`vs-chip${evidence.includes(k) ? ' on' : ''}`}
									onClick={() => setEvidence(evidence.includes(k) ? evidence.filter((x) => x !== k) : [...evidence, k])}>{k}</button>
							))}
						</div>
					</div>
				</div>
				<footer className="vs-sheet-foot">
					<span className="vs-hint">Coworker starts immediately · pause anytime</span>
					<div className="vs-spacer" />
					<button className="vs-app-ghost" onClick={() => runtime.openMissionSheet(false)}>Cancel</button>
					<button className="vs-app-primary" disabled={!canSubmit} onClick={submit}>Start mission</button>
				</footer>
			</div>
		</div>
	);
}

// --------------------------------------------------------------------------
// Share — invite real people to collaborate on the project.
// --------------------------------------------------------------------------
const ROLE_LABEL: Record<CollabRole, string> = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };

export function ShareSheet() {
	const state = useWorkspace();
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<CollabRole>('editor');
	const [copied, setCopied] = useState(false);
	const emailRef = useRef<HTMLInputElement>(null);
	useEffect(() => { if (state.layout.shareOpen) emailRef.current?.focus(); }, [state.layout.shareOpen]);
	if (!state.layout.shareOpen) return null;

	const valid = /.+@.+\..+/.test(email);
	const invite = () => { if (!valid) return; runtime.inviteCollaborator(email, role); setEmail(''); };
	const copy = () => { try { void navigator.clipboard?.writeText('https://velocity.app/p/aurora?invite=team'); } catch { /* ignore */ } setCopied(true); setTimeout(() => setCopied(false), 1600); };

	return (
		<div className="vs-scrim" onClick={() => runtime.openShare(false)}>
			<div className="vs-sheet vs-share" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Share project">
				<header className="vs-sheet-head">
					<div><h2>Share {state.project.name}</h2><p>Invite people to view, comment, and direct coworkers with you.</p></div>
					<button className="vs-icon" onClick={() => runtime.openShare(false)} aria-label="Close"><X size={16} /></button>
				</header>
				<div className="vs-sheet-body">
					<div className="vs-invite">
						<input ref={emailRef} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com"
							onKeyDown={(e) => { if (e.key === 'Enter') invite(); }} />
						<select value={role} onChange={(e) => setRole(e.target.value as CollabRole)}>
							<option value="editor">Editor</option><option value="viewer">Viewer</option>
						</select>
						<button className="vs-app-primary" disabled={!valid} onClick={invite}><UserPlus size={14} />Invite</button>
					</div>
					<div className="vs-collab-list">
						{state.collaborators.map((c) => (
							<div key={c.id} className="vs-collab">
								<span className="vs-avatar" style={{ background: c.color }}>{c.initials}</span>
								<div className="vs-collab-id"><b>{c.name}{c.id === 'you' && ' (you)'}</b><span>{c.email}</span></div>
								{c.status === 'invited' && <span className="vs-tag">invited</span>}
								{c.status === 'active' && c.id !== 'you' && <span className="vs-collab-live" title="Active now" />}
								<span className="vs-collab-role">{ROLE_LABEL[c.role]}</span>
								{c.role !== 'owner' && <button className="vs-icon sm" onClick={() => runtime.removeCollaborator(c.id)} aria-label={`Remove ${c.name}`}><X size={14} /></button>}
							</div>
						))}
					</div>
				</div>
				<footer className="vs-sheet-foot">
					<button className="vs-app-ghost" onClick={copy}>{copied ? <><CheckIcon size={14} />Copied</> : <><Link2 size={14} />Copy invite link</>}</button>
					<div className="vs-spacer" />
					<button className="vs-app-primary" onClick={() => runtime.openShare(false)}>Done</button>
				</footer>
			</div>
		</div>
	);
}

// --------------------------------------------------------------------------
// Ship — deploy to a host (opened from the header Ship button).
// --------------------------------------------------------------------------
export function ShipSheet() {
	const state = useWorkspace();
	if (!state.layout.shipOpen) return null;
	const dep = state.deployment ?? null;
	return (
		<div className="vs-scrim" onClick={() => runtime.openShip(false)}>
			<div className="vs-sheet vs-shipsheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ship project">
				<header className="vs-sheet-head">
					<div><h2>Ship {state.project.name}</h2><p>All acceptance criteria verified · Candidate healthy · rollback ready.</p></div>
					<button className="vs-icon" onClick={() => runtime.openShip(false)} aria-label="Close"><X size={16} /></button>
				</header>
				<div className="vs-sheet-body">
					<div className="vs-ship-checks">
						<span className="vs-tag good">Build ok</span><span className="vs-tag good">28/28 tests</span><span className="vs-tag good">a11y AA</span><span className="vs-tag">Rollback @ 09:41</span>
					</div>
					<div className="vs-deploy-head">Deploy to a host</div>
					<div className="vs-deploy-grid">
						{DEPLOY_TARGETS.map((t) => {
							const on = dep?.provider === t.id;
							const deploying = on && dep?.status === 'deploying';
							const live = on && dep?.status === 'live';
							return (
								<div key={t.id} className={`vs-deploy${on ? ' on' : ''}${live ? ' live' : ''}`}>
									<div className="vs-deploy-top">
										<span className={`vs-deploy-mark ${t.id}`}>{t.label[0]}</span><b>{t.label}</b>
										{live && <span className="vs-tag good">Live</span>}
									</div>
									<div className="vs-deploy-url">{t.domain}</div>
									{deploying ? (
										<button className="vs-deploy-btn" disabled><span className="vs-spin" />Deploying…</button>
									) : live ? (
										<div className="vs-deploy-live">
											<a className="vs-deploy-visit" href={`https://${t.domain}`} target="_blank" rel="noreferrer">Visit ↗</a>
											<button className="vs-deploy-btn ghost" onClick={() => runtime.deploy(t.id)}>Redeploy</button>
										</div>
									) : (
										<button className="vs-deploy-btn" onClick={() => runtime.deploy(t.id)}><Rocket size={13} />Deploy</button>
									)}
								</div>
							);
						})}
					</div>
				</div>
				<footer className="vs-sheet-foot">
					<button className="vs-app-ghost" onClick={() => runtime.comparePreview('stable')}><GitCompare size={14} />Compare with Stable</button>
					<div className="vs-spacer" />
					{dep?.status === 'live' ? <span className="vs-ship-livenote">Production · {dep.url}</span> : <button className="vs-app-ghost" onClick={() => runtime.openShip(false)}>Done</button>}
				</footer>
			</div>
		</div>
	);
}

// --------------------------------------------------------------------------
// Right rail — Coworkers / Checkpoint / Decision.
// --------------------------------------------------------------------------
/** A floating panel that pops UP from the dock (replaces the old side rail). */
export function RightRail() {
	const state = useWorkspace();
	const surface = state.layout.rightSurface;
	if (surface === 'none' || surface === 'inspector') return null;
	const wide = surface === 'checkpoint' || surface === 'decision';
	return (
		<div className={`vs-dockpanel${wide ? ' wide' : ''}`} role="dialog">
			{surface === 'coworkers' && <CoworkersPanel />}
			{surface === 'checkpoint' && <CheckpointPanel />}
			{surface === 'decision' && <DecisionPanel />}
			{surface === 'activity' && <ActivityPanel />}
			{surface === 'follow' && <FollowPanel />}
			<span className="vs-dockpanel-caret" />
		</div>
	);
}

function FollowPanel() {
	const state = useWorkspace();
	const cw = state.coworkers.find((c) => c.id === state.layout.followingId);
	if (!cw) return <><header className="vs-rail-head"><Eye size={15} /><h3>Following</h3><button className="vs-icon" onClick={() => runtime.closeRight()}><X size={16} /></button></header><div className="vs-rail-body vs-empty-rail">Not following anyone. Click a coworker on the stage to follow.</div></>;
	const feed = state.events.filter((e) => e.coworkerId === cw.id);
	const checkpoint = state.checkpoints.find((k) => k.id === cw.latestCheckpointId);
	return (
		<>
			<header className="vs-rail-head" style={{ ['--id' as string]: cw.color }}>
				<span className="vs-avatar sm" style={{ background: cw.color }}>{cw.initials}</span>
				<div className="vs-follow-id"><b>Following {cw.name}</b><span>{cw.role}</span></div>
				<button className="vs-icon" onClick={() => runtime.follow(null)} title="Stop following"><EyeOff size={15} /></button>
				<button className="vs-icon" onClick={() => runtime.closeRight()} aria-label="Close"><X size={16} /></button>
			</header>
			<div className="vs-rail-body">
				<div className="vs-follow-now">
					<span className={`vs-state tone-${STATE_TONE[cw.state]}`}>{STATE_LABEL[cw.state]}</span>
					<span className="vs-follow-act">{cw.action}{cw.waitingOn ? ` · waiting on ${cw.waitingOn}` : ''}</span>
				</div>
				{cw.scope && <div className="vs-cw-scope"><GitBranch size={11} />{cw.scope}</div>}
				<div className="vs-follow-sec">Doing now</div>
				<div className="vs-follow-live"><span className="vs-follow-pulse" style={{ background: cw.color }} />Editing on the <b>{cw.marker?.lens ?? 'browser'}</b> lens — {cw.marker?.label ?? cw.action}</div>
				{checkpoint && (
					<>
						<div className="vs-follow-sec">Latest checkpoint</div>
						<button className="vs-follow-ckp" onClick={() => runtime.openRight('checkpoint', checkpoint.id)}>
							<Flag size={13} /><span>{checkpoint.outcome}</span><span className="vs-tag good">{checkpoint.tests.passed}/{checkpoint.tests.total}</span>
						</button>
					</>
				)}
				<div className="vs-follow-sec">Activity</div>
				<div className="vs-feed">
					{feed.length === 0 && <div className="vs-empty-rail">No recent activity.</div>}
					{feed.map((e) => (
						<div key={e.id} className="vs-feed-row">
							<span className={`vs-feed-rail tone-${EVENT_TONE[e.kind]}`} />
							<div className="vs-feed-main"><div className="vs-feed-top"><span className={`vs-feed-kind tone-${EVENT_TONE[e.kind]}`}>{EVENT_VERB[e.kind]}</span><span className="vs-feed-ts">{e.tsLabel}</span></div><div className="vs-feed-text">{e.text}</div></div>
						</div>
					))}
				</div>
			</div>
		</>
	);
}

// --------------------------------------------------------------------------
// Activity — the structured coordination feed (the substitute for chatter).
// --------------------------------------------------------------------------
const EVENT_VERB: Record<WorkspaceEvent['kind'], string> = {
	reserve: 'Reserved', waiting: 'Waiting', 'conflict-avoided': 'Conflict avoided', conflict: 'Conflict',
	reassign: 'Reassigned', checkpoint: 'Checkpoint', merge: 'Merged', 'verify-fail': 'Check failed',
	'verify-pass': 'Verified', note: 'Note',
};

function ActivityPanel() {
	const state = useWorkspace();
	const byId = (id: string | null) => state.coworkers.find((c) => c.id === id) ?? state.archived.find((c) => c.id === id);
	return (
		<>
			<header className="vs-rail-head"><Activity size={15} /><h3>Activity</h3><span className="vs-count">{state.events.length}</span>
				<button className="vs-icon" onClick={() => runtime.closeRight()} aria-label="Close"><X size={16} /></button></header>
			<div className="vs-rail-body vs-feed">
				{state.events.length === 0 && <div className="vs-empty-rail">No activity yet.</div>}
				{state.events.map((e) => {
					const cw = byId(e.coworkerId);
					return (
						<div key={e.id} className="vs-feed-row">
							<span className={`vs-feed-rail tone-${EVENT_TONE[e.kind]}`} />
							<div className="vs-feed-main">
								<div className="vs-feed-top">
									{cw && <span className="vs-avatar sm" style={{ background: cw.color }}>{cw.initials}</span>}
									<span className={`vs-feed-kind tone-${EVENT_TONE[e.kind]}`}>{EVENT_VERB[e.kind]}</span>
									<span className="vs-feed-ts">{e.tsLabel}</span>
								</div>
								<div className="vs-feed-text">{e.text}</div>
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
}

const CW_MODELS = ['Auto · frontier', 'Claude Opus 4.8', 'Claude Sonnet 5', 'Local · qwen2.5-coder'];

function CoworkerCard({ c }: { c: Coworker }) {
	const [renaming, setRenaming] = useState(false);
	const [name, setName] = useState(c.name);
	const ctx = useContextMenu();
	const budgetPct = Math.min(100, (c.budget.spent / c.budget.total) * 100);

	const menu = () => [
		...(c.marker ? [{ label: 'Jump to their work', icon: <CornerUpLeft size={14} />, onClick: () => runtime.locateCoworker(c.id) }] : []),
		{ label: c.following ? 'Unfollow' : 'Follow', icon: <Eye size={14} />, onClick: () => runtime.follow(c.following ? null : c.id) },
		{ label: c.state === 'paused' ? 'Resume' : 'Pause', icon: c.state === 'paused' ? <Play size={14} /> : <Pause size={14} />, onClick: () => (c.state === 'paused' ? runtime.resumeCoworker(c.id) : runtime.pauseCoworker(c.id)) },
		{ label: 'Rename', icon: <Pencil size={14} />, onClick: () => setRenaming(true) },
		{ separator: true },
		{ header: true, label: 'Model' },
		...CW_MODELS.map((m) => ({ label: m, checked: c.model === m, onClick: () => runtime.setModel(m === 'Auto · frontier' ? 'auto' : 'manual', m === c.model ? c.staffing : 'manual', m) })),
		{ header: true, label: 'Autonomy' },
		...Object.entries(AUTONOMY_LABEL).map(([k, v]) => ({ label: v, checked: c.autonomy === k, onClick: () => runtime.setAutonomy(c.id, k as Autonomy) })),
		{ separator: true },
		{ label: 'Dismiss', icon: <Trash2 size={14} />, danger: true, onClick: () => runtime.dismissCoworker(c.id) },
	];

	return (
		<div className="vs-wk">
			<div className="vs-wk-top">
				<span className="vs-wk-badge">{c.initials}</span>
				<div className="vs-wk-id">
					{renaming ? (
						<input className="vs-rename" autoFocus value={name} onChange={(e) => setName(e.target.value)}
							onBlur={() => { runtime.renameCoworker(c.id, name.trim() || c.name); setRenaming(false); }}
							onKeyDown={(e) => { if (e.key === 'Enter') { runtime.renameCoworker(c.id, name.trim() || c.name); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }} />
					) : <div className="vs-wk-name">{c.name}</div>}
					<div className="vs-wk-role">{c.role}</div>
				</div>
				<span className={`vs-state tone-${STATE_TONE[c.state]}`}>{STATE_LABEL[c.state]}</span>
				<div className="vs-wk-actions">
					<button className={`vs-wk-follow${c.following ? ' on' : ''}`} title={c.following ? 'Following' : 'Follow'} onClick={() => runtime.follow(c.following ? null : c.id)}><Eye size={14} /></button>
					<button className="vs-wk-more" title="More" onClick={ctx.onContextMenu} onContextMenu={ctx.onContextMenu}><MoreHorizontal size={15} /></button>
				</div>
			</div>

			{c.marker ? (
				<button className="vs-wk-now go" title={`Jump to the ${c.marker.lens} lens where ${c.name} is working`} onClick={() => runtime.locateCoworker(c.id)}>
					<span className="vs-wk-action">{c.action}{c.waitingOn ? ` · waiting on ${c.waitingOn}` : ''}</span>
					{typeof c.progress === 'number' && <span className="vs-wk-pct">{c.progress}%</span>}
					<ChevronRight size={12} className="vs-wk-go" />
				</button>
			) : (
				<div className="vs-wk-now">
					<span className="vs-wk-action">{c.action}{c.waitingOn ? ` · waiting on ${c.waitingOn}` : ''}</span>
					{typeof c.progress === 'number' && <span className="vs-wk-pct">{c.progress}%</span>}
				</div>
			)}
			{typeof c.progress === 'number' && <div className="vs-wk-bar"><span style={{ width: `${c.progress}%` }} /></div>}

			{(c.scope || c.activeTools?.length) && (
				<div className="vs-wk-tags">
					{c.scope && <span className="vs-wk-scope"><GitBranch size={10} />{c.scope}</span>}
					{c.activeTools?.map((t) => <span key={t} className="vs-wk-tool">{t}</span>)}
				</div>
			)}

			<div className="vs-wk-meta">
				<span>{c.model}</span><span className="vs-wk-sep">·</span>
				<span>{AUTONOMY_LABEL[c.autonomy]}</span><span className="vs-wk-sep">·</span>
				<span className="vs-wk-budget"><span className="vs-wk-budget-bar"><span style={{ width: `${budgetPct}%` }} /></span>{c.budget.unit}{c.budget.spent}/{c.budget.total}</span>
			</div>

			{c.specialists.length > 0 && (
				<div className="vs-wk-subs">
					<div className="vs-wk-subhead">{c.specialists.length} subagents</div>
					{c.specialists.map((s) => (
						<div key={s.id} className="vs-wk-sub">
							<div className="vs-wk-sub-body"><div className="vs-wk-sub-name"><b>{s.name}</b><span>{s.role}</span></div><div className="vs-wk-sub-action">{s.action}</div></div>
							<span className={`vs-state sm tone-${STATE_TONE[s.state]}`}>{STATE_LABEL[s.state]}</span>
						</div>
					))}
				</div>
			)}
			{ctx.at && <ContextMenu x={ctx.at.x} y={ctx.at.y} onClose={ctx.close} items={menu()} />}
		</div>
	);
}

const ROLE_LABEL2: Record<CollabRole, string> = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };

/** Unified "Workers" — AI coworkers and human teammates on the same project. */
function CoworkersPanel() {
	const state = useWorkspace();
	const [name, setName] = useState('');
	const [role, setRole] = useState('Frontend');
	const [email, setEmail] = useState('');
	const [invRole, setInvRole] = useState<CollabRole>('editor');
	const validEmail = /.+@.+\..+/.test(email);
	return (
		<>
			<header className="vs-rail-head"><Users size={15} /><h3>Workers</h3><span className="vs-count">{state.coworkers.length + state.collaborators.length}</span>
				<button className="vs-icon" onClick={() => runtime.closeRight()} aria-label="Close"><X size={16} /></button></header>
			<div className="vs-rail-body">
				<div className="vs-worker-sec">Coworkers · AI</div>
				{state.coworkers.map((c) => <CoworkerCard key={c.id} c={c} />)}
				<div className="vs-addcw">
					<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
					<input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" />
					<button className="vs-app-primary sm" disabled={!name.trim()} onClick={() => { runtime.addCoworker(name.trim(), role.trim() || 'Contributor'); setName(''); }}><Plus size={13} />Add</button>
				</div>

				<div className="vs-worker-sec">People</div>
				{state.collaborators.map((c) => (
					<div key={c.id} className="vs-person">
						<span className="vs-avatar neutral">{c.initials}</span>
						<div className="vs-person-id"><b>{c.name}{c.id === 'you' && ' (you)'}</b><span>{c.email}</span></div>
						{c.status === 'invited' ? <span className="vs-tag">invited</span> : c.id !== 'you' && <span className="vs-collab-live" title="Active now" />}
						<span className="vs-person-role">{ROLE_LABEL2[c.role]}</span>
						{c.role !== 'owner' && <button className="vs-icon sm" onClick={() => runtime.removeCollaborator(c.id)} aria-label={`Remove ${c.name}`}><X size={13} /></button>}
					</div>
				))}
				<div className="vs-invite">
					<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" onKeyDown={(e) => { if (e.key === 'Enter' && validEmail) { runtime.inviteCollaborator(email, invRole); setEmail(''); } }} />
					<select value={invRole} onChange={(e) => setInvRole(e.target.value as CollabRole)}><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
					<button className="vs-app-primary sm" disabled={!validEmail} onClick={() => { runtime.inviteCollaborator(email, invRole); setEmail(''); }}><UserPlus size={13} />Invite</button>
				</div>

				{state.archived.length > 0 && (
					<div className="vs-archive">
						<div className="vs-archive-head">Archived</div>
						{state.archived.map((c) => (
							<div key={c.id} className="vs-archive-row">
								<span className="vs-avatar sm neutral">{c.initials}</span>
								<span>{c.name} · {c.role}</span>
								<button className="vs-mini" onClick={() => runtime.restoreCoworker(c.id)}><ArchiveRestore size={12} />Restore</button>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
}

const EVIDENCE_ICON: Record<EvidenceKind, typeof FlaskConical> = {
	test: FlaskConical, screenshot: Camera, trace: Activity, diff: FileDiff, health: Activity, recording: Camera,
};

function CheckpointPanel() {
	const state = useWorkspace();
	// Two-step waive: the first click arms, the second confirms. Re-arms per checkpoint.
	const [armWaive, setArmWaive] = useState(false);
	// Real model-run checkpoints outrank simulated momentum in the queue.
	const k = state.checkpoints.find((c) => c.id === state.layout.activeCheckpointId)
		?? state.checkpoints.find((c) => c.state === 'ready' && c.origin === 'real')
		?? state.checkpoints[0];
	useEffect(() => { setArmWaive(false); }, [k?.id]);
	if (!k) return <div className="vs-rail-body vs-empty-rail">No checkpoints yet.</div>;
	const cw = state.coworkers.find((c) => c.id === k.coworkerId);
	const mission = state.missions.find((m) => m.id === k.missionId) ?? null;
	const gates = checkpointReadiness(k, mission);
	const open = gates.filter((g) => !g.ok);
	// An open gate is actionable: it jumps to the lens where you fix it.
	const GATE_LENS: Record<string, Lens> = { Build: 'terminal', Tests: 'tests', 'Acceptance criteria': 'verify', 'Required evidence': 'verify' };
	const jumpToLens = (lens: Lens) => {
		const leaf = firstLeafOfView(state.layout.panes, lens);
		if (leaf) runtime.focusPane(leaf.id);
		else runtime.setPaneView(state.layout.activePaneId, lens);
	};
	return (
		<>
			<header className="vs-rail-head"><Flag size={15} /><h3>Checkpoint</h3><span className={`vs-risk ${k.risk}`}>{k.risk} risk</span>
				<button className="vs-icon" onClick={() => runtime.closeRight()} aria-label="Close"><X size={16} /></button></header>
			<div className="vs-rail-body">
				<div className="vs-ckp-outcome">{k.outcome}</div>
				<div className="vs-ckp-by">{cw ? `${cw.name} · ${cw.role}` : 'Coworker'} · {k.createdLabel}</div>
				<div className="vs-ckp-metrics">
					<span className={`vs-tag ${k.buildOk ? 'good' : 'warn'}`}>{k.buildOk ? 'Build ok' : 'Build failing'}</span>
					<span className={`vs-tag ${k.tests.passed === k.tests.total ? 'good' : 'warn'}`}>{k.tests.passed}/{k.tests.total} tests</span>
				</div>
				<div className="vs-ckp-sec">Readiness — {open.length === 0 ? 'all gates passed' : `${open.length} gate${open.length > 1 ? 's' : ''} open`}
					<div className="vs-gates">{gates.map((g) => g.ok ? (
						<div key={g.label} className="vs-gate-row ok">
							<Check size={13} /><b>{g.label}</b>{g.detail && <span>· {g.detail}</span>}
						</div>
					) : (
						<button key={g.label} className="vs-gate-row act" title={`Open ${GATE_LENS[g.label] ?? 'verify'} to close this gate`}
							onClick={() => jumpToLens(GATE_LENS[g.label] ?? 'verify')}>
							<X size={13} /><b>{g.label}</b>{g.detail && <span>· {g.detail}</span>}
							<ChevronRight size={12} className="vs-gate-go" />
						</button>
					))}</div>
				</div>
				<div className="vs-ckp-sec">Changes
					<div className="vs-diff">{k.diff.map((d) => (
						<button key={d.path} className="vs-diff-row" title="Open in the IDE" onClick={() => void openInIDE(d.path)}><code>{d.path}</code><span className="vs-add-n">+{d.added}</span><span className="vs-rem-n">−{d.removed}</span></button>
					))}</div>
				</div>
				{k.patch && (
					<div className="vs-ckp-sec">Diff — what actually changed
						<pre className="vs-patch">{k.patch.split('\n').map((l, i) => (
							<span key={i} className={l.startsWith('+') ? 'add' : l.startsWith('-') ? 'rem' : l.startsWith('  ···') ? 'fold' : ''}>{l}{'\n'}</span>
						))}</pre>
					</div>
				)}
				<div className="vs-ckp-sec">Evidence
					<div className="vs-ev">{k.evidence.map((e, i) => { const I = EVIDENCE_ICON[e.kind]; return (
						<div key={i} className="vs-ev-row"><I size={13} /><b>{e.label}</b>{e.detail && <span>· {e.detail}</span>}</div>
					); })}</div>
				</div>
				<div className="vs-ckp-sec">Blast radius
					<div className="vs-blast">{k.blastRadius.map((b) => <span key={b} className="vs-tag">{b}</span>)}</div></div>
				<div className="vs-ckp-limits"><ShieldQuestion size={13} />{k.limitations}</div>
				<div className="vs-ckp-rollback"><CornerUpLeft size={12} />Rollback point: {k.rollbackPoint}</div>
			</div>
			<footer className="vs-ckp-foot">
				<div className="vs-ckp-utils">
					<button onClick={() => runtime.comparePreview('stable')}><GitCompare size={14} />Compare</button>
					<button onClick={() => runtime.reviseCheckpoint(k.id)}><Pencil size={14} />Revise</button>
					<button onClick={() => runtime.rollback(k.id)}><RotateCcw size={14} />Roll back</button>
				</div>
				<div className="vs-ckp-decide">
					<button className="vs-ckp-reject" onClick={() => runtime.rejectCheckpoint(k.id)}><X size={15} />Reject</button>
					{open.length === 0 ? (
						<button className="vs-ckp-accept" onClick={() => runtime.acceptCheckpoint(k.id)}><Check size={15} />Accept &amp; merge</button>
					) : armWaive ? (
						<button className="vs-ckp-accept waive" onClick={() => runtime.acceptCheckpoint(k.id, true)}>
							<ShieldQuestion size={15} />Confirm — waive {open.length} gate{open.length > 1 ? 's' : ''}
						</button>
					) : (
						<button className="vs-ckp-accept waive" onClick={() => setArmWaive(true)} title={`Open: ${open.map((g) => g.label).join(', ')}`}>
							<ShieldQuestion size={15} />Waive gates &amp; accept…
						</button>
					)}
				</div>
			</footer>
		</>
	);
}

function DecisionPanel() {
	const state = useWorkspace();
	const d = state.decisions.find((x) => x.id === state.layout.activeDecisionId) ?? state.decisions[0];
	if (!d) return <div className="vs-rail-body vs-empty-rail">No open decisions.</div>;
	return (
		<>
			<header className="vs-rail-head"><ShieldQuestion size={15} /><h3>Decision</h3><span className={`vs-risk ${d.risk}`}>{d.risk} risk</span>
				<button className="vs-icon" onClick={() => runtime.closeRight()} aria-label="Close"><X size={16} /></button></header>
			<div className="vs-rail-body">
				<div className="vs-dec-title">{d.title}</div>
				<div className="vs-dec-why">{d.why}</div>
				<div className="vs-dec-opts">
					{d.options.map((o) => (
						<button key={o.id} className={`vs-dec-opt${o.recommended ? ' rec' : ''}`} onClick={() => runtime.decide(d.id, o.id)}>
							<div className="vs-dec-opt-top"><b>{o.label}</b>{o.recommended && <span className="vs-tag good">Recommended</span>}</div>
							<span>{o.consequence}</span>
						</button>
					))}
				</div>
				<div className="vs-ckp-sec">Evidence
					<div className="vs-ev">{d.evidence.map((e, i) => { const I = EVIDENCE_ICON[e.kind]; return (
						<div key={i} className="vs-ev-row"><I size={13} /><b>{e.label}</b>{e.detail && <span>· {e.detail}</span>}</div>
					); })}</div></div>
				<div className="vs-ckp-sec">Blast radius<div className="vs-blast">{d.blastRadius.map((b) => <span key={b} className="vs-tag">{b}</span>)}</div></div>
			</div>
		</>
	);
}

// --------------------------------------------------------------------------
// Tool drawer — resizable / collapsible / closable developer surfaces.
// --------------------------------------------------------------------------
const TOOLS: { id: ToolId; label: string; icon: typeof Folder }[] = [
	{ id: 'explorer', label: 'Explorer', icon: Folder },
	{ id: 'terminal', label: 'Terminal', icon: TermIcon },
	{ id: 'logs', label: 'Logs', icon: Activity },
	{ id: 'problems', label: 'Problems', icon: AlertTriangle },
	{ id: 'scm', label: 'Source', icon: GitBranch },
	{ id: 'checkpoints', label: 'Checkpoints', icon: Flag },
];

export function ToolDrawer() {
	const state = useWorkspace();
	const open = state.layout.openTool;
	const [h, setH] = useState(240);
	const drag = useRef<{ y: number; h: number } | null>(null);
	useEffect(() => {
		const move = (e: MouseEvent) => { if (drag.current) setH(Math.min(520, Math.max(120, drag.current.h + (drag.current.y - e.clientY)))); };
		const up = () => { drag.current = null; document.body.style.userSelect = ''; };
		window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
		return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
	}, []);
	// Publish the docked panel height so the Dock + right rail sit above it.
	useEffect(() => {
		document.documentElement.style.setProperty('--vs-tools-h', open ? `${h}px` : '0px');
		return () => document.documentElement.style.setProperty('--vs-tools-h', '0px');
	}, [open, h]);
	if (!open) return null;
	return (
		<div className="vs-drawer" style={{ height: h }}>
			<div className="vs-drawer-grip" onMouseDown={(e) => { drag.current = { y: e.clientY, h }; document.body.style.userSelect = 'none'; }} />
			<div className="vs-drawer-tabs">
				{TOOLS.map((t) => (
					<button key={t.id} className={`vs-dtab${open === t.id ? ' on' : ''}`} onClick={() => runtime.openTool(t.id)}><t.icon size={13} />{t.label}</button>
				))}
				<div className="vs-spacer" />
				<button className="vs-icon" onClick={() => runtime.openTool(null)} aria-label="Close tools"><X size={15} /></button>
			</div>
			<div className={`vs-drawer-body${open === 'terminal' ? ' term' : ''}`}>{open === 'terminal' ? <TerminalPanel /> : renderTool(open)}</div>
		</div>
	);
}

const SHELLS = [
	{ id: 'bash', label: 'bash' },
	{ id: 'zsh', label: 'zsh' },
	{ id: 'pwsh', label: 'pwsh' },
	{ id: 'node', label: 'node' },
];

/** Real terminal with VS Code-style session management: a tab per terminal
 *  (closable), a + dropdown that opens any shell type, and kill-active.
 *  Exported: it renders both in the docked tools panel and as a pane view. */
export function TerminalPanel() {
	const [sessions, setSessions] = useState<{ id: number; shell: string }[]>([{ id: 1, shell: 'bash' }]);
	const [active, setActive] = useState(1);
	const [pickerOpen, setPickerOpen] = useState(false);
	const nextId = useRef(2);

	const add = (shell: string) => {
		const id = nextId.current++;
		setSessions((s) => [...s, { id, shell }]);
		setActive(id);
		setPickerOpen(false);
	};
	const kill = (id: number) => {
		setSessions((s) => {
			if (s.length <= 1) return s; // always keep one terminal
			const next = s.filter((x) => x.id !== id);
			if (id === active) setActive(next[next.length - 1].id);
			return next;
		});
	};
	const session = sessions.find((s) => s.id === active) ?? sessions[0];
	const sessionKey = `velocity:term:${session.shell}:${session.id}`;

	return (
		<div className="vs-termpanel">
			<div className="vs-term-bar">
				{sessions.map((s) => (
					<div key={s.id} className={`vs-term-tab${s.id === active ? ' on' : ''}`} role="tab" aria-selected={s.id === active} onClick={() => setActive(s.id)}>
						<TermIcon size={12} />
						<span>{s.shell} · {s.id}</span>
						{sessions.length > 1 && <button className="vs-term-x" aria-label={`Kill ${s.shell} ${s.id}`} onClick={(e) => { e.stopPropagation(); kill(s.id); }}><X size={11} /></button>}
					</div>
				))}
				<div className="vs-term-newwrap">
					<button className="vs-icon sm" title="New terminal — choose a shell" aria-label="New terminal" aria-expanded={pickerOpen} onClick={() => setPickerOpen((v) => !v)}><Plus size={13} /></button>
					{pickerOpen && (
						<>
							<div className="vs-pane-scrim" onClick={() => setPickerOpen(false)} />
							<div className="vs-term-picker" role="menu">
								{SHELLS.map((sh) => (
									<button key={sh.id} className="vs-term-pick" onClick={() => add(sh.id)}><TermIcon size={13} />{sh.label}</button>
								))}
							</div>
						</>
					)}
				</div>
				<div className="vs-spacer" />
				<button className="vs-icon sm" title="Kill the active terminal" aria-label="Kill terminal" disabled={sessions.length <= 1} onClick={() => kill(active)}><Trash2 size={13} /></button>
			</div>
			<div className="vs-term-host">
				{isTauri
					? <Suspense fallback={<div className="vs-term-loading">starting shell…</div>}><NativeTerminal key={sessionKey} sessionId={sessionKey} shell={session.shell} /></Suspense>
					: <TerminalMode key={sessionKey} paneId={sessionKey} />}
			</div>
		</div>
	);
}

function renderTool(tool: ToolId) {
	switch (tool) {
		case 'explorer': return (
			<div className="vs-tree">
				{['src/', '  onboarding/', '    Passkey.tsx', '    Onboarding.tsx', '    Onboarding.test.tsx', '  session/', '    session.ts', '  App.tsx', 'public/'].map((f) => (
					<div key={f} className={`vs-tree-row${f.includes('.') ? '' : ' dir'}${f.includes('Passkey') ? ' active' : ''}`}>{f.trim()}</div>
				))}
			</div>
		);
		case 'terminal': return (
			<div className="vs-term">
				<div className="vs-term-line"><span className="vs-term-p">aurora ~</span> npm run test onboarding</div>
				<div className="vs-term-out">PASS src/onboarding/Onboarding.test.tsx (12 tests)</div>
				<div className="vs-term-out ok">✓ passkey sign-in reaches checkout in one step (42ms)</div>
				<div className="vs-term-line"><span className="vs-term-p">aurora ~</span> <span className="vs-caret" /></div>
			</div>
		);
		case 'logs': return (
			<div className="vs-log">
				<div className="vs-log-row"><span className="vs-tag good">200</span>POST /session · passkey · 41ms</div>
				<div className="vs-log-row"><span className="vs-tag good">200</span>GET /checkout · 33ms</div>
				<div className="vs-log-row"><span className="vs-tag">info</span>candidate build complete · 4.1s</div>
			</div>
		);
		case 'problems': return <div className="vs-problems"><div className="vs-ok-empty"><Check size={16} />No problems. Type-check and build are clean.</div></div>;
		case 'scm': return (
			<div className="vs-log">
				<div className="vs-log-row"><span className="vs-add-n">M</span>src/onboarding/Passkey.tsx</div>
				<div className="vs-log-row"><span className="vs-add-n">A</span>src/onboarding/Onboarding.test.tsx</div>
				<div className="vs-log-row"><span className="vs-add-n">M</span>src/session/session.ts</div>
			</div>
		);
		case 'checkpoints': return (
			<div className="vs-log">
				<div className="vs-log-row"><Flag size={12} />09:41 · Passkey onboarding · <span className="vs-tag good">accepted</span></div>
				<div className="vs-log-row"><Flag size={12} />09:12 · Session contract · <span className="vs-tag good">accepted</span></div>
			</div>
		);
	}
}

// --------------------------------------------------------------------------
// Command palette — every entry drives the runtime (no dead commands).
// --------------------------------------------------------------------------
type Cmd = { id: string; label: string; hint?: string; run: () => void };

export function CommandBar() {
	const state = useWorkspace();
	const [q, setQ] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	useEffect(() => { if (state.layout.commandOpen) { setQ(''); setTimeout(() => inputRef.current?.focus(), 0); } }, [state.layout.commandOpen]);

	const cmds = useMemo<Cmd[]>(() => {
		const lensCmds: Cmd[] = (Object.keys(LENS_META) as Lens[]).map((l) => ({ id: `lens:${l}`, label: `Lens: ${LENS_META[l].label}`, hint: LENS_META[l].hint, run: () => runtime.setLens(l) }));
		return [
			{ id: 'newwork', label: 'New work — click your app to place it', hint: '⌘⇧N', run: () => runtime.armWork(true) },
			{ id: 'chat', label: state.layout.chatOpen ? 'Hide chat sidebar' : 'Show chat sidebar', run: () => runtime.openChat(!state.layout.chatOpen) },
			{ id: 'tablayout', label: 'Toggle vertical tabs (Arc-style)', run: () => {
				let v = 'side';
				try { v = localStorage.getItem('vs-tablayout') === 'side' ? 'top' : 'side'; localStorage.setItem('vs-tablayout', v); } catch { /* ignore */ }
				window.dispatchEvent(new CustomEvent('velocity:tablayout', { detail: v }));
			} },
			{ id: 'mission', label: 'Detailed brief — full mission', run: () => runtime.openMissionSheet(true) },
			{ id: 'coworkers', label: 'Open coworkers', run: () => runtime.openRight('coworkers') },
			{ id: 'share', label: 'Workers — invite people & coworkers', run: () => runtime.openRight('coworkers') },
			{ id: 'activity', label: 'Open activity feed', run: () => runtime.openRight('activity') },
			{ id: 'checkpoint', label: 'Review latest checkpoint', run: () => runtime.openRight('checkpoint') },
			{ id: 'decision', label: 'Open decision', run: () => runtime.openRight('decision') },
			{ id: 'compare', label: 'Compare Candidate vs Stable', run: () => runtime.comparePreview('stable') },
			{ id: 'split-r', label: 'Split active pane right', hint: '⌘\\', run: () => runtime.splitPane(state.layout.activePaneId, 'row') },
			{ id: 'split-d', label: 'Split active pane down', hint: '⌘⇧\\', run: () => runtime.splitPane(state.layout.activePaneId, 'col') },
			{ id: 'terminal', label: 'Toggle terminal', hint: '⌘J', run: () => runtime.openTool(state.layout.openTool ? null : 'terminal') },
			{ id: 'pause', label: state.paused ? 'Resume all coworkers' : 'Pause all coworkers', run: () => runtime.togglePause() },
			{ id: 'focus', label: 'Toggle focus mode', run: () => runtime.toggleFocus() },
			{ id: 'tools', label: 'Toggle developer tools', run: () => runtime.openTool(state.layout.openTool ? null : 'explorer') },
			{ id: 'reset', label: 'Reset workspace layout', run: () => runtime.resetLayout() },
			{ id: 'ship', label: 'Ship — deploy to a host', hint: '⌘⇧D', run: () => runtime.openShip(true) },
			...lensCmds,
		];
	}, [state.paused, state.layout.openTool, state.layout.activePaneId, state.layout.chatOpen]);

	if (!state.layout.commandOpen) return null;
	const filtered = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
	const run = (c?: Cmd) => { if (c) { runtime.openCommand(false); c.run(); } };
	return (
		<div className="vs-scrim top" onClick={() => runtime.openCommand(false)}>
			<div className="vs-cmd" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
				<input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command…"
					onKeyDown={(e) => { if (e.key === 'Enter') run(filtered[0]); if (e.key === 'Escape') runtime.openCommand(false); }} />
				<div className="vs-cmd-list">
					{filtered.length === 0 && <div className="vs-cmd-empty">No commands.</div>}
					{filtered.map((c, i) => (
						<button key={c.id} className={`vs-cmd-row${i === 0 ? ' sel' : ''}`} onClick={() => run(c)}><span>{c.label}</span>{c.hint && <kbd>{c.hint}</kbd>}</button>
					))}
				</div>
			</div>
		</div>
	);
}
