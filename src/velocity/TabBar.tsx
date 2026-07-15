import { useState } from 'react';
import { Plus, X, Flag, ShieldQuestion, Pause, Sun, Moon, UserPlus } from 'lucide-react';
import { useShell } from '../lib/store';
import { useProjects, useWorkspace, manager, runtime } from './useWorkspace';
import { SCENARIOS as SCENARIO_LIST } from './scenarios';
import type { TabView } from './workspace';

function Tab({ tab, active }: { tab: TabView; active: boolean }) {
	const [renaming, setRenaming] = useState(false);
	const [name, setName] = useState(tab.name);
	return (
		<div className={`vs-tab${active ? ' active' : ''}`} onClick={() => manager.switchProject(tab.id)}
			onDoubleClick={() => { setName(tab.name); setRenaming(true); }} role="tab" aria-selected={active} title={`${tab.name} · ${tab.scenarioLabel}`}>
			<span className={`vs-tab-status${tab.pendingReview ? ' review' : tab.openDecision ? ' decision' : tab.paused ? ' paused' : ''}`}>
				{tab.pendingReview ? <Flag size={11} /> : tab.openDecision ? <ShieldQuestion size={11} /> : tab.paused ? <Pause size={10} /> : <span className="vs-tab-dot" />}
			</span>
			{renaming ? (
				<input className="vs-tab-rename" autoFocus value={name} onClick={(e) => e.stopPropagation()}
					onChange={(e) => setName(e.target.value)}
					onBlur={() => { manager.renameProject(tab.id, name); setRenaming(false); }}
					onKeyDown={(e) => { if (e.key === 'Enter') { manager.renameProject(tab.id, name); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }} />
			) : (
				<span className="vs-tab-name">{tab.name}</span>
			)}
			<span className="vs-tab-meta">{tab.coworkers}</span>
			<button className="vs-tab-close" onClick={(e) => { e.stopPropagation(); manager.closeProject(tab.id); }} aria-label={`Close ${tab.name}`}><X size={12} /></button>
		</div>
	);
}

/** Compact mission progress — dots + N/M, click to jump to Verify. */
function MissionMini() {
	const state = useWorkspace();
	if (!state.mission) return null;
	const done = state.mission.criteria.filter((c) => c.state === 'verified').length;
	const total = state.mission.criteria.length;
	return (
		<button className="vs-mission-chip" onClick={() => runtime.setLens('verify')} title={`${state.mission.title} — ${done}/${total} verified`}>
			<span className="vs-mission-dots">{state.mission.criteria.map((c) => <span key={c.id} className={`vs-mdot ${c.state}`} />)}</span>
			<span className="vs-mission-n">{done}/{total}</span>
		</button>
	);
}

function Facepile() {
	const state = useWorkspace();
	const here = state.collaborators.filter((c) => c.status === 'active').slice(0, 4);
	if (here.length === 0) return null;
	return (
		<div className="vs-facepile" title="People on this project">
			{here.map((c) => <span key={c.id} className="vs-face" style={{ background: c.color }} title={`${c.name} · ${c.role}`}>{c.initials}</span>)}
		</div>
	);
}

function Profile() {
	const { account } = useProjects();
	const state = useWorkspace();
	const [open, setOpen] = useState(false);
	const pct = Math.min(100, (account.credits.used / account.credits.total) * 100);
	return (
		<div className="vs-profile-wrap">
			<button className="vs-profile" onClick={() => setOpen((v) => !v)} aria-label="Account" style={{ ['--id' as string]: account.user.color }}>
				<span className="vs-profile-badge" style={{ background: account.user.color }}>{account.user.initials}</span>
			</button>
			{open && (
				<>
					<div className="vs-profile-scrim" onClick={() => setOpen(false)} />
					<div className="vs-profile-menu" role="dialog" aria-label="Account">
						<div className="vs-profile-head">
							<span className="vs-profile-badge lg" style={{ background: account.user.color }}>{account.user.initials}</span>
							<div><b>{account.user.name}</b><span>{account.user.email}</span></div>
							<span className="vs-plan">{account.user.plan}</span>
						</div>
						<div className="vs-profile-credits">
							<div className="vs-pc-top"><span>Credits</span><span>{account.credits.used.toLocaleString()} / {account.credits.total.toLocaleString()}</span></div>
							<div className="vs-pc-bar"><span style={{ width: `${pct}%` }} /></div>
							<div className="vs-pc-usage">{account.usageLabel}</div>
						</div>
						<label className="vs-profile-scenario">
							<span>Demo scenario</span>
							<select value={state.scenario} onChange={(e) => runtime.load(e.target.value)}>
								{SCENARIO_LIST.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
							</select>
						</label>
					</div>
				</>
			)}
		</div>
	);
}

export function TabBar() {
	const { tabs, activeId } = useProjects();
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	return (
		<div className="vs-tabbar" role="tablist">
			<span className="vs-tabbar-logo" />
			<div className="vs-tabs">
				{tabs.map((t) => <Tab key={t.id} tab={t} active={t.id === activeId} />)}
				<button className="vs-tab-new" onClick={() => manager.newProject()} title="New project" aria-label="New project"><Plus size={15} /></button>
			</div>
			<div className="vs-tabbar-right">
				<MissionMini />
				<Facepile />
				<button className="vs-share-btn" onClick={() => runtime.openShare(true)} title="Share & invite"><UserPlus size={14} />Share</button>
				<div className="vs-tabbar-sep" />
				<button className="vs-tabbar-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
					{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
				</button>
				<Profile />
			</div>
		</div>
	);
}
