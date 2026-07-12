// The Agent "brain" — the persistent left panel that controls the workspace.
// A view switcher shows different lenses on the project (Chat · Files · Changes)
// while the composer stays pinned at the bottom. The agent is scoped per project.

import { useState } from 'react';
import { useShell } from '../lib/store';
import { AgentThread, AgentComposer } from '../modes/AgentsMode';
import { Explorer } from './Sidebar';
import { useAgentThread } from '../services/agent';
import { Icon } from '../lib/icons';

type View = 'chat' | 'files' | 'changes';

function basename(p: string): string {
	const i = p.lastIndexOf('/');
	return i === -1 ? p : p.slice(i + 1);
}

function ChangesView({ brainKey }: { brainKey: string }) {
	const { thread } = useAgentThread(brainKey);
	const map = new Map<string, { added: number; removed: number }>();
	for (const m of thread) {
		for (const c of m.changes ?? []) {
			const prev = map.get(c.path) ?? { added: 0, removed: 0 };
			map.set(c.path, { added: prev.added + c.added, removed: prev.removed + c.removed });
		}
	}
	const files = [...map.entries()];
	if (files.length === 0) {
		return <div className="brain-empty">No changes yet.<br />Ask the agent to build or edit something.</div>;
	}
	return (
		<div className="brain-changes">
			<div className="cc-head"><span>{files.length} File{files.length === 1 ? '' : 's'} Changed</span></div>
			{files.map(([path, s]) => (
				<div className="cc-row" key={path} title={path}>
					<Icon.file />
					<span className="cc-name">{basename(path)}</span>
					<span className="cc-stat"><span className="add">+{s.added}</span> <span className="del">−{s.removed}</span></span>
				</div>
			))}
		</div>
	);
}

export function AgentPanel() {
	const activeTab = useShell((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]);
	const project = useShell((s) => s.projects.find((p) => p.id === activeTab?.projectId));
	const [view, setView] = useState<View>('chat');
	const brainKey = `proj:${project?.id ?? 'none'}`;

	return (
		<section className="brain">
			<div className="brain-head">
				<span className="pdot" style={{ background: project?.color }} />
				<b className="bname">{project?.name ?? 'Project'}</b>
				<span className="bbranch"><Icon.git />main</span>
				<span className="sp" />
				<div className="bviews" role="tablist" aria-label="Agent views">
					{(['chat', 'files', 'changes'] as View[]).map((v) => (
						<button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
							{v[0].toUpperCase() + v.slice(1)}
						</button>
					))}
				</div>
			</div>
			<div className="brain-body">
				{view === 'chat' && <AgentThread brainKey={brainKey} />}
				{view === 'files' && <div className="brain-files"><Explorer /></div>}
				{view === 'changes' && <ChangesView brainKey={brainKey} />}
			</div>
			<AgentComposer brainKey={brainKey} />
		</section>
	);
}
