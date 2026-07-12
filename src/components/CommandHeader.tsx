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
	void MODE_DEFS[mode];

	return (
		<div className="header">
			{/* left · view + tools */}
			<div className="hgroup">
				<button className="ib" title="Toggle sidebar" aria-label="Toggle sidebar" onClick={toggleSidebar}><Icon.sidebar /></button>
				<span className="brandmark" aria-hidden />
				<ModeDropdown activeMode={mode} />
				<button className="ib" title="Command palette (⌘K)" aria-label="Command palette"><Icon.command /></button>
				<button className="ib" title="Search (⌘P)" aria-label="Search"><Icon.search /></button>
			</div>

			{/* center · document title + branch */}
			<div className="center">
				<span className="doctitle">{tab.title}</span>
				<span className="dsep">·</span>
				<button className="branch" title="Switch branch"><Icon.git />main</button>
				<span className="sync"><Icon.check />saved</span>
			</div>

			{/* right · run, people, share */}
			<div className="hgroup right">
				<button className="ib" title="Run / Preview" aria-label="Run"><Icon.play /></button>
				<div className="presence" title="3 collaborators live">
					{PEOPLE.map((p) => (
						<span key={p.initial} className="av" style={{ background: p.color }}>{p.initial}</span>
					))}
					<span className="av more">+4</span>
				</div>
				<button className="btn ghost" onClick={() => setSheet('invite')}><Icon.invite />Invite</button>
				<button className="btn brand" onClick={() => setSheet('share')}><Icon.share />Share</button>
				<button
					className="ib"
					aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
					aria-pressed={theme === 'dark'}
					onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
				>
					{theme === 'dark' ? <Icon.moon /> : <Icon.sun />}
				</button>
			</div>

			{sheet && <ShareSheet kind={sheet} onClose={() => setSheet(null)} />}
		</div>
	);
}
