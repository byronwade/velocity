import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '../lib/icons';
import { useServices } from '../services/container';
import { usePanePath } from '../services/editorService';
import { openFileInActivePane } from '../lib/openFile';
import { useShell } from '../lib/store';
import type { IFileSystem } from '../services/filesystem';

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

/** Ensure a directory node (and its ancestors) exists in the tree; return it. */
function ensureDir(root: TreeNode, path: string): TreeNode {
	let node = root;
	let acc = '';
	for (const part of path.split('/')) {
		acc = acc ? `${acc}/${part}` : part;
		let child = node.children.find((c) => c.name === part && c.dir);
		if (!child) {
			child = { name: part, path: acc, dir: true, children: [] };
			node.children.push(child);
		}
		node = child;
	}
	return node;
}

/** Build a nested tree from flat file paths plus any (possibly empty) dirs. */
function buildTree(files: string[], dirs: string[]): TreeNode[] {
	const root: TreeNode = { name: '', path: '', dir: true, children: [] };
	for (const d of dirs) {
		if (d) {
			ensureDir(root, d);
		}
	}
	for (const p of files) {
		const slash = p.lastIndexOf('/');
		const parent = slash === -1 ? root : ensureDir(root, p.slice(0, slash));
		const name = slash === -1 ? p : p.slice(slash + 1);
		if (!parent.children.some((c) => c.name === name && !c.dir)) {
			parent.children.push({ name, path: p, dir: false, children: [] });
		}
	}
	const sort = (n: TreeNode) => {
		n.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
		n.children.forEach(sort);
	};
	sort(root);
	return root.children;
}

type CtxHandler = (node: TreeNode, e: React.MouseEvent) => void;

// One file row. Memoized on primitive/stable props — switching the open file
// only re-renders the two rows whose `selected` flips, not the whole tree.
const FileRow = memo(function FileRow({ node, depth, selected, onOpen, onContext }: {
	node: TreeNode; depth: number; selected: boolean; onOpen: (path: string) => void; onContext: CtxHandler;
}) {
	return (
		<button
			className={`row file${selected ? ' sel' : ''}`}
			style={{ paddingLeft: `${8 + depth * 14}px` }}
			title={node.path}
			aria-current={selected ? 'true' : undefined}
			onClick={() => onOpen(node.path)}
			onContextMenu={(e) => onContext(node, e)}
		>
			<span className="tw" aria-hidden />
			<Icon.file />
			<span className="nm">{node.name}</span>
		</button>
	);
});

// One directory row (the button only; children are rendered by the level).
const DirRow = memo(function DirRow({ node, depth, collapsed, onToggle, onContext }: {
	node: TreeNode; depth: number; collapsed: boolean; onToggle: (path: string) => void; onContext: CtxHandler;
}) {
	return (
		<button className="row dir" style={{ paddingLeft: `${8 + depth * 14}px` }} onClick={() => onToggle(node.path)} onContextMenu={(e) => onContext(node, e)} aria-expanded={!collapsed}>
			<span className={`tw${collapsed ? '' : ' open'}`}><Icon.chevron /></span>
			<Icon.files />
			<span className="nm">{node.name}</span>
		</button>
	);
});

/** Recursive level. Re-renders on collapse/selection changes, but its memoized
 *  row children skip work when their own props are unchanged. */
function Level({ nodes, depth, collapsed, openPath, onToggle, onOpen, onContext }: {
	nodes: TreeNode[]; depth: number; collapsed: Set<string>; openPath: string | undefined;
	onToggle: (path: string) => void; onOpen: (path: string) => void; onContext: CtxHandler;
}): React.ReactElement {
	return (
		<>
			{nodes.map((n) => n.dir ? (
				<div key={n.path}>
					<DirRow node={n} depth={depth} collapsed={collapsed.has(n.path)} onToggle={onToggle} onContext={onContext} />
					{!collapsed.has(n.path) && (
						<Level nodes={n.children} depth={depth + 1} collapsed={collapsed} openPath={openPath} onToggle={onToggle} onOpen={onOpen} onContext={onContext} />
					)}
				</div>
			) : (
				<FileRow key={n.path} node={n} depth={depth} selected={n.path === openPath} onOpen={onOpen} onContext={onContext} />
			))}
		</>
	);
}

// --- file operations (create / rename / delete over the real FS) -----------
async function createFile(fs: IFileSystem, dir: string): Promise<string | null> {
	const name = window.prompt(`New file in ${dir || 'root'}:`, 'untitled.ts');
	if (!name) return null;
	const path = dir ? `${dir}/${name}` : name;
	if (await fs.exists(path)) { window.alert(`${path} already exists`); return null; }
	await fs.writeFile(path, '');
	return path;
}
async function createFolder(fs: IFileSystem, dir: string): Promise<void> {
	const name = window.prompt(`New folder in ${dir || 'root'}:`, 'new-folder');
	if (!name) return;
	await fs.mkdir(dir ? `${dir}/${name}` : name);
}
async function renameNode(fs: IFileSystem, node: TreeNode): Promise<string | null> {
	const next = window.prompt('Rename to:', node.name);
	if (!next || next === node.name) return null;
	const slash = node.path.lastIndexOf('/');
	const parent = slash === -1 ? '' : node.path.slice(0, slash);
	const dest = parent ? `${parent}/${next}` : next;
	if (node.dir) {
		for (const f of await fs.list()) {
			if (f === node.path || f.startsWith(`${node.path}/`)) {
				await fs.writeFile(dest + f.slice(node.path.length), await fs.readFile(f));
			}
		}
		await fs.delete(node.path);
		return null;
	}
	await fs.writeFile(dest, await fs.readFile(node.path));
	await fs.delete(node.path);
	return dest;
}
async function deleteNode(fs: IFileSystem, node: TreeNode): Promise<void> {
	if (!window.confirm(`Delete ${node.dir ? 'folder' : 'file'} "${node.name}"? This cannot be undone.`)) return;
	await fs.delete(node.path);
}

export function Explorer() {
	const { fs, editor } = useServices();
	const [files, setFiles] = useState<string[]>([]);
	const [dirs, setDirs] = useState<string[]>([]);
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
	const activePaneId = useShell((s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]).activePaneId);
	const openPath = usePanePath(activePaneId);

	useEffect(() => {
		let alive = true;
		const load = () => {
			void Promise.all([fs.list(), fs.directories()]).then(([f, d]) => {
				if (alive) {
					setFiles(f);
					setDirs(d);
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

	const tree = useMemo(() => buildTree(files, dirs), [files, dirs]);
	const [menu, setMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);

	// Stable callbacks so the memoized rows never invalidate on re-render.
	const toggle = useCallback((path: string) => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}, []);
	const openFile = useCallback((path: string) => openFileInActivePane(editor, path), [editor]);
	const onContext = useCallback((node: TreeNode, e: React.MouseEvent) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY, node });
	}, []);

	useEffect(() => {
		if (!menu) return;
		const close = () => setMenu(null);
		document.addEventListener('mousedown', close);
		document.addEventListener('scroll', close, true);
		return () => { document.removeEventListener('mousedown', close); document.removeEventListener('scroll', close, true); };
	}, [menu]);

	async function act(kind: 'newFile' | 'newFolder' | 'rename' | 'delete', node: TreeNode) {
		setMenu(null);
		const dir = node.dir ? node.path : (node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : '');
		if (kind === 'newFile') { const p = await createFile(fs, dir); if (p) openFileInActivePane(editor, p); }
		else if (kind === 'newFolder') { await createFolder(fs, dir); }
		else if (kind === 'rename') { const p = await renameNode(fs, node); if (p) openFileInActivePane(editor, p); }
		else if (kind === 'delete') { await deleteNode(fs, node); }
	}

	return (
		<div className="tree-wrap">
			<div className="tree-head">
				<span className="th-title">Explorer</span>
				<span className="sp" />
				<button className="th-btn" title="New file" aria-label="New file" onClick={() => act('newFile', { name: '', path: '', dir: true, children: [] })}><Icon.file /><Icon.plus /></button>
				<button className="th-btn" title="New folder" aria-label="New folder" onClick={() => act('newFolder', { name: '', path: '', dir: true, children: [] })}><Icon.files /></button>
				<button className="th-btn" title="Collapse all" aria-label="Collapse all" onClick={() => setCollapsed(new Set(dirs))}><Icon.chevron /></button>
			</div>
			<div className="tree">
				<Level nodes={tree} depth={0} collapsed={collapsed} openPath={openPath} onToggle={toggle} onOpen={openFile} onContext={onContext} />
			</div>
			{menu && createPortal(
				<div className="ctxmenu" style={{ left: menu.x, top: menu.y }} onMouseDown={(e) => e.stopPropagation()}>
					{menu.node.dir && <button onMouseDown={() => act('newFile', menu.node)}><Icon.file />New file</button>}
					{menu.node.dir && <button onMouseDown={() => act('newFolder', menu.node)}><Icon.files />New folder</button>}
					{menu.node.dir && <div className="ctx-sep" />}
					<button onMouseDown={() => act('rename', menu.node)}><Icon.editor />Rename</button>
					<button className="danger" onMouseDown={() => act('delete', menu.node)}><Icon.close />Delete</button>
				</div>,
				document.body,
			)}
		</div>
	);
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
