// Universal command input (⌘K / Ctrl-K).
//
// One surface over the whole system — the document's thesis that search, the
// command palette, navigation, and the AI input should be a single consistent
// input. It reads the shared project graph for objects (files, components,
// routes, endpoints…), offers app/navigation commands, and can hand any prompt
// straight to the active workspace's agent. Every action here is real.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useShell } from '../lib/store';
import { useServices } from '../services/container';
import { useGraph } from '../services/graph';
import { groupByKind, KIND_LABEL, type GraphKind, type GraphNode } from '../lib/graph';
import { openFileInActivePane } from '../lib/openFile';
import { getEditorPrefs, setEditorPrefs } from '../services/editorPrefs';
import { Icon, type IconName } from '../lib/icons';
import { allCommands } from '../keybindings/commands';
import { bindingsForCommand } from '../keybindings/service';
import { formatKeybinding } from '../keybindings/keys';

interface Action {
	id: string;
	title: string;
	subtitle?: string;
	/** Extra terms to match/rank against (e.g. a mode's short name). */
	keywords?: string;
	/** Effective keybinding, shown right-aligned like VS Code's palette. */
	keybinding?: string;
	icon: IconName;
	group: string;
	run: () => void;
}

// Icon per command category, so the Commands group reads at a glance.
const CATEGORY_ICON: Record<string, IconName> = {
	Editor: 'file', 'Editor Folding': 'file', File: 'file', View: 'panelLeft',
	Workbench: 'command', Preferences: 'settings', Terminal: 'command', Go: 'search',
};

const KIND_ICON: Record<GraphKind, IconName> = {
	project: 'home', file: 'file', component: 'builder', route: 'browser',
	endpoint: 'command', table: 'files', test: 'check', deployment: 'rocket',
	agent: 'agents', task: 'diff',
};

export function CommandPalette() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const graph = useGraph();
	const services = useServices();

	// Opened by the `workbench.action.showCommands` command (⌘⇧P by default),
	// which the central keybinding service dispatches as this event.
	useEffect(() => {
		const open = () => setOpen(true);
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		window.addEventListener('velocity:command-palette', open);
		window.addEventListener('keydown', onKey);
		return () => { window.removeEventListener('velocity:command-palette', open); window.removeEventListener('keydown', onKey); };
	}, []);

	useEffect(() => {
		if (open) {
			setQuery('');
			setActive(0);
			// Focus after the element mounts.
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	const actions = useMemo<Action[]>(() => {
		const s = useShell.getState();
		const activeTab = s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
		const project = s.projects.find((p) => p.id === activeTab?.projectId);
		const brainKey = `proj:${project?.id ?? 'none'}`;
		const out: Action[] = [];

		// 1) Hand the prompt to the agent (only meaningful with text).
		if (query.trim()) {
			out.push({
				id: 'ask-agent',
				title: `Ask the agent: “${query.trim()}”`,
				subtitle: project ? `${project.name} · local agent` : 'local agent',
				icon: 'sparkle',
				group: 'Agent',
				run: () => { void services.agent.send(brainKey, query.trim()); },
			});
		}

		// 2) Surfaces (Code, Terminal, Database, …) are registered as real
		// commands (velocity.open.*) and flow in through the command list below,
		// so the workstream shell — not the retired cockpit rail — drives them.

		// 3) Open any object from the project graph.
		for (const g of groupByKind(graph)) {
			if (g.kind === 'project') continue;
			for (const n of g.nodes) {
				out.push({
					id: n.id,
					title: n.label,
					subtitle: n.path ?? KIND_LABEL[n.kind],
					icon: KIND_ICON[n.kind],
					group: KIND_LABEL[n.kind],
					run: () => openNode(services.editor, n),
				});
			}
		}

		// 4) Jump between workspaces (projects).
		for (const p of s.projects) {
			out.push({
				id: `proj-${p.id}`,
				title: `Open ${p.name}`,
				subtitle: 'Workspace',
				icon: 'home',
				group: 'Workspaces',
				run: () => useShell.getState().setActiveProject(p.id),
			});
		}

		// 5) Editor preferences.
		out.push({
			id: 'toggle-format-on-save',
			title: getEditorPrefs().formatOnSave ? 'Disable format on save' : 'Enable format on save',
			subtitle: 'Prettier · ⇧⌥F to format now',
			keywords: 'prettier format save autoformat beautify',
			icon: 'sparkle',
			group: 'Editor',
			run: () => setEditorPrefs({ formatOnSave: !getEditorPrefs().formatOnSave }),
		});

		// 5b) Every registered command — the true VS Code-style palette. Each shows
		// its effective keybinding right-aligned and runs the real handler.
		for (const cmd of allCommands()) {
			const kb = bindingsForCommand(cmd.id)[0];
			out.push({
				id: `cmd:${cmd.id}`,
				title: cmd.title,
				keywords: `${cmd.id} ${cmd.category ?? ''}`,
				keybinding: kb ? formatKeybinding(kb.chords) : undefined,
				icon: CATEGORY_ICON[cmd.category ?? ''] ?? 'command',
				group: cmd.category ?? 'Commands',
				run: () => cmd.run(),
			});
		}

		// 6) System commands. Reset discards persisted edits and re-seeds — the
		// escape hatch now that the workspace survives reloads.
		out.push({
			id: 'reset-workspace',
			title: 'Reset workspace to seed',
			subtitle: 'Discards saved edits',
			keywords: 'reset clear wipe restore defaults persistence',
			icon: 'reload',
			group: 'System',
			run: () => {
				const ok = typeof window === 'undefined' || window.confirm('Reset the workspace? All saved edits and created files will be discarded and the seed project restored.');
				if (ok) void services.fs.reset();
			},
		});

		return out;
	}, [graph, query, services]);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		const matches = (a: Action) => a.id === 'ask-agent' || a.title.toLowerCase().includes(q) || a.keywords?.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q);
		const list = q ? actions.filter(matches).sort((a, b) => rank(a, q) - rank(b, q)) : actions;
		return list.slice(0, 50);
	}, [actions, query]);

	useEffect(() => { setActive(0); }, [query]);

	if (!open) {
		return null;
	}

	function choose(a: Action | undefined) {
		if (!a) return;
		a.run();
		setOpen(false);
	}

	function onInputKey(e: React.KeyboardEvent) {
		if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
		else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
	}

	// Group consecutive results by their group label for section headers.
	let lastGroup = '';

	return (
		<div className="cmdk-scrim" onMouseDown={() => setOpen(false)}>
			<div className="cmdk" role="dialog" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
				<div className="cmdk-input">
					<Icon.search />
					<input
						ref={inputRef}
						value={query}
						placeholder="Search files, run commands, or ask the agent…"
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onInputKey}
					/>
					<kbd>esc</kbd>
				</div>
				<div className="cmdk-list">
					{results.length === 0 && <div className="cmdk-empty">No matches.</div>}
					{results.map((a, i) => {
						const header = a.group !== lastGroup ? <div className="cmdk-group" key={`g-${a.group}-${i}`}>{a.group}</div> : null;
						lastGroup = a.group;
						const Glyph = Icon[a.icon];
						return (
							<div key={`grp-wrap-${a.id}`}>
								{header}
								<button
									className={`cmdk-row${i === active ? ' on' : ''}`}
									onMouseEnter={() => setActive(i)}
									onClick={() => choose(a)}
								>
									<span className="cmdk-ic"><Glyph /></span>
									<span className="cmdk-title">{a.title}</span>
									{a.subtitle && <span className="cmdk-sub">{a.subtitle}</span>}
									{a.keybinding && <span className="cmdk-kbd">{a.keybinding}</span>}
								</button>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function openNode(editor: ReturnType<typeof useServices>['editor'], n: GraphNode) {
	// File, component, route and endpoint nodes all carry the file they live in;
	// opening it focuses the source. Nodes without a path (agents, tables) select only.
	if (n.path) {
		openFileInActivePane(editor, n.path);
	}
}

/** Lower is better. Exact/prefix matches win; "ask the agent" sits below them
 *  (rank 2) so typing a mode or file name navigates on Enter, but still appears
 *  as a fallback when nothing else matches strongly. */
function rank(a: Action, q: string): number {
	if (a.id === 'ask-agent') return 2;
	const fields = [a.title, a.keywords, a.subtitle].filter(Boolean).map((f) => f!.toLowerCase());
	let best = 9;
	for (const f of fields) {
		if (f === q) best = Math.min(best, 0);
		else if (f.startsWith(q)) best = Math.min(best, 1);
		else if (f.includes(q)) best = Math.min(best, 3);
	}
	return best;
}
