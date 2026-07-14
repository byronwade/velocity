import { useEffect } from 'react';
import { Sun, Moon, Maximize2, Minimize2, GitCompare, Flag, ShieldQuestion, EyeOff } from 'lucide-react';
import { useShell } from '../lib/store';
import { useWorkspace, runtime } from './useWorkspace';
import { LENS_META } from './model';
import type { Lens } from './model';
import { SCENARIOS as SCENARIO_LIST } from './scenarios';
import { Stage } from './Stage';
import { Dock } from './Dock';
import { MissionSheet, RightRail, ToolDrawer, CommandBar } from './surfaces';
import './velocity.css';

const LENS_ORDER: Lens[] = ['preview', 'code', 'system', 'data', 'verify', 'ship'];

function TopBar() {
	const state = useWorkspace();
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	const { lens, compare, focusMode } = state.layout;
	const pendingCheckpoint = state.checkpoints.some((k) => k.state === 'ready');
	const openDecision = state.decisions.some((d) => d.state === 'open');

	return (
		<header className="vs-top">
			<div className="vs-top-left">
				<span className="vs-logo" />
				<div className="vs-proj"><b>{state.project.name}</b><span>{state.project.branch} · {state.scenarioLabel}</span></div>
				{state.mission && (() => {
					const done = state.mission.criteria.filter((c) => c.state === 'verified').length;
					const total = state.mission.criteria.length;
					return (
						<button className="vs-mission-chip" onClick={() => runtime.setLens('verify')} title="Mission progress → Verify">
							<span className="vs-mission-title">{state.mission.title}</span>
							<span className="vs-mission-dots">
								{state.mission.criteria.map((c) => <span key={c.id} className={`vs-mdot ${c.state}`} />)}
							</span>
							<span className="vs-mission-n">{done}/{total}</span>
						</button>
					);
				})()}
			</div>

			<nav className="vs-lenses" aria-label="Lenses">
				{LENS_ORDER.map((l) => (
					<button key={l} className={`vs-lens${lens === l && !compare ? ' on' : ''}`} onClick={() => runtime.setLens(l)} title={LENS_META[l].hint}>
						{LENS_META[l].label}
					</button>
				))}
			</nav>

			<div className="vs-top-right">
				{openDecision && <button className="vs-alert decision" onClick={() => runtime.openRight('decision')}><ShieldQuestion size={14} />Decision</button>}
				{pendingCheckpoint && <button className="vs-alert" onClick={() => runtime.openRight('checkpoint')}><Flag size={14} />Review</button>}
				<button className={`vs-ghosticon${compare ? ' on' : ''}`} onClick={() => runtime.toggleCompare()} title="Compare Stable vs Candidate"><GitCompare size={16} /></button>
				<button className={`vs-ghosticon${focusMode ? ' on' : ''}`} onClick={() => runtime.toggleFocus()} title="Focus mode">{focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
				<select className="vs-scenario" value={state.scenario} onChange={(e) => runtime.load(e.target.value)} title="Demo scenario" aria-label="Demo scenario">
					{SCENARIO_LIST.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
				</select>
				<button className="vs-ghosticon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
			</div>
		</header>
	);
}

function Confetti() {
	const state = useWorkspace();
	if (!state.celebrate) return null;
	return (
		<div className="vs-confetti" aria-hidden>
			{Array.from({ length: 42 }).map((_, i) => (
				<span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 40}ms`, background: ['#6f74c9', '#4a8dd1', '#2f9e8f', '#e0b34d', '#c96f9a'][i % 5] }} />
			))}
		</div>
	);
}

function Toast() {
	const state = useWorkspace();
	if (!state.toast) return null;
	return <div className="vs-toast" role="status">{state.toast}</div>;
}

function FollowBanner() {
	const state = useWorkspace();
	const followed = state.coworkers.find((c) => c.id === state.layout.followingId);
	if (!followed) return null;
	return (
		<div className="vs-followbar" style={{ ['--id' as string]: followed.color }} role="status">
			<span className="vs-avatar sm" style={{ background: followed.color }}>{followed.initials}</span>
			<b>Following {followed.name}</b>
			<span>· {followed.action}</span>
			<div className="vs-spacer" />
			<button className="vs-followbar-stop" onClick={() => runtime.follow(null)}><EyeOff size={13} />Stop following</button>
		</div>
	);
}

export function VelocityApp() {
	// Prototype-scoped keyboard. The production shell routes these through the
	// keybinding engine; here a single scoped listener keeps the demo self-contained.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			const tag = (e.target as HTMLElement)?.tagName;
			const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
			if (e.key === 'Escape') { runtime.closeTopmost(); return; }
			if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); runtime.openCommand(true); return; }
			if (mod && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); runtime.openMissionSheet(true); return; }
			if (mod && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); runtime.setLens('ship'); return; }
			if (typing || mod) return;
			if (e.key >= '1' && e.key <= '6') { runtime.setLens(LENS_ORDER[Number(e.key) - 1]); return; }
			if (e.key.toLowerCase() === 'c') runtime.toggleCompare();
			if (e.key.toLowerCase() === 'f') runtime.toggleFocus();
			if (e.key === '.') runtime.togglePause();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const focusMode = useWorkspace().layout.focusMode;
	return (
		<div className={`vs-root${focusMode ? ' focus' : ''}`}>
			{!focusMode && <TopBar />}
			{!focusMode && <FollowBanner />}
			<div className="vs-main">
				<Stage />
				<RightRail />
			</div>
			<ToolDrawer />
			<Dock />
			<MissionSheet />
			<CommandBar />
			<Toast />
			<Confetti />
		</div>
	);
}
