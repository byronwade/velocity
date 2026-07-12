import { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../lib/icons';
import { useServices } from '../services/container';
import { usePanePath } from '../services/editorService';
import { openFileInActivePane } from '../lib/openFile';
import { useShell } from '../lib/store';

const ITEMS: Array<{ id: string; icon: IconName; label: string }> = [
	{ id: 'files', icon: 'files', label: 'Explorer' },
	{ id: 'search', icon: 'search', label: 'Search' },
	{ id: 'git', icon: 'git', label: 'Source Control' },
	{ id: 'agents', icon: 'agents', label: 'Agents' },
	{ id: 'deploy', icon: 'deploy', label: 'Deployments' },
];

interface TreeNode {
	name: string;
	path: string;
	dir: boolean;
	children: TreeNode[];
}

/** Build a nested folder tree from flat, sorted file paths. */
function buildTree(paths: string[]): TreeNode[] {
	const root: TreeNode = { name: '', path: '', dir: true, children: [] };
	for (const p of paths) {
		const parts = p.split('/');
		let node = root;
		let acc = '';
		parts.forEach((part, i) => {
			acc = acc ? `${acc}/${part}` : part;
			const isFile = i === parts.length - 1;
			let child = node.children.find((c) => c.name === part && c.dir === !isFile);
			if (!child) {
				child = { name: part, path: acc, dir: !isFile, children: [] };
				node.children.push(child);
			}
			node = child;
		});
	}
	const sort = (n: TreeNode) => {
		n.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
		n.children.forEach(sort);
	};
	sort(root);
	return root.children;
}

function Explorer() {
	const { fs, editor } = useServices();
	const [paths, setPaths] = useState<string[]>([]);
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
	const activePaneId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]).activePaneId);
	const openPath = usePanePath(activePaneId);

	useEffect(() => {
		let alive = true;
		const load = () => {
			void fs.list().then((p) => {
				if (alive) {
					setPaths(p);
				}
			});
		};
		load();
		const off = fs.onChange(load);
		return () => {
			alive = false;
			off();
		};
	}, [fs]);

	const tree = useMemo(() => buildTree(paths), [paths]);

	function toggle(path: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}

	function render(nodes: TreeNode[], depth: number): React.ReactNode {
		return nodes.map((n) => {
			const pad = { paddingLeft: `${8 + depth * 14}px` };
			if (n.dir) {
				const isCollapsed = collapsed.has(n.path);
				return (
					<div key={n.path}>
						<button className="row dir" style={pad} onClick={() => toggle(n.path)} aria-expanded={!isCollapsed}>
							<span className={`tw${isCollapsed ? '' : ' open'}`}><Icon.chevron /></span>
							<Icon.files />
							<span className="nm">{n.name}</span>
						</button>
						{!isCollapsed && render(n.children, depth + 1)}
					</div>
				);
			}
			const selected = n.path === openPath;
			return (
				<button
					key={n.path}
					className={`row file${selected ? ' sel' : ''}`}
					style={pad}
					title={n.path}
					aria-current={selected ? 'true' : undefined}
					onClick={() => openFileInActivePane(editor, n.path)}
				>
					<Icon.file />
					<span className="nm">{n.name}</span>
				</button>
			);
		});
	}

	return <div className="tree">{render(tree, 0)}</div>;
}

export function Sidebar() {
	const [active, setActive] = useState('files');
	const label = ITEMS.find((i) => i.id === active)?.label ?? '';
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
				<div className="ph">{label}</div>
				{active === 'files' ? <Explorer /> : <div className="panel-empty">No {label.toLowerCase()} yet.</div>}
			</div>
		</aside>
	);
}
