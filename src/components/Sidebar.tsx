import { useState } from 'react';
import { Icon, type IconName } from '../lib/icons';

const ITEMS: Array<{ id: string; icon: IconName; label: string }> = [
	{ id: 'files', icon: 'files', label: 'Explorer' },
	{ id: 'search', icon: 'search', label: 'Search' },
	{ id: 'git', icon: 'git', label: 'Source Control' },
	{ id: 'agents', icon: 'agents', label: 'Agents' },
	{ id: 'deploy', icon: 'deploy', label: 'Deployments' },
];

export function Sidebar() {
	const [active, setActive] = useState('files');
	return (
		<aside className="sidebar">
			<nav className="activity">
				{ITEMS.map((it) => {
					const Ico = Icon[it.icon];
					return (
						<button key={it.id} className={`s${active === it.id ? ' on' : ''}`} title={it.label} aria-label={it.label} aria-pressed={active === it.id} onClick={() => setActive(it.id)}><Ico /></button>
					);
				})}
				<div className="grow" />
				<button className="s" title="Settings"><Icon.settings /></button>
			</nav>
			<div className="panel-col">
				<div className="ph">Explorer</div>
				<div className="tree">
					<div className="row"><Icon.files />app</div>
					<div className="row ind g"><Icon.file />middleware.ts<span className="badge">M</span></div>
					<div className="row ind"><Icon.file />layout.tsx</div>
					<div className="row"><Icon.files />hooks</div>
					<div className="row ind sel g"><Icon.file />useSession.ts<span className="badge">M</span></div>
					<div className="row ind"><Icon.file />useUser.ts</div>
					<div className="row"><Icon.files />components</div>
					<div className="row"><Icon.file />package.json</div>
				</div>
			</div>
		</aside>
	);
}
