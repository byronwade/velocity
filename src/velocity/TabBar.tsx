import { useState } from 'react';
import { Plus, X, Flag, ShieldQuestion, Pause, Sun, Moon } from 'lucide-react';
import { useShell } from '../lib/store';
import { useProjects, manager } from './useWorkspace';
import type { TabView } from './workspace';

function Tab({ tab, active }: { tab: TabView; active: boolean }) {
	const [renaming, setRenaming] = useState(false);
	const [name, setName] = useState(tab.name);
	const canClose = true;
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
			{canClose && (
				<button className="vs-tab-close" onClick={(e) => { e.stopPropagation(); manager.closeProject(tab.id); }} aria-label={`Close ${tab.name}`}><X size={12} /></button>
			)}
		</div>
	);
}

function Profile() {
	const { account } = useProjects();
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
				<div className="vs-credits" title="Credits used this cycle">
					<CreditsMeter />
				</div>
				<button className="vs-tabbar-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
					{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
				</button>
				<Profile />
			</div>
		</div>
	);
}

function CreditsMeter() {
	const { account } = useProjects();
	const pct = Math.min(100, (account.credits.used / account.credits.total) * 100);
	return (
		<>
			<div className="vs-credits-bar"><span style={{ width: `${pct}%` }} /></div>
			<span className="vs-credits-n">{(account.credits.used / 1000).toFixed(1)}k <em>/ {(account.credits.total / 1000).toFixed(0)}k</em></span>
		</>
	);
}
