// ---------------------------------------------------------------------------
// WorkFiles — a slim, collapsible file tree for the Code surface.
//
// The old shell exposed the workspace tree through a full activity-rail sidebar;
// the workstream shell has no rail, so the tree lives inside the Code artifact
// instead. It reads the same in-memory filesystem and binds a clicked file
// straight into the editor pane (`editor.bindPane`) that the surface renders.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, File as FileIcon, Folder, FolderOpen } from 'lucide-react';
import { useServices } from '../services/container';
import { usePanePath } from '../services/editorService';

interface Node {
	name: string;
	path: string;
	dir: boolean;
	children: Node[];
}

function buildTree(files: string[], dirs: string[]): Node[] {
	const root: Node = { name: '', path: '', dir: true, children: [] };
	const ensure = (path: string): Node => {
		let node = root;
		let acc = '';
		for (const part of path.split('/')) {
			acc = acc ? `${acc}/${part}` : part;
			let child = node.children.find((entry) => entry.name === part && entry.dir);
			if (!child) {
				child = { name: part, path: acc, dir: true, children: [] };
				node.children.push(child);
			}
			node = child;
		}
		return node;
	};
	for (const dir of dirs) if (dir) ensure(dir);
	for (const file of files) {
		const slash = file.lastIndexOf('/');
		const parent = slash === -1 ? root : ensure(file.slice(0, slash));
		parent.children.push({ name: slash === -1 ? file : file.slice(slash + 1), path: file, dir: false, children: [] });
	}
	const sort = (node: Node) => {
		node.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
		node.children.forEach(sort);
	};
	sort(root);
	return root.children;
}

interface RowProps {
	node: Node;
	depth: number;
	openPath: string | undefined;
	collapsed: Set<string>;
	onToggle: (path: string) => void;
	onOpen: (path: string) => void;
}

function Row({ node, depth, openPath, collapsed, onToggle, onOpen }: RowProps) {
	const pad = { paddingLeft: 10 + depth * 12 };
	if (node.dir) {
		const isCollapsed = collapsed.has(node.path);
		return (
			<>
				<button className="vw-file-row dir" style={pad} onClick={() => onToggle(node.path)}>
					<span className="vw-file-caret">{isCollapsed ? <ChevronRight /> : <ChevronDown />}</span>
					{isCollapsed ? <Folder /> : <FolderOpen />}
					<span className="vw-file-name">{node.name}</span>
				</button>
				{!isCollapsed && node.children.map((child) => (
					<Row key={child.path} node={child} depth={depth + 1} openPath={openPath} collapsed={collapsed} onToggle={onToggle} onOpen={onOpen} />
				))}
			</>
		);
	}
	return (
		<button className={`vw-file-row file${openPath === node.path ? ' active' : ''}`} style={pad} onClick={() => onOpen(node.path)}>
			<span className="vw-file-caret" aria-hidden />
			<FileIcon />
			<span className="vw-file-name">{node.name}</span>
		</button>
	);
}

export function WorkFiles({ paneId }: { paneId: string }) {
	const { fs, editor } = useServices();
	const [files, setFiles] = useState<string[]>([]);
	const [dirs, setDirs] = useState<string[]>([]);
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
	const openPath = usePanePath(paneId);

	useEffect(() => {
		let alive = true;
		const load = () => void Promise.all([fs.list(), fs.directories()]).then(([nextFiles, nextDirs]) => {
			if (alive) { setFiles(nextFiles); setDirs(nextDirs); }
		});
		load();
		const off = fs.onChange(load);
		return () => { alive = false; off(); };
	}, [fs]);

	const tree = useMemo(() => buildTree(files, dirs), [files, dirs]);
	const toggle = (path: string) => setCollapsed((current) => {
		const next = new Set(current);
		if (next.has(path)) next.delete(path); else next.add(path);
		return next;
	});
	const open = (path: string) => void editor.bindPane(paneId, path);

	return (
		<div className="vw-files">
			<div className="vw-files-head">Files</div>
			<div className="vw-files-tree">
				{tree.map((node) => (
					<Row key={node.path} node={node} depth={0} openPath={openPath} collapsed={collapsed} onToggle={toggle} onOpen={open} />
				))}
			</div>
		</div>
	);
}
