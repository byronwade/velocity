// Far-left project rail — switch the workspace (each project = its own agent
// brain + app tabs). Arc "spaces" / Slack-style workspace switcher.

import { useShell } from '../lib/store';
import { Icon } from '../lib/icons';

export function ProjectRail() {
	const projects = useShell((s) => s.projects);
	const activeProjectId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0])?.projectId);
	const setActiveProject = useShell((s) => s.setActiveProject);
	const addProject = useShell((s) => s.addProject);
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);

	return (
		<aside className="prail">
			<div className="traffic" aria-hidden><i className="r" /><i className="y" /><i className="g" /></div>
			<div className="prail-list">
				{projects.map((p) => (
					<button
						key={p.id}
						className={`pbtn${p.id === activeProjectId ? ' on' : ''}`}
						title={p.name}
						aria-label={p.name}
						onClick={() => setActiveProject(p.id)}
						style={{ ['--pc' as string]: p.color }}
					>
						<span className="pinit">{p.name.slice(0, 1).toUpperCase()}</span>
					</button>
				))}
				<button className="pbtn add" title="New project" aria-label="New project" onClick={() => addProject()}><Icon.plus /></button>
			</div>
			<span className="grow" />
			<div className="prail-foot">
				<button className="ib" aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
					{theme === 'dark' ? <Icon.moon /> : <Icon.sun />}
				</button>
				<button className="ib" aria-label="Settings"><Icon.settings /></button>
				<span className="who" title="Byron Wade">B</span>
			</div>
		</aside>
	);
}
