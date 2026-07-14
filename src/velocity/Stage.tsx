import { useState } from 'react';
import { Play, Check, X, RotateCcw, Rocket, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { EditorMode } from '../modes/EditorMode';
import { useWorkspace, runtime } from './useWorkspace';
import type { Coworker, Lens } from './model';

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

function SystemLens() {
	return (
		<div className="vs-system">
			<div className="vs-sys-flow">
				{['Client', '/checkout', '/session', 'sessions db'].map((n, i, arr) => (
					<div key={n} className="vs-sys-step">
						<Region id={`sys-${n}`} label={n} className={`vs-sys-node${i === 2 ? ' hot' : ''}`}>{n}</Region>
						{i < arr.length - 1 && <ArrowRight size={16} className="vs-sys-arrow" />}
					</div>
				))}
			</div>
			<div className="vs-sys-detail">
				<div className="vs-sys-row"><span className="vs-tag good">200</span><code>POST /session</code><span>· passkey credential attached</span></div>
				<div className="vs-sys-row"><span className="vs-tag">contract</span><code>Session.credential: PasskeyRef</code><span>· new field</span></div>
				<div className="vs-sys-row"><span className="vs-tag good">12/12</span><span>checks · p95 42ms</span></div>
				<button className="vs-run"><Play size={14} />Run checkout scenario</button>
			</div>
		</div>
	);
}

function DataLens() {
	const cols = ['id', 'email', 'credential', 'created'];
	const rows = [['1', 'ada@aurora.dev', 'passkey', '2026-01-04'], ['2', 'grace@aurora.dev', 'passkey', '2026-01-09'], ['3', 'linus@aurora.dev', 'email', '2026-02-02']];
	return (
		<div className="vs-data">
			<aside className="vs-data-schema">
				<div className="vs-data-table active">sessions <em>+1</em></div>
				<div className="vs-data-table">users</div>
				<div className="vs-data-table">orders</div>
			</aside>
			<div className="vs-data-main">
				<div className="vs-data-q"><code>SELECT * FROM sessions</code><button className="vs-run"><Play size={13} />Run</button></div>
				<table className="vs-data-grid"><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
					<tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 2 && c === 'passkey' ? 'new' : ''}>{c}</td>)}</tr>)}</tbody>
				</table>
			</div>
		</div>
	);
}

function VerifyLens() {
	const state = useWorkspace();
	const criteria = state.mission?.criteria ?? [];
	return (
		<div className="vs-verify">
			<div className="vs-verify-head"><h2>Verification</h2><span className="vs-tag good">{criteria.filter((c) => c.state === 'verified').length}/{criteria.length}</span></div>
			<div className="vs-verify-list">
				{criteria.map((c) => (
					<div key={c.id} className={`vs-verify-row ${c.state}`}>
						{c.state === 'verified' ? <Check size={15} /> : c.state === 'failed' ? <X size={15} /> : <span className="vs-dot" />}
						<span>{c.label}</span>
						<button className="vs-run sm"><Play size={12} />Run</button>
					</div>
				))}
			</div>
		</div>
	);
}

function ShipLens() {
	return (
		<div className="vs-ship">
			<div className="vs-ship-card">
				<Rocket size={22} />
				<h2>Ready to ship</h2>
				<p>All acceptance criteria verified · Candidate healthy · rollback point ready.</p>
				<div className="vs-ship-checks">
					<span className="vs-tag good">Build ok</span><span className="vs-tag good">12/12 tests</span><span className="vs-tag good">a11y AA</span><span className="vs-tag">Rollback @ 09:41</span>
				</div>
				<div className="vs-ship-actions">
					<button className="vs-app-ghost" onClick={() => runtime.toggleCompare()}>Compare with Stable</button>
					<button className="vs-app-primary" onClick={() => runtime.ship()}><Rocket size={15} />Ship to Preview</button>
				</div>
			</div>
		</div>
	);
}

function renderLens(lens: Lens, candidate: boolean) {
	switch (lens) {
		case 'preview': return <PreviewLens candidate={candidate} />;
		case 'code': return <div className="vs-code"><EditorMode paneId="velocity:stage:editor" /></div>;
		case 'system': return <SystemLens />;
		case 'data': return <DataLens />;
		case 'verify': return <VerifyLens />;
		case 'ship': return <ShipLens />;
	}
}

function Markers({ lens, coworkers }: { lens: Lens; coworkers: Coworker[] }) {
	const here = coworkers.filter((c) => c.marker && c.marker.lens === lens && c.state !== 'archived' && c.state !== 'dismissed');
	return (
		<>
			{here.map((c) => (
				<button key={c.id} className={`vs-marker${c.following ? ' following' : ''}`} style={{ left: `${c.marker!.x}%`, top: `${c.marker!.y}%`, ['--id' as string]: c.color }}
					onClick={() => runtime.follow(c.following ? null : c.id)}
					title={`${c.name} · ${c.role} — ${c.action}`} aria-label={`${c.name}, ${c.role}, ${c.action}`}>
					<span className="vs-marker-dot" style={{ background: c.color }}>{c.initials}</span>
					<span className="vs-marker-label">{c.name} · {c.marker!.label}</span>
				</button>
			))}
		</>
	);
}

export function Stage() {
	const state = useWorkspace();
	const { lens, compare, focusMode } = state.layout;
	const candidateHealthy = state.candidate.health === 'healthy';

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

	if (compare) {
		return (
			<div className={`vs-stage vs-compare${focusMode ? ' focus' : ''}`}>
				<div className="vs-compare-pane">
					<div className="vs-compare-tag">Stable <span className="vs-tag">interactive</span></div>
					<div className="vs-compare-frame"><PreviewLens candidate={false} /></div>
				</div>
				<div className="vs-compare-divider" />
				<div className="vs-compare-pane">
					<div className="vs-compare-tag">Candidate <span className={`vs-tag ${candidateHealthy ? 'good' : 'warn'}`}>{state.candidate.checks.passed}/{state.candidate.checks.total}</span></div>
					<div className="vs-compare-frame"><PreviewLens candidate /><Markers lens="preview" coworkers={state.coworkers} /></div>
				</div>
				<div className="vs-compare-bar">
					<button className="vs-app-ghost" onClick={() => runtime.toggleCompare()}>Close compare</button>
					<div className="vs-spacer" />
					<button className="vs-app-ghost" onClick={() => runtime.rollback(state.checkpoints[0]?.id ?? '')}><RotateCcw size={14} />Roll back</button>
					<button className="vs-app-ghost" onClick={() => state.checkpoints[0] && runtime.reviseCheckpoint(state.checkpoints[0].id)}>Revise</button>
					<button className="vs-app-primary" onClick={() => state.checkpoints[0] && runtime.acceptCheckpoint(state.checkpoints[0].id)}><Check size={14} />Promote Candidate</button>
				</div>
			</div>
		);
	}

	return (
		<div className={`vs-stage${focusMode ? ' focus' : ''}`}>
			<div className="vs-stage-inner">
				{renderLens(lens, candidateHealthy)}
				<Markers lens={lens} coworkers={state.coworkers} />
			</div>
		</div>
	);
}
