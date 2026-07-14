// The activity shelf — the cockpit's bottom surface.
//
// Not a terminal dump: a stream of stacked cards for what actually happened in
// the active workspace — every agent tool run (shell, write, open, search) and
// every batch of file changes, read live from the agent service. Collapsible to
// a thin status strip that still shows the latest event.

import { useSyncExternalStore } from 'react';
import { useShell } from '../lib/store';
import { useServices } from '../services/container';
import { Icon, type IconName } from '../lib/icons';

const TOOL_ICON: Record<string, IconName> = {
	terminal: 'terminal', write: 'file', open: 'editor', read: 'files',
	search: 'search', plan: 'sparkle',
};

interface Event {
	id: string;
	icon: IconName;
	label: string;
	status: 'running' | 'done' | 'error' | 'info';
	detail?: string;
}

export function ActivityShelf() {
	const { agent } = useServices();
	useSyncExternalStore(agent.subscribe, agent.getSnapshot);

	const project = useShell((s) => {
		const t = s.tabs.find((x) => x.id === s.activeTabId) ?? s.tabs[0];
		return s.projects.find((p) => p.id === t?.projectId);
	});
	const collapsed = useShell((s) => s.shelfCollapsed);
	const toggleShelf = useShell((s) => s.toggleShelf);

	const thread = project ? agent.thread(`proj:${project.id}`) : [];
	const events: Event[] = [];
	for (const m of thread) {
		if (m.role !== 'assistant') continue;
		for (const tc of m.tools) {
			events.push({
				id: tc.id,
				icon: TOOL_ICON[tc.tool] ?? 'command',
				label: tc.label,
				status: tc.status === 'running' ? 'running' : tc.status === 'error' ? 'error' : 'done',
				detail: tc.output?.split('\n').slice(0, 1).join(' '),
			});
		}
		if (m.changes && m.changes.length) {
			const added = m.changes.reduce((s, c) => s + c.added, 0);
			const removed = m.changes.reduce((s, c) => s + c.removed, 0);
			events.push({
				id: `${m.id}-changes`,
				icon: 'diff',
				label: `Edited ${m.changes.length} file${m.changes.length === 1 ? '' : 's'}`,
				status: 'info',
				detail: `+${added} −${removed}`,
			});
		}
	}
	events.reverse(); // newest first
	const latest = events[0];
	const running = events.filter((e) => e.status === 'running').length;

	if (collapsed) {
		return (
			<div className="shelf collapsed">
				<button className="shelf-strip" onClick={toggleShelf} title="Show activity">
					<Icon.activity />
					<span className="shelf-title">Activity</span>
					{running > 0 && <span className="shelf-run"><span className="spin" />{running}</span>}
					<span className="shelf-latest">{latest ? latest.label : 'No activity yet'}</span>
					<span className="sp" />
					<Icon.chevron />
				</button>
			</div>
		);
	}

	return (
		<div className="shelf">
			<div className="shelf-head">
				<Icon.activity />
				<b>Activity</b>
				<span className="shelf-count">{events.length}{running > 0 ? ` · ${running} running` : ''}</span>
				<span className="sp" />
				<button className="ib" onClick={toggleShelf} aria-label="Hide activity"><Icon.chevron /></button>
			</div>
			<div className="shelf-body">
				{events.length === 0 ? (
					<div className="shelf-empty">No activity yet — the agent's actions appear here as it works.</div>
				) : (
					events.map((e) => {
						const Glyph = Icon[e.icon];
						return (
							<div className={`ev s-${e.status}`} key={e.id}>
								<span className="ev-ic"><Glyph /></span>
								<span className="ev-label">{e.label}</span>
								{e.detail && <span className="ev-detail">{e.detail}</span>}
								<span className="ev-stat">{e.status === 'running' ? <span className="spin" /> : e.status === 'error' ? '!' : e.status === 'info' ? '' : <Icon.check />}</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
