import { useShell } from '../lib/store';
import { leaves } from '../lib/tree';
import { Icon } from '../lib/icons';

export function StatusBar() {
	const tabs = useShell((s) => s.tabs);
	const activeTabId = useShell((s) => s.activeTabId);
	const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const paneCount = leaves(tab.tree).length;

	return (
		<div className="status">
			<span className="i btn-like"><Icon.git />main</span>
			<span className="i perf">◉ 120fps · 38MB</span>
			<span className="i"><Icon.check />typecheck</span>
			<span className="i">{paneCount} pane{paneCount === 1 ? '' : 's'} · {tabs.length} tab{tabs.length === 1 ? '' : 's'}</span>
			<span className="i">3 collaborators live</span>
			<span className="push i">Velocity 0.1 · open source</span>
			<span className="i">Ln 10, Col 20</span>
		</div>
	);
}
