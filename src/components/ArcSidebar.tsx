// Arc-style left sidebar: brand + vertical tabs + Explorer + footer controls.
// This is the single left column; the top tab strip is gone.

import { useShell } from '../lib/store';
import { Icon } from '../lib/icons';
import { TabRail } from './TabRail';
import { Explorer } from './Sidebar';

export function ArcSidebar() {
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	return (
		<aside className="arc-side">
			<div className="arc-brand">
				<div className="traffic" aria-hidden><i className="r" /><i className="y" /><i className="g" /></div>
				<span className="brandmark" aria-hidden />
				<span className="wordmark">Velocity</span>
			</div>
			<TabRail />
			<div className="arc-explorer">
				<div className="arc-sec-head">Explorer</div>
				<Explorer />
			</div>
			<div className="arc-foot">
				<button className="ib" title="Settings" aria-label="Settings"><Icon.settings /></button>
				<button
					className="ib"
					aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
					aria-pressed={theme === 'dark'}
					onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
				>
					{theme === 'dark' ? <Icon.moon /> : <Icon.sun />}
				</button>
				<span className="grow" />
				<span className="who" title="Byron Wade">B</span>
			</div>
		</aside>
	);
}
