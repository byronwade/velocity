import { useState } from 'react';
import { useShell } from '../lib/store';
import { leaves } from '../lib/tree';
import { MODE_DEFS } from '../modes/registry';
import { Icon } from '../lib/icons';
import { ModeDropdown } from './ModeDropdown';
import { ShareSheet } from './ShareSheet';

const PEOPLE = [
	{ initial: 'B', color: 'linear-gradient(135deg,#7c5cff,#d94fb0)' },
	{ initial: 'M', color: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
	{ initial: 'K', color: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
];

export function CommandHeader() {
	const toggleSidebar = useShell((s) => s.toggleSidebar);
	const setTheme = useShell((s) => s.setTheme);
	const theme = useShell((s) => s.theme);
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);
	const [sheet, setSheet] = useState<null | 'invite' | 'share'>(null);

	const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const activePane = leaves(tab.tree).find((l) => l.pane.id === tab.activePaneId) ?? leaves(tab.tree)[0];
	const mode = activePane.pane.mode;
	const def = MODE_DEFS[mode];

	return (
		<div className="header">
			{/* 1 · sidebar toggle */}
			<button className="ib" title="Toggle sidebar" onClick={toggleSidebar}><Icon.sidebar /></button>
			<div className="hsep" />

			{/* 2 · navigation */}
			<div className="hz">
				<button className="ib" title="Back"><Icon.back /></button>
				<button className="ib" title="Forward"><Icon.forward /></button>
			</div>
			<div className="crumb">
				<span className="avatar" />
				<span className="c">byron</span><span className="s">/</span>
				<span className="c">streamline</span><span className="s">/</span>
				<span className="c here">{tab.title}</span>
			</div>
			<div className="hsep" />

			{/* 3 · contextual (mode-specific) actions */}
			<div className="hz">
				<button className="ib" title="Command palette"><Icon.command /></button>
				<button className="ib" title="Search"><Icon.search /></button>
			</div>

			{/* 4 · center: title + mode dropdown */}
			<div className="center">
				<ModeDropdown activeMode={mode} />
				<div className="title">
					<span className="branch" title="Switch branch">main <Icon.chevron /></span>
					<span className="sync"><Icon.check /> saved</span>
				</div>
			</div>

			<div className="spacer" />

			{/* contextual action hint for the active mode */}
			<span className="livepill" title={`${def.name} actions`}><i />{def.actions[0]}</span>

			{/* 5 · site actions */}
			<div className="hz">
				<button className="ib" title="Run / Preview"><Icon.play /></button>
				<button className="ib" title="Deploy"><Icon.rocket /></button>
			</div>
			<div className="hsep" />

			{/* 6 · presence */}
			<div className="presence" title="3 collaborators live">
				{PEOPLE.map((p) => <span key={p.initial} className="av" style={{ background: p.color }}>{p.initial}</span>)}
				<span className="av more">+4</span>
			</div>

			{/* 7 · invite  8 · share */}
			<button className="btn" onClick={() => setSheet('invite')}><Icon.invite />Invite</button>
			<button className="btn brand" onClick={() => setSheet('share')}><Icon.share />Share</button>
			<button
				className="ib"
				aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
				aria-pressed={theme === 'dark'}
				onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
			>
				{theme === 'dark' ? <Icon.moon /> : <Icon.sun />}
			</button>

			{sheet && <ShareSheet kind={sheet} onClose={() => setSheet(null)} />}
		</div>
	);
}
