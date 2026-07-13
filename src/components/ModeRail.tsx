// The global mode rail — the cockpit's far-left spine.
//
// Ten operating modes (not separate apps): each is a lens over the one project
// graph. Selecting a mode sets the brain's lens and, where a real app backs it,
// switches the active pane (Build → editor, Browse → browser, Design → builder).
// Minimal and borderless; labels appear on hover.

import { useShell } from '../lib/store';
import { COCKPIT_MODES, type CockpitMode, type Mode } from '../lib/types';
import { Icon, type IconName } from '../lib/icons';

const MODE_META: Record<CockpitMode, { name: string; icon: IconName }> = {
	home: { name: 'Home', icon: 'home' },
	build: { name: 'Build', icon: 'editor' },
	design: { name: 'Design', icon: 'layers' },
	browse: { name: 'Browse', icon: 'browser' },
	data: { name: 'Data', icon: 'database' },
	test: { name: 'Test', icon: 'beaker' },
	ship: { name: 'Ship', icon: 'rocket' },
	observe: { name: 'Observe', icon: 'activity' },
	agents: { name: 'Agents', icon: 'agents' },
	library: { name: 'Library', icon: 'grid' },
};

/** Modes that correspond to a real app pane get the stage switched to match. */
const MODE_APP: Partial<Record<CockpitMode, Mode>> = {
	build: 'editor',
	browse: 'browser',
	design: 'builder',
	data: 'database',
	observe: 'observe',
};

export function ModeRail() {
	const cockpitMode = useShell((s) => s.cockpitMode);
	const setCockpitMode = useShell((s) => s.setCockpitMode);
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);

	function pick(m: CockpitMode) {
		setCockpitMode(m);
		const app = MODE_APP[m];
		if (app) {
			const s = useShell.getState();
			const tab = s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
			s.setPaneMode(tab.activePaneId, app);
		}
	}

	return (
		<aside className="mrail">
			<div className="traffic" aria-hidden><i className="r" /><i className="y" /><i className="g" /></div>
			<nav className="mrail-list" aria-label="Modes">
				{COCKPIT_MODES.map((m) => {
					const meta = MODE_META[m];
					const Glyph = Icon[meta.icon];
					const on = cockpitMode === m;
					return (
						<button key={m} className={`mrbtn${on ? ' on' : ''}`} onClick={() => pick(m)} aria-label={meta.name} aria-current={on}>
							<Glyph />
							<span className="mrlabel">{meta.name}</span>
						</button>
					);
				})}
			</nav>
			<span className="grow" />
			<div className="mrail-foot">
				<button className="ib" aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
					{theme === 'dark' ? <Icon.moon /> : <Icon.sun />}
				</button>
				<button className="ib" aria-label="Settings"><Icon.settings /></button>
				<span className="who" title="Byron Wade">B</span>
			</div>
		</aside>
	);
}
