import { useEffect, useMemo, useRef, useState } from 'react';
import {
	Play, Check, X, ShieldCheck, Sparkles, ArrowRight, Server, Database, Clock, Gauge, Circle,
	MessageSquare, CheckCheck, Code2, CheckCircle2, ChevronDown, ChevronRight, SplitSquareHorizontal, SplitSquareVertical,
	Globe, FlaskConical, GitCompare, Wand2, Trash2, MoreHorizontal, Folder, FolderOpen, FileCode,
} from 'lucide-react';
import { EditorMode } from '../modes/EditorMode';
import { BrowserMode } from '../modes/BrowserMode';
import { useServices } from '../services/container';
import { usePanePath } from '../services/editorService';
import { useWorkspace, runtime } from './useWorkspace';
import { LENS_META, COMPARE_LABEL, WORK_INTENTS, WORK_MODELS } from './model';
import { leafIds } from './panes';
import { ContextMenu, useContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';
import type { Collaborator, Comment, CompareSource, Coworker, Lens, PaneLeaf, PaneNode, PaneSplit, WorkIntent } from './model';

const ARTIFACT_ACTIONS = ['Improve', 'Fix', 'Rebuild', 'Investigate', 'Explain', 'Assign', 'Compare', 'Test'] as const;

/** A selectable region on the live preview — the basis of artifact-level direction. */
function Region({ id, label, className, style, children }: { id: string; label: string; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
	const [menu, setMenu] = useState(false);
	return (
		<div className={`vs-region${menu ? ' selecting' : ''} ${className ?? ''}`} style={style} data-artifact={id}
			onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
			role="button" tabIndex={0} aria-label={`Direct work on ${label}`}>
			{children}
			<span className="vs-region-tag">{label}</span>
			{menu && (
				<div className="vs-assign" onClick={(e) => e.stopPropagation()}>
					<div className="vs-assign-head">Direct work on <b>{label}</b></div>
					<div className="vs-assign-actions">
						{ARTIFACT_ACTIONS.map((a) => (
							<button key={a} onClick={() => { runtime.assignArtifact(label, a); setMenu(false); }}>{a}</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function PreviewLens({ candidate }: { candidate: boolean }) {
	return (
		<div className={`vs-app${candidate ? ' candidate' : ''}`} onClick={() => undefined}>
			<header className="vs-app-top">
				<div className="vs-app-brand"><span className="vs-app-mark" />Aurora</div>
				<nav className="vs-app-nav"><span>Shop</span><span>Roasts</span><span>Subscribe</span></nav>
				<button className="vs-app-cta">Sign in</button>
			</header>
			<Region id="hero" label="Hero" className="vs-app-hero">
				<div className="vs-app-hero-copy">
					<p className="vs-eyebrow">Freshly roasted, delivered</p>
					<h1>Coffee that keeps up with you</h1>
					<p className="vs-app-sub">Pick a plan, skip a week anytime, cancel whenever.</p>
					<div className="vs-app-row"><button className="vs-app-primary">Start a subscription</button><button className="vs-app-ghost">See roasts</button></div>
				</div>
				<div className="vs-app-hero-art" />
			</Region>
			<div className="vs-app-body">
				<Region id="onboarding" label="Onboarding" className="vs-app-card vs-app-onboarding">
					<h3>Welcome back</h3>
					<p>Choose how you want to sign in.</p>
					<Region id="passkey" label="Passkey" className="vs-app-passkey"><ShieldCheck size={15} />Continue with a passkey</Region>
					<div className="vs-app-or"><span>or</span></div>
					<label className="vs-app-field">Email<input defaultValue="byron@example.com" readOnly /></label>
					<button className="vs-app-email">Continue with email</button>
				</Region>
				<div className="vs-app-side">
					<div className="vs-app-plan"><b>Weekly</b><span>$18 / wk</span></div>
					<div className="vs-app-plan"><b>Biweekly</b><span>$16 / wk</span></div>
					<div className="vs-app-plan"><b>Monthly</b><span>$14 / wk</span></div>
				</div>
			</div>
		</div>
	);
}

const SYS_NODES = [
	{ id: 'client', label: 'Client', kind: 'edge', health: 'healthy', meta: 'React SPA', icon: Sparkles },
	{ id: 'checkout', label: '/checkout', kind: 'route', health: 'healthy', meta: '33ms · 200', icon: ArrowRight },
	{ id: 'session', label: '/session', kind: 'route', health: 'building', meta: '41ms · 200', icon: Server },
	{ id: 'sessions', label: 'sessions', kind: 'store', health: 'healthy', meta: '+1 column', icon: Database },
] as const;

const TRACE = [
	{ step: 'POST /session', detail: 'passkey credential attached', ms: 41, ok: true },
	{ step: 'verify credential', detail: 'WebAuthn assertion valid', ms: 12, ok: true },
	{ step: 'GET /checkout', detail: 'session resolved · cart hydrated', ms: 33, ok: true },
	{ step: 'render onboarding', detail: 'passkey-first, email fallback', ms: 18, ok: true },
];

function SystemLens() {
	return (
		<div className="vs-system">
			<div className="vs-sys-head"><h2>System</h2><span className="vs-tag good">healthy</span><span className="vs-sys-sub">Services, endpoints, request flow</span></div>
			<div className="vs-sys-topo">
				{SYS_NODES.map((n, i) => (
					<div key={n.id} className="vs-sys-step">
						<Region id={`sys-${n.id}`} label={n.label} className={`vs-sys-card ${n.health}`}>
							<div className="vs-sys-card-top"><n.icon size={14} /><b>{n.label}</b></div>
							<div className="vs-sys-card-meta"><span className={`vs-hdot ${n.health}`} />{n.meta}</div>
						</Region>
						{i < SYS_NODES.length - 1 && <ArrowRight size={15} className="vs-sys-arrow" />}
					</div>
				))}
			</div>
			<div className="vs-sys-grid">
				<div className="vs-panel-card">
					<div className="vs-panel-head"><span>Request trace</span><span className="vs-tag good">200 · 104ms</span></div>
					<div className="vs-trace">
						{TRACE.map((t, i) => (
							<div key={i} className="vs-trace-row">
								<span className="vs-trace-node"><Check size={11} /></span>
								<div className="vs-trace-body"><code>{t.step}</code><span>{t.detail}</span></div>
								<span className="vs-trace-ms">{t.ms}ms</span>
							</div>
						))}
					</div>
					<button className="vs-run"><Play size={14} />Run checkout scenario</button>
				</div>
				<div className="vs-panel-card">
					<div className="vs-panel-head"><span>Contract change</span><span className="vs-tag">Rowan</span></div>
					<div className="vs-contract">
						<div className="vs-contract-row add"><span>+</span><code>Session.credential: PasskeyRef</code></div>
						<div className="vs-contract-row"><span>&nbsp;</span><code>Session.userId: string</code></div>
						<div className="vs-contract-row"><span>&nbsp;</span><code>Session.expiresAt: Date</code></div>
					</div>
					<div className="vs-sys-metrics">
						<div className="vs-metric"><Gauge size={14} /><b>42ms</b><span>p95 latency</span></div>
						<div className="vs-metric"><Check size={14} /><b>12/12</b><span>contract checks</span></div>
						<div className="vs-metric"><Clock size={14} /><b>0</b><span>rows lost</span></div>
					</div>
				</div>
			</div>
		</div>
	);
}

const DATA_TABLES = [
	{ name: 'sessions', rows: '2,481', delta: '+1 col', active: true },
	{ name: 'users', rows: '9,204', delta: '', active: false },
	{ name: 'orders', rows: '14,067', delta: '', active: false },
];
const DATA_ROWS = [
	['sess_1', 'ada@aurora.dev', 'passkey', '2026-07-14 09:41'],
	['sess_2', 'grace@aurora.dev', 'passkey', '2026-07-14 09:12'],
	['sess_3', 'linus@aurora.dev', 'email', '2026-07-13 22:04'],
	['sess_4', 'edsger@aurora.dev', 'passkey', '2026-07-13 18:55'],
];

function DataLens() {
	const cols = ['id', 'email', 'credential', 'created'];
	return (
		<div className="vs-data">
			<aside className="vs-data-schema">
				<div className="vs-data-schema-head"><Database size={13} />Schema</div>
				{DATA_TABLES.map((t) => (
					<div key={t.name} className={`vs-data-table${t.active ? ' active' : ''}`}>
						<span>{t.name}</span>
						{t.delta ? <em>{t.delta}</em> : <span className="vs-data-rows">{t.rows}</span>}
					</div>
				))}
			</aside>
			<div className="vs-data-main">
				<div className="vs-data-q"><code>SELECT * FROM sessions ORDER BY created DESC</code><button className="vs-run sm"><Play size={13} />Run</button></div>
				<div className="vs-data-scroll">
					<table className="vs-data-grid">
						<thead><tr>{cols.map((c) => <th key={c} className={c === 'credential' ? 'new' : ''}>{c}{c === 'credential' && <span className="vs-th-tag">new</span>}</th>)}</tr></thead>
						<tbody>{DATA_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 2 ? (c === 'passkey' ? 'new' : 'muted') : ''}>{c}</td>)}</tr>)}</tbody>
					</table>
				</div>
				<div className="vs-data-foot">
					<div className="vs-data-migration"><ShieldCheck size={14} /><b>Migration 003_passkey</b><span>applied to Candidate · reversible · 0 rows lost</span></div>
					<span className="vs-tag good">4 rows · 3 passkey</span>
				</div>
			</div>
		</div>
	);
}

const SCENARIO_STEPS = [
	{ label: 'Open checkout as a returning visitor', ms: 120 },
	{ label: 'Continue with a passkey', ms: 340 },
	{ label: 'Reach the payment step in one action', ms: 210 },
	{ label: 'Confirm email fallback still works', ms: 180 },
];

function VerifyLens() {
	const state = useWorkspace();
	const criteria = state.mission?.criteria ?? [];
	const done = criteria.filter((c) => c.state === 'verified').length;
	const pct = criteria.length ? Math.round((done / criteria.length) * 100) : 0;
	return (
		<div className="vs-verify">
			<div className="vs-verify-head">
				<div className="vs-ring" style={{ ['--pct' as string]: `${pct}` }}><span>{done}/{criteria.length}</span></div>
				<div><h2>Verification</h2><p>Every acceptance criterion, checked against the Candidate.</p></div>
			</div>
			<div className="vs-verify-grid">
				<div className="vs-verify-list">
					{criteria.map((c) => (
						<div key={c.id} className={`vs-verify-row ${c.state}`}>
							{c.state === 'verified' ? <Check size={15} /> : c.state === 'failed' ? <X size={15} /> : c.state === 'checking' ? <span className="vs-spin" /> : <Circle size={13} />}
							<div className="vs-verify-body"><span>{c.label}</span>
								<span className="vs-verify-ev">{c.state === 'verified' ? 'test · screenshot · trace' : c.state === 'checking' ? 'running…' : c.state === 'failed' ? 'needs a fix' : 'queued'}</span>
							</div>
							<button className="vs-run sm"><Play size={12} />Run</button>
						</div>
					))}
				</div>
				<div className="vs-panel-card">
					<div className="vs-panel-head"><span>Checkout scenario</span><span className="vs-tag good">passed · 0.9s</span></div>
					<div className="vs-scenario-steps">
						{SCENARIO_STEPS.map((s, i) => (
							<div key={i} className="vs-scenario-step">
								<span className="vs-scenario-node"><Check size={11} /></span>
								<span>{s.label}</span><span className="vs-trace-ms">{s.ms}ms</span>
							</div>
						))}
					</div>
					<button className="vs-run"><Play size={14} />Re-run scenario</button>
				</div>
			</div>
		</div>
	);
}

// --- IDE: a file tree beside the live editor -----------------------------
interface FileNode { name: string; path: string; dir: boolean; children: FileNode[]; }

function buildFileTree(files: string[], dirs: string[]): FileNode[] {
	const root: FileNode = { name: '', path: '', dir: true, children: [] };
	const ensure = (path: string): FileNode => {
		let node = root, acc = '';
		for (const part of path.split('/')) {
			acc = acc ? `${acc}/${part}` : part;
			let child = node.children.find((e) => e.name === part && e.dir);
			if (!child) { child = { name: part, path: acc, dir: true, children: [] }; node.children.push(child); }
			node = child;
		}
		return node;
	};
	for (const dir of dirs) if (dir) ensure(dir);
	for (const file of files) {
		const slash = file.lastIndexOf('/');
		const parent = slash === -1 ? root : ensure(file.slice(0, slash));
		parent.children.push({ name: slash === -1 ? file : file.slice(slash + 1), path: file, dir: false, children: [] });
	}
	const sort = (node: FileNode) => { node.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1)); node.children.forEach(sort); };
	sort(root);
	return root.children;
}

function FileRow({ node, depth, openPath, collapsed, onToggle, onOpen }: { node: FileNode; depth: number; openPath: string | undefined; collapsed: Set<string>; onToggle: (p: string) => void; onOpen: (p: string) => void }) {
	const pad = { paddingLeft: 8 + depth * 12 };
	if (node.dir) {
		const c = collapsed.has(node.path);
		return (
			<>
				<button className="vs-ide-row dir" style={pad} onClick={() => onToggle(node.path)}>
					<span className="vs-ide-caret">{c ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</span>
					{c ? <Folder size={13} /> : <FolderOpen size={13} />}<span className="vs-ide-name">{node.name}</span>
				</button>
				{!c && node.children.map((ch) => <FileRow key={ch.path} node={ch} depth={depth + 1} openPath={openPath} collapsed={collapsed} onToggle={onToggle} onOpen={onOpen} />)}
			</>
		);
	}
	return (
		<button className={`vs-ide-row file${openPath === node.path ? ' active' : ''}`} style={pad} onClick={() => onOpen(node.path)}>
			<span className="vs-ide-caret" aria-hidden /><FileCode size={13} /><span className="vs-ide-name">{node.name}</span>
		</button>
	);
}

/** File tree bound to the editor pane — clicking a file opens it live. */
function FileTree({ paneId }: { paneId: string }) {
	const { fs, editor } = useServices();
	const [files, setFiles] = useState<string[]>([]);
	const [dirs, setDirs] = useState<string[]>([]);
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
	const openPath = usePanePath(paneId);
	useEffect(() => {
		let alive = true;
		const load = () => void Promise.all([fs.list(), fs.directories()]).then(([f, d]) => { if (alive) { setFiles(f); setDirs(d); } });
		load();
		const off = fs.onChange(load);
		return () => { alive = false; off(); };
	}, [fs]);
	const tree = useMemo(() => buildFileTree(files, dirs), [files, dirs]);
	const toggle = (p: string) => setCollapsed((cur) => { const n = new Set(cur); if (n.has(p)) n.delete(p); else n.add(p); return n; });
	const open = (p: string) => void editor.bindPane(paneId, p);
	return (
		<div className="vs-ide-files">
			<div className="vs-ide-fhead">Files</div>
			<div className="vs-ide-ftree">
				{tree.map((n) => <FileRow key={n.path} node={n} depth={0} openPath={openPath} collapsed={collapsed} onToggle={toggle} onOpen={open} />)}
			</div>
		</div>
	);
}

/** The Code lens — file tree on the left, live CodeMirror editor on the right. */
function IDELens({ paneKey }: { paneKey: string }) {
	const paneId = `velocity:editor:${paneKey}`;
	return (
		<div className="vs-ide">
			<FileTree paneId={paneId} />
			<div className="vs-ide-editor"><EditorMode paneId={paneId} /></div>
		</div>
	);
}

/** The real, working in-app browser (address bar, history, live preview). */
function BrowserLens({ paneId }: { paneId: string }) {
	const { browser } = useServices();
	// The first time this pane mounts, start it on the live app preview.
	useState(() => { browser.requestPreview('http://localhost:3000'); return null; });
	return <div className="vs-browserhost"><BrowserMode paneId={paneId} /></div>;
}

const TEST_SUITES = [
	{ name: 'onboarding/Onboarding.test.tsx', total: 12, passed: 12, ms: 420, failing: '' },
	{ name: 'auth/passkey.test.ts', total: 8, passed: 8, ms: 180, failing: '' },
	{ name: 'checkout/cancel.test.ts', total: 3, passed: 3, ms: 96, failing: '' },
	{ name: 'session/contract.test.ts', total: 5, passed: 5, ms: 61, failing: '' },
];

function TestsLens() {
	const passed = TEST_SUITES.reduce((a, s) => a + s.passed, 0);
	const total = TEST_SUITES.reduce((a, s) => a + s.total, 0);
	return (
		<div className="vs-tests">
			<div className="vs-tests-head">
				<div><h2>Tests</h2><p>Unit + integration suites for the candidate.</p></div>
				<span className="vs-tag good">{passed}/{total} passing</span>
				<button className="vs-run"><Play size={14} />Run all</button>
			</div>
			<div className="vs-tests-list">
				{TEST_SUITES.map((s) => {
					const ok = s.passed === s.total;
					return (
						<div key={s.name} className={`vs-test-suite${ok ? '' : ' fail'}`}>
							<span className="vs-test-icon">{ok ? <Check size={13} /> : <X size={13} />}</span>
							<div className="vs-test-body"><code>{s.name}</code><span>{s.passed}/{s.total} passed{s.failing && ` · ✗ ${s.failing}`}</span></div>
							<span className="vs-trace-ms">{s.ms}ms</span>
							<button className="vs-run sm"><Play size={11} /></button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function renderLens(lens: Lens, paneKey: string) {
	switch (lens) {
		case 'browser': return <BrowserLens paneId={`vel:${paneKey}`} />;
		case 'code': return <IDELens paneKey={paneKey} />;
		case 'system': return <SystemLens />;
		case 'data': return <DataLens />;
		case 'tests': return <TestsLens />;
		case 'verify': return <VerifyLens />;
	}
}

const CMP_SIDE_LABEL: Record<CompareSource, string> = {
	none: 'Reference', stable: 'Stable', live: 'Live · production', preview: 'Preview deploy', branch: 'Branch · main',
};

function PreviewCompare({ source }: { source: CompareSource }) {
	return (
		<div className="vs-pane-compare">
			<div className="vs-cmp-side">
				<div className="vs-cmp-tag">{CMP_SIDE_LABEL[source]} <span className="vs-tag">reference</span></div>
				<div className="vs-cmp-frame"><PreviewLens candidate={false} /></div>
			</div>
			<div className="vs-cmp-div" />
			<div className="vs-cmp-side">
				<div className="vs-cmp-tag">Candidate <span className="vs-tag good">your changes</span></div>
				<div className="vs-cmp-frame"><PreviewLens candidate /></div>
			</div>
		</div>
	);
}

/** Calm, Figma-style presence flag for an AI coworker pinned to its artifact. */
function PresenceFlags({ lens, coworkers }: { lens: Lens; coworkers: Coworker[] }) {
	const here = coworkers.filter((c) => c.marker && c.marker.lens === lens && c.state !== 'archived' && c.state !== 'dismissed');
	return (
		<>
			{here.map((c) => {
				const working = c.state === 'active' || c.state === 'verifying' || c.state === 'planning';
				return (
					<button key={c.id} className={`vs-flag${c.following ? ' following' : ''}`} style={{ left: `${c.marker!.x}%`, top: `${c.marker!.y}%`, ['--id' as string]: c.color }}
						onClick={() => runtime.follow(c.following ? null : c.id)}
						title={`${c.name} · ${c.role} — ${c.action}`} aria-label={`${c.name}, ${c.role}, ${c.action}`}>
						<span className="vs-flag-avatar" style={{ background: c.color }}>
							{c.initials}
							{working && <span className="vs-flag-work" />}
						</span>
						<span className="vs-flag-body">
							<span className="vs-flag-name">{c.name}</span>
							<span className="vs-flag-act">{c.marker!.label}</span>
						</span>
					</button>
				);
			})}
		</>
	);
}

/** Live cursors for the human collaborators currently on this lens. */
function CursorLayer({ lens, collaborators }: { lens: Lens; collaborators: Collaborator[] }) {
	const here = collaborators.filter((c) => c.id !== 'you' && c.status === 'active' && c.cursor && c.cursor.lens === lens);
	return (
		<>
			{here.map((c) => (
				<div key={c.id} className="vs-cursor" style={{ left: `${c.cursor!.x}%`, top: `${c.cursor!.y}%`, ['--id' as string]: c.color }}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 1L6.5 15L8.7 9.2L14.5 7L1 1Z" fill={c.color} stroke="var(--panel)" strokeWidth="1" /></svg>
					<span className="vs-cursor-name" style={{ background: c.color }}>{c.name}</span>
				</div>
			))}
		</>
	);
}

/** The one preset menu — assign (who) · model · agents · resolve · delete.
 *  Shared by the pin right-click and the open thread's ⋯, so both behave the
 *  same. Everything is one tap; there is no form. */
function commentMenu(comment: Comment, coworkers: Coworker[]): MenuItem[] {
	const agents = comment.agents ?? 1;
	return [
		{ label: 'Assign', header: true },
		{ label: 'Auto · best fit', icon: <Wand2 size={14} />, checked: !comment.assignedCoworkerId,
			onClick: () => { const id = runtime.pickCoworker(comment.text, comment.intent); if (id) runtime.assignComment(comment.id, id); } },
		...coworkers.map((c): MenuItem => ({ label: c.name, icon: <span className="vs-avatar xs" style={{ background: c.color }}>{c.initials}</span>,
			checked: comment.assignedCoworkerId === c.id, onClick: () => runtime.assignComment(comment.id, c.id) })),
		{ separator: true },
		{ label: 'Model', header: true },
		...WORK_MODELS.map((m): MenuItem => ({ label: m.label, checked: comment.model === m.id, onClick: () => runtime.setCommentModel(comment.id, m.id) })),
		{ separator: true },
		{ label: 'Coworkers on it', header: true },
		...[1, 2, 3].map((n): MenuItem => ({ label: `${n} coworker${n > 1 ? 's' : ''}`, checked: agents === n, onClick: () => runtime.setCommentAgents(comment.id, n) })),
		{ separator: true },
		{ label: 'Resolve', icon: <CheckCheck size={14} />, onClick: () => runtime.resolveComment(comment.id) },
		{ label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => runtime.deleteComment(comment.id) },
	];
}

function CommentThread({ comment }: { comment: Comment }) {
	const state = useWorkspace();
	const coworkers = state.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
	const assigned = coworkers.find((c) => c.id === comment.assignedCoworkerId);
	const ctx = useContextMenu();
	const intent = comment.intent ? WORK_INTENTS[comment.intent] : null;
	const modelShort = (WORK_MODELS.find((m) => m.id === comment.model)?.label ?? 'Auto').split(' · ')[0];
	const agents = comment.agents ?? 1;
	const tx = comment.x > 66 ? 'calc(-100% - 12px)' : '12px';
	const ty = comment.y > 52 ? 'calc(-100% + 8px)' : '-8px';
	return (
		<div className="vs-thread" style={{ left: `${comment.x}%`, top: `${comment.y}%`, transform: `translate(${tx}, ${ty})`, ['--id' as string]: comment.authorColor }} onClick={(e) => e.stopPropagation()}>
			<div className="vs-thread-head">
				<span className="vs-avatar sm" style={{ background: comment.authorColor }}>{comment.authorName.slice(0, 2).toUpperCase()}</span>
				<b>{comment.authorName}</b><span className="vs-thread-ts">{comment.createdLabel}</span>
				<button className="vs-icon xs" onClick={(e) => ctx.onContextMenu(e)} aria-label="Options"><MoreHorizontal size={15} /></button>
				<button className="vs-icon xs" onClick={() => runtime.openComment(null)} aria-label="Close"><X size={14} /></button>
			</div>
			{intent && <span className={`vs-work-tag ${comment.intent}`}>{intent.label}</span>}
			<div className="vs-thread-text">{comment.text}</div>
			{assigned ? (
				<button className="vs-thread-assignee" style={{ ['--id' as string]: assigned.color }} onClick={(e) => ctx.onContextMenu(e)}>
					<span className="vs-avatar xs" style={{ background: assigned.color }}>{assigned.initials}</span>
					<span className="vs-ta-name">{assigned.name}</span>
					<span className="vs-ta-meta">{modelShort}{agents > 1 ? ` · ${agents} agents` : ''}</span>
					<ChevronDown size={13} />
				</button>
			) : (
				<button className="vs-thread-assignee ghost" onClick={() => { const id = runtime.pickCoworker(comment.text, comment.intent); if (id) runtime.assignComment(comment.id, id); }}>
					<Wand2 size={13} />Auto-assign a coworker
				</button>
			)}
			{comment.replies.map((r, i) => (
				<div key={i} className={`vs-reply${r.fromCoworker ? ' bot' : ''}`}>
					<span className="vs-avatar sm" style={{ background: r.authorColor }}>{r.authorName.slice(0, 2).toUpperCase()}</span>
					<div><b>{r.authorName}</b> <span className="vs-thread-ts">{r.tsLabel}</span><div>{r.text}</div></div>
				</div>
			))}
			<button className="vs-thread-resolve" onClick={() => runtime.resolveComment(comment.id)}><CheckCheck size={13} />Resolve</button>
			{ctx.at && <ContextMenu x={ctx.at.x} y={ctx.at.y} onClose={ctx.close} items={commentMenu(comment, coworkers)} />}
		</div>
	);
}

/** The place-work composer — describe it, pick an intent, and it auto-assigns.
 *  Model / who / how-many are presets behind one popover, so the box never
 *  grows and nothing on the page shifts. */
function WorkComposer({ lens, x, y, onClose }: { lens: Lens; x: number; y: number; onClose: (submitted?: boolean) => void }) {
	const state = useWorkspace();
	const coworkers = state.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
	const [text, setText] = useState('');
	const [intent, setIntent] = useState<WorkIntent | null>(null);
	const [assignee, setAssignee] = useState<string>('auto');
	const [model, setModel] = useState('auto');
	const [agents, setAgents] = useState(1);
	const [menu, setMenu] = useState(false);
	const taRef = useRef<HTMLTextAreaElement>(null);
	useEffect(() => { taRef.current?.focus(); }, []);

	const autoId = runtime.pickCoworker(text, intent);
	const resolved = coworkers.find((c) => c.id === (assignee === 'auto' ? autoId : assignee));

	const submit = () => {
		if (!text.trim()) return;
		runtime.addComment(lens, x, y, text, { intent, assignee: assignee === 'auto' ? 'auto' : assignee, model, agents });
		onClose(true);
	};
	const tx = x > 66 ? 'calc(-100% - 12px)' : '12px';
	const ty = y > 60 ? 'calc(-100% + 8px)' : '-8px';
	return (
		<div className="vs-composer" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(${tx}, ${ty})` }} onClick={(e) => e.stopPropagation()}>
			<textarea ref={taRef} value={text} rows={2} placeholder="Describe the work — e.g. make the hero responsive"
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') onClose(); }} />
			<div className="vs-wc-intents">
				{(Object.keys(WORK_INTENTS) as WorkIntent[]).map((k) => (
					<button key={k} className={`vs-wc-chip${intent === k ? ' on' : ''}`} onClick={() => setIntent(intent === k ? null : k)}>{WORK_INTENTS[k].label}</button>
				))}
			</div>
			<div className="vs-wc-foot">
				<button className="vs-wc-assignee" onClick={() => setMenu((v) => !v)} title="Who, which model, how many — auto by default">
					{resolved
						? <><span className="vs-avatar xs" style={{ background: resolved.color }}>{resolved.initials}</span>{assignee === 'auto' ? 'Auto · ' : ''}{resolved.name}</>
						: <><Wand2 size={13} />Auto-assign</>}
					<ChevronDown size={12} />
				</button>
				<div className="vs-spacer" />
				<button className="vs-app-primary sm" disabled={!text.trim()} onClick={submit}>Start</button>
			</div>
			<button className="vs-wc-brief" onClick={() => { onClose(); runtime.openMissionSheet(true); }}>Detailed brief…</button>
			{menu && (
				<>
					<div className="vs-wc-menuscrim" onClick={() => setMenu(false)} />
					<div className="vs-wc-menu" onClick={(e) => e.stopPropagation()}>
						<div className="vs-wc-mhead">Assign</div>
						<button className={`vs-wc-mrow${assignee === 'auto' ? ' on' : ''}`} onClick={() => setAssignee('auto')}><Wand2 size={13} /><span className="vs-wc-mname">Auto · best fit</span>{assignee === 'auto' && <span className="vs-wc-check">✓</span>}</button>
						{coworkers.map((c) => (
							<button key={c.id} className={`vs-wc-mrow${assignee === c.id ? ' on' : ''}`} onClick={() => setAssignee(c.id)}>
								<span className="vs-avatar xs" style={{ background: c.color }}>{c.initials}</span><span className="vs-wc-mname">{c.name}</span><span className="vs-wc-mrole">{c.role}</span>{assignee === c.id && <span className="vs-wc-check">✓</span>}
							</button>
						))}
						<div className="vs-wc-mhead">Model</div>
						{WORK_MODELS.map((m) => (
							<button key={m.id} className={`vs-wc-mrow${model === m.id ? ' on' : ''}`} onClick={() => setModel(m.id)}><span className="vs-wc-mname">{m.label}</span>{model === m.id && <span className="vs-wc-check">✓</span>}</button>
						))}
						<div className="vs-wc-mhead">Coworkers on it</div>
						<div className="vs-wc-agents">{[1, 2, 3].map((n) => (<button key={n} className={agents === n ? 'on' : ''} onClick={() => setAgents(n)}>{n}</button>))}</div>
					</div>
				</>
			)}
		</div>
	);
}

function Pin({ comment }: { comment: Comment }) {
	const state = useWorkspace();
	const coworkers = state.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
	const assigned = coworkers.find((c) => c.id === comment.assignedCoworkerId);
	const ctx = useContextMenu();
	const active = state.layout.activeCommentId === comment.id;
	return (
		<>
			<button className={`vs-pin${active ? ' active' : ''}${comment.assignedCoworkerId ? ' assigned' : ''}`}
				style={{ left: `${comment.x}%`, top: `${comment.y}%`, ['--id' as string]: assigned?.color ?? comment.authorColor }}
				onClick={(e) => { e.stopPropagation(); runtime.openComment(active ? null : comment.id); }}
				onContextMenu={ctx.onContextMenu}
				title={`${assigned ? assigned.name + ' · ' : ''}${comment.text}`}>
				{assigned ? <span className="vs-pin-face">{assigned.initials}</span> : <MessageSquare size={13} />}
			</button>
			{ctx.at && <ContextMenu x={ctx.at.x} y={ctx.at.y} onClose={ctx.close} items={commentMenu(comment, coworkers)} />}
		</>
	);
}

/** Work pins + the place-work composer for the current lens. */
function CommentLayer({ lens }: { lens: Lens }) {
	const state = useWorkspace();
	const { commentMode, activeCommentId } = state.layout;
	const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
	const comments = state.comments.filter((c) => c.lens === lens && !c.resolved);
	const active = comments.find((c) => c.id === activeCommentId);

	const onPlace = (e: React.MouseEvent<HTMLDivElement>) => {
		const r = e.currentTarget.getBoundingClientRect();
		setDraft({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
	};
	// On submit the work is placed + a thread opens; only a cancel exits placement.
	const closeDraft = (submitted?: boolean) => { setDraft(null); if (!submitted) runtime.armWork(false); };

	return (
		<>
			{commentMode && !draft && <div className="vs-comment-catcher" onClick={onPlace} />}
			{comments.map((c) => <Pin key={c.id} comment={c} />)}
			{active && !draft && <CommentThread comment={active} />}
			{draft && <WorkComposer lens={lens} x={draft.x} y={draft.y} onClose={closeDraft} />}
		</>
	);
}

/** The full collaboration overlay for the active stage lens. */
function StageOverlay({ lens }: { lens: Lens }) {
	const state = useWorkspace();
	return (
		<>
			<PresenceFlags lens={lens} coworkers={state.coworkers} />
			<CursorLayer lens={lens} collaborators={state.collaborators} />
			<CommentLayer lens={lens} />
		</>
	);
}

// --------------------------------------------------------------------------
// Split-pane workspace — each pane picks its own view and can split / close.
// --------------------------------------------------------------------------
const LENS_ORDER: Lens[] = ['browser', 'code', 'system', 'data', 'tests', 'verify'];
const LENS_ICON: Record<Lens, typeof Globe> = {
	browser: Globe, code: Code2, system: Server, data: Database, tests: FlaskConical, verify: CheckCircle2,
};
const COMPARE_ORDER: CompareSource[] = ['none', 'stable', 'live', 'preview', 'branch'];

/** The Preview pane's compare-source picker (vs Stable / Live / Preview / Branch). */
function CompareMenu({ leaf }: { leaf: PaneLeaf }) {
	const [menu, setMenu] = useState(false);
	const src = leaf.compareSource ?? 'none';
	return (
		<div className="vs-pane-view">
			<button className={`vs-pane-cmpbtn${src !== 'none' ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} title="Compare against…">
				<GitCompare size={13} /><span className="vs-pane-viewname">{COMPARE_LABEL[src]}</span><ChevronDown size={12} className="vs-pane-chev" />
			</button>
			{menu && (
				<>
					<div className="vs-pane-scrim" onClick={() => setMenu(false)} />
					<div className="vs-pane-menu" onClick={(e) => e.stopPropagation()}>
						{COMPARE_ORDER.map((c) => (
							<button key={c} className={`vs-pane-menuitem${c === src ? ' on' : ''}`} onClick={() => { runtime.setPaneCompare(leaf.id, c); setMenu(false); }}>
								<GitCompare size={15} /><span>{COMPARE_LABEL[c]}</span>{c === 'none' && <em>no compare</em>}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

/** Compact, adaptive per-pane toolbar (Framer-style) — view switcher + splits. */
function PaneToolbar({ leaf, single }: { leaf: PaneLeaf; single: boolean }) {
	const [menu, setMenu] = useState(false);
	const ctx = useContextMenu();
	const Icon = LENS_ICON[leaf.view];
	return (
		<div className="vs-pane-bar" onContextMenu={ctx.onContextMenu}>
			{ctx.at && (
				<ContextMenu x={ctx.at.x} y={ctx.at.y} onClose={ctx.close} items={[
					{ label: 'Split right', icon: <SplitSquareHorizontal size={14} />, onClick: () => runtime.splitPane(leaf.id, 'row') },
					{ label: 'Split down', icon: <SplitSquareVertical size={14} />, onClick: () => runtime.splitPane(leaf.id, 'col') },
					...(leaf.view === 'browser' ? [{ label: 'Compare with Stable', icon: <GitCompare size={14} />, onClick: () => runtime.setPaneCompare(leaf.id, leaf.compareSource === 'stable' ? 'none' : 'stable') }] : []),
					{ separator: true },
					{ label: 'Close pane', icon: <X size={14} />, danger: true, disabled: single, onClick: () => runtime.closePane(leaf.id) },
				]} />
			)}
			<div className="vs-pane-left">
				<div className="vs-pane-view">
					<button className="vs-pane-viewbtn" onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} title="Switch view">
						<Icon size={14} /><span className="vs-pane-viewname">{LENS_META[leaf.view].label}</span><ChevronDown size={12} className="vs-pane-chev" />
					</button>
					{menu && (
						<>
							<div className="vs-pane-scrim" onClick={() => setMenu(false)} />
							<div className="vs-pane-menu" onClick={(e) => e.stopPropagation()}>
								{LENS_ORDER.map((v) => {
									const I = LENS_ICON[v];
									return (
										<button key={v} className={`vs-pane-menuitem${v === leaf.view ? ' on' : ''}`} onClick={() => { runtime.setPaneView(leaf.id, v); setMenu(false); }}>
											<I size={15} /><span>{LENS_META[v].label}</span><em>{LENS_META[v].hint}</em>
										</button>
									);
								})}
							</div>
						</>
					)}
				</div>
				{leaf.view === 'browser' && <CompareMenu leaf={leaf} />}
			</div>
			<div className="vs-pane-mid" />
			<div className="vs-pane-tools">
				<button className="vs-pane-tool" title="Split right" onClick={(e) => { e.stopPropagation(); runtime.splitPane(leaf.id, 'row'); }}><SplitSquareHorizontal size={14} /></button>
				<button className="vs-pane-tool" title="Split down" onClick={(e) => { e.stopPropagation(); runtime.splitPane(leaf.id, 'col'); }}><SplitSquareVertical size={14} /></button>
				{!single && <button className="vs-pane-tool" title="Close pane" onClick={(e) => { e.stopPropagation(); runtime.closePane(leaf.id); }}><X size={14} /></button>}
			</div>
		</div>
	);
}

function Pane({ leaf, single }: { leaf: PaneLeaf; single: boolean }) {
	const state = useWorkspace();
	const active = state.layout.activePaneId === leaf.id;
	const comparing = leaf.view === 'browser' && !!leaf.compareSource && leaf.compareSource !== 'none';
	return (
		<section className={`vs-pane${active ? ' active' : ''}${state.layout.commentMode ? ' commenting' : ''}`} onMouseDown={() => runtime.focusPane(leaf.id)}>
			<PaneToolbar leaf={leaf} single={single} />
			<div className="vs-pane-body">
				{comparing ? <PreviewCompare source={leaf.compareSource!} /> : renderLens(leaf.view, leaf.id)}
				{!comparing && <StageOverlay lens={leaf.view} />}
			</div>
		</section>
	);
}

const SNAP_POINTS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75];

function SplitView({ split }: { split: PaneSplit }) {
	const ref = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);
	const [snapped, setSnapped] = useState(false);
	useEffect(() => {
		const move = (e: MouseEvent) => {
			if (!dragging.current || !ref.current) return;
			const r = ref.current.getBoundingClientRect();
			let ratio = split.dir === 'row' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
			// Snap to quarters / thirds / center when close.
			const near = SNAP_POINTS.find((s) => Math.abs(s - ratio) < 0.022);
			if (near !== undefined) { ratio = near; setSnapped(true); } else setSnapped(false);
			runtime.setPaneRatio(split.id, ratio);
		};
		const up = () => { dragging.current = false; setSnapped(false); document.body.style.userSelect = ''; document.body.style.cursor = ''; };
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', up);
		return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
	}, [split.id, split.dir]);
	const startDrag = () => { dragging.current = true; document.body.style.userSelect = 'none'; document.body.style.cursor = split.dir === 'row' ? 'col-resize' : 'row-resize'; };
	return (
		<div ref={ref} className={`vs-split ${split.dir}`}>
			<div className="vs-split-slot" style={{ flex: `${split.ratio} 1 0` }}><PaneNodeView node={split.a} single={false} /></div>
			<div className={`vs-split-divider ${split.dir}${snapped ? ' snapped' : ''}`} onMouseDown={startDrag} onDoubleClick={() => runtime.setPaneRatio(split.id, 0.5)} title="Drag to resize · double-click to center" />
			<div className="vs-split-slot" style={{ flex: `${1 - split.ratio} 1 0` }}><PaneNodeView node={split.b} single={false} /></div>
		</div>
	);
}

function PaneNodeView({ node, single }: { node: PaneNode; single: boolean }) {
	return node.kind === 'leaf' ? <Pane leaf={node} single={single} /> : <SplitView split={node} />;
}

export function Stage() {
	const state = useWorkspace();
	const { focusMode } = state.layout;

	if (state.scenario === 'empty' && !state.mission) {
		return (
			<div className="vs-stage vs-empty">
				<div className="vs-empty-inner">
					<span className="vs-empty-mark"><Sparkles size={22} /></span>
					<h1>What should we build?</h1>
					<p>Describe an outcome. Velocity staffs a coworker and starts building — you direct, review, and approve.</p>
					<button className="vs-app-primary lg" onClick={() => runtime.openMissionSheet(true)}>Create a mission</button>
				</div>
			</div>
		);
	}

	return (
		<div className={`vs-workspace${focusMode ? ' focus' : ''}`}>
			<PaneNodeView node={state.layout.panes} single={leafIds(state.layout.panes).length === 1} />
		</div>
	);
}
