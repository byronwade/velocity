import type { Pane } from '../lib/types';
import { useShell } from '../lib/store';
import { MODE_DEFS } from '../modes/registry';
import { Icon } from '../lib/icons';

export function PaneChrome({ pane }: { pane: Pane }) {
	const def = MODE_DEFS[pane.mode];
	const Glyph = Icon[def.icon];
	const Content = def.Content;
	const activePaneId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]).activePaneId);
	const setActivePane = useShell((s) => s.setActivePane);
	const splitPane = useShell((s) => s.splitPane);
	const closePane = useShell((s) => s.closePane);
	const toggleMax = useShell((s) => s.toggleMaximizePane);
	const isActive = activePaneId === pane.id;

	return (
		<div className={`pane${isActive ? ' active' : ''}`} onPointerDown={() => setActivePane(pane.id)}>
			<div className="pane-head">
				<span className="glyph"><Glyph /></span>
				<span className="t">{def.name}</span>
				<span className="sp" />
				<div className="acts">
					<button className="ib sm" title="Split right" onClick={() => splitPane(pane.id, 'row')}><Icon.splitRight /></button>
					<button className="ib sm" title="Split down" onClick={() => splitPane(pane.id, 'col')}><Icon.splitDown /></button>
					<button className="ib sm" title="Maximize (⌘↵)" onClick={() => toggleMax(pane.id)}><Icon.maximize /></button>
					<button className="ib sm" title="Close pane" onClick={() => closePane(pane.id)}><Icon.close /></button>
				</div>
			</div>
			<div className="pane-body">
				<Content paneId={pane.id} />
			</div>
		</div>
	);
}
