import { useEffect, useState } from 'react';
import { Plus, X, Flag, ShieldQuestion, Pause, Sun, Moon, Settings, CheckCircle2, Clock, Pencil } from 'lucide-react';
import { useShell } from '../lib/store';
import { useProjects, useWorkspace, manager, runtime } from './useWorkspace';
import { SCENARIOS as SCENARIO_LIST } from './scenarios';
import { ContextMenu, useContextMenu } from './ContextMenu';
import type { TabView } from './workspace';

/** Rich hover card — what's happening on a project and what needs attention. */
function TabHover({ tab }: { tab: TabView }) {
	return (
		<div className="vs-tabhover" role="tooltip">
			<div className="vs-tabhover-head">
				<b>{tab.name}</b>
				{tab.missionTotal > 0 && <span className="vs-tabhover-prog">{tab.missionDone}/{tab.missionTotal} verified</span>}
			</div>
			{tab.missionTitle && <div className="vs-tabhover-mission">{tab.missionTitle}</div>}
			{tab.roster.length > 0 && (
				<div className="vs-tabhover-roster">
					{tab.roster.map((r, i) => (
						<div key={i} className="vs-tabhover-row"><span className={`vs-dotmark tone-${r.tone}`} style={{ background: r.color }} /><b>{r.name}</b><span>{r.action}</span></div>
					))}
				</div>
			)}
			{tab.needs.length > 0 && (
				<div className="vs-tabhover-needs">
					{tab.needs.map((n, i) => <div key={i} className="vs-tabhover-need"><Flag size={11} />{n}</div>)}
				</div>
			)}
			{tab.roster.length === 0 && tab.needs.length === 0 && <div className="vs-tabhover-empty">No coworkers yet.</div>}
		</div>
	);
}

function Tab({ tab, active }: { tab: TabView; active: boolean }) {
	const [renaming, setRenaming] = useState(false);
	const [name, setName] = useState(tab.name);
	const [hover, setHover] = useState(false);
	const [dropTarget, setDropTarget] = useState(false);
	const ctx = useContextMenu();

	const openMission = (e: React.MouseEvent) => {
		e.stopPropagation();
		manager.switchProject(tab.id);
		runtime.setLens('verify');
	};

	return (
		<div className={`vs-tab${active ? ' active' : ''}${dropTarget ? ' droptarget' : ''}`} onClick={() => manager.switchProject(tab.id)}
			onDoubleClick={() => { setName(tab.name); setRenaming(true); }} onContextMenu={ctx.onContextMenu}
			onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
			draggable={!renaming}
			onDragStart={(e) => { e.dataTransfer.setData('text/plain', tab.id); e.dataTransfer.effectAllowed = 'move'; }}
			onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
			onDragLeave={() => setDropTarget(false)}
			onDrop={(e) => { e.preventDefault(); setDropTarget(false); const id = e.dataTransfer.getData('text/plain'); if (id) manager.reorderProjects(id, tab.id); }}
			role="tab" aria-selected={active}>
			<span className={`vs-tab-status${tab.working ? ' working' : tab.pendingReview ? ' review' : tab.openDecision ? ' decision' : tab.paused ? ' paused' : ''}`}>
				{tab.working ? <span className="vs-tab-spin" /> : tab.pendingReview ? <Flag size={11} /> : tab.openDecision ? <ShieldQuestion size={11} /> : tab.paused ? <Pause size={10} /> : <span className="vs-tab-dot" />}
			</span>
			{renaming ? (
				<input className="vs-tab-rename" autoFocus value={name} onClick={(e) => e.stopPropagation()}
					onChange={(e) => setName(e.target.value)}
					onBlur={() => { manager.renameProject(tab.id, name); setRenaming(false); }}
					onKeyDown={(e) => { if (e.key === 'Enter') { manager.renameProject(tab.id, name); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }} />
			) : (
				<span className="vs-tab-name">{tab.name}</span>
			)}
			{tab.missionTotal > 0 && (
				<button className="vs-tab-mission" onClick={openMission} title={`Mission ${tab.missionDone}/${tab.missionTotal} — open Verify`}>
					<span className="vs-tab-ring" style={{ ['--pct' as string]: `${Math.round((tab.missionDone / tab.missionTotal) * 100)}` }} />
					{tab.missionDone}/{tab.missionTotal}
				</button>
			)}
			<button className="vs-tab-close" onClick={(e) => { e.stopPropagation(); manager.closeProject(tab.id); }} aria-label={`Close ${tab.name}`}><X size={12} /></button>

			{hover && !renaming && !ctx.at && <TabHover tab={tab} />}
			{ctx.at && (
				<ContextMenu x={ctx.at.x} y={ctx.at.y} onClose={ctx.close} items={[
					{ label: 'Rename', icon: <Pencil size={14} />, onClick: () => { setName(tab.name); setRenaming(true); } },
					{ label: 'Open Verify', icon: <CheckCircle2 size={14} />, onClick: () => { manager.switchProject(tab.id); runtime.setLens('verify'); } },
					{ separator: true },
					{ label: 'New project', icon: <Plus size={14} />, onClick: () => manager.newProject() },
					{ label: 'Close', icon: <X size={14} />, danger: true, onClick: () => manager.closeProject(tab.id) },
				]} />
			)}
		</div>
	);
}

/** Account / settings — everything that used to live in the header lives here. */
function Profile() {
	const { account } = useProjects();
	const state = useWorkspace();
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	const [open, setOpen] = useState(false);
	const [density, setDensity] = useState(() => document.documentElement.dataset.density ?? 'comfortable');
	const [motion, setMotion] = useState(() => document.documentElement.dataset.motion ?? 'full');
	const pct = Math.min(100, (account.credits.used / account.credits.total) * 100);

	useEffect(() => { document.documentElement.dataset.density = density; try { localStorage.setItem('vs-density', density); } catch { /* ignore */ } }, [density]);
	useEffect(() => { document.documentElement.dataset.motion = motion; try { localStorage.setItem('vs-motion', motion); } catch { /* ignore */ } }, [motion]);

	return (
		<div className="vs-profile-wrap">
			<button className="vs-profile" onClick={() => setOpen((v) => !v)} aria-label="Account & settings" style={{ ['--id' as string]: account.user.color }}>
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
						<div className="vs-set-sec"><Settings size={13} />Settings</div>
						<div className="vs-set-row"><span>Appearance</span>
							<div className="vs-seg">
								<button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Sun size={13} />Light</button>
								<button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Moon size={13} />Dark</button>
							</div>
						</div>
						<div className="vs-set-row"><span>Density</span>
							<div className="vs-seg">
								<button className={density === 'comfortable' ? 'on' : ''} onClick={() => setDensity('comfortable')}>Cozy</button>
								<button className={density === 'compact' ? 'on' : ''} onClick={() => setDensity('compact')}>Compact</button>
							</div>
						</div>
						<div className="vs-set-row"><span>Motion</span>
							<div className="vs-seg">
								<button className={motion === 'full' ? 'on' : ''} onClick={() => setMotion('full')}>Full</button>
								<button className={motion === 'reduced' ? 'on' : ''} onClick={() => setMotion('reduced')}>Reduced</button>
							</div>
						</div>
						<label className="vs-profile-scenario">
							<span><Clock size={12} />Demo scenario</span>
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
	return (
		<div className="vs-tabbar" role="tablist">
			<span className="vs-tabbar-logo" />
			<div className="vs-tabs">
				{tabs.map((t) => <Tab key={t.id} tab={t} active={t.id === activeId} />)}
				<button className="vs-tab-new" onClick={() => manager.newProject()} title="New project" aria-label="New project"><Plus size={15} /></button>
			</div>
			<div className="vs-tabbar-right">
				<Profile />
			</div>
		</div>
	);
}
