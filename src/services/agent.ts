// ---------------------------------------------------------------------------
// Agent — the AI-pair seam (Agents mode).
//
// The AgentBackend interface is exactly what a Claude API backend would
// implement: given the user's message and a context of workspace services, it
// streams text + tool calls. The default LocalAgent is rule-based, but its tool
// calls are REAL — it runs shell commands, reads/writes files, opens them in the
// editor, and scaffolds apps through the same generator the Builder uses. So the
// agent genuinely operates the workspace today; swapping LocalAgent for a model
// backend is a one-line change in the container.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';
import { normalizePath } from './filesystem';
import type { EditorService } from './editorService';
import { ShellService, type Shell } from './shell';
import { generate } from './generator';
import { openFileInActivePane } from '../lib/openFile';
import { uid } from '../lib/tree';

export interface AgentContext {
	fs: IFileSystem;
	editor: EditorService;
	shell: Shell;
}

export interface FileChange {
	path: string;
	added: number;
	removed: number;
}

export type AgentEvent =
	| { type: 'text'; text: string }
	| { type: 'tool'; id: string; tool: string; label: string }
	| { type: 'tool-done'; id: string; status?: 'done' | 'error'; output?: string }
	| { type: 'changes'; files: FileChange[] };

export interface AgentBackend {
	name: string;
	run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent>;
}

const SHELL_CMDS = ['ls', 'cat', 'pwd', 'tree', 'echo', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'cd', 'npm', 'node', 'git', 'yarn', 'pnpm'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A rule-based agent whose tool calls really operate the workspace. */
export class LocalAgent implements AgentBackend {
	name = 'Velocity Agent (local)';

	async *run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent> {
		const text = input.trim();
		const lower = text.toLowerCase();
		let m: RegExpMatchArray | null;

		// Run a shell command (explicit `run …` / `$ …`, or a known command first).
		const firstWord = lower.split(/\s+/)[0];
		if ((m = text.match(/^(?:run|exec|\$)\s+(.+)/i)) || SHELL_CMDS.includes(firstWord)) {
			const cmd = m ? m[1] : text;
			yield { type: 'text', text: `Running \`${cmd}\`.` };
			const id = uid('tool');
			yield { type: 'tool', id, tool: 'terminal', label: `$ ${cmd}` };
			await sleep(180);
			const lines = await ctx.shell.run(cmd);
			const out = lines.map((l) => l.text).join('\n');
			const hasErr = lines.some((l) => l.kind === 'err');
			yield { type: 'tool-done', id, status: hasErr ? 'error' : 'done', output: out };
			return;
		}

		// Scaffold / build an app → the generator (same one the Builder uses).
		if (/\b(build|make|create|generate|scaffold|design)\b/.test(lower) && /\b(app|page|site|website|dashboard|landing|todo|marketplace|blog|saas|tool|ui)\b/.test(lower)) {
			yield { type: 'text', text: `Planning a build for: "${text}". I'll scaffold real files and preview them.` };
			for (const step of ['Choosing a template', 'Scaffolding files', 'Writing styles']) {
				const id = uid('tool');
				yield { type: 'tool', id, tool: 'plan', label: step };
				await sleep(180);
				yield { type: 'tool-done', id };
			}
			const g = generate(text);
			const write = uid('tool');
			yield { type: 'tool', id: write, tool: 'write', label: `Write ${Object.keys(g.files).length} files → builds/${g.slug}/` };
			const changes: FileChange[] = [];
			for (const [path, content] of Object.entries(g.files)) {
				changes.push(await writeTracked(ctx.fs, path, content));
			}
			yield { type: 'tool-done', id: write };
			const entry = `builds/${g.slug}/index.html`;
			const open = uid('tool');
			yield { type: 'tool', id: open, tool: 'open', label: `Open ${entry}` };
			openFileInActivePane(ctx.editor, entry);
			yield { type: 'tool-done', id: open };
			yield { type: 'changes', files: changes };
			yield { type: 'text', text: `## Done\nGenerated a **${g.kind}** into \`builds/${g.slug}/\`. Open the Builder tab to preview it live, or edit the files right here.` };
			return;
		}

		// Open a file in the editor.
		if ((m = text.match(/\bopen\s+([^\s]+)/i))) {
			const path = normalizePath(m[1]);
			const id = uid('tool');
			yield { type: 'tool', id, tool: 'open', label: `Open ${path}` };
			if (await ctx.fs.exists(path)) {
				openFileInActivePane(ctx.editor, path);
				yield { type: 'tool-done', id };
				yield { type: 'text', text: `Opened \`${path}\`.` };
			} else {
				yield { type: 'tool-done', id, status: 'error', output: 'not found' };
				yield { type: 'text', text: `I couldn't find \`${path}\`. Try \`ls\` to see the tree.` };
			}
			return;
		}

		// Create a file (optionally with inline content after "with").
		if ((m = text.match(/(?:create|make|add|new)\s+(?:a\s+)?file\s+([^\s]+)(?:\s+with\s+([\s\S]+))?/i))) {
			const path = normalizePath(m[1]);
			const content = m[2] ? `${m[2].trim()}\n` : '';
			const id = uid('tool');
			yield { type: 'tool', id, tool: 'write', label: `Create ${path}` };
			const change = await writeTracked(ctx.fs, path, content);
			openFileInActivePane(ctx.editor, path);
			yield { type: 'tool-done', id };
			yield { type: 'changes', files: [change] };
			yield { type: 'text', text: `Created \`${path}\` and opened it in the editor.` };
			return;
		}

		// Read / explain a file.
		if ((m = text.match(/\b(?:read|show|cat|explain|describe)\b.*?([\w./-]+\.\w+)/i)) || (m = lower.match(/what\s+(?:does|is)\s+([\w./-]+\.\w+)/))) {
			const path = normalizePath(m[1]);
			const id = uid('tool');
			yield { type: 'tool', id, tool: 'read', label: `Read ${path}` };
			if (!(await ctx.fs.exists(path))) {
				yield { type: 'tool-done', id, status: 'error', output: 'not found' };
				yield { type: 'text', text: `\`${path}\` doesn't exist yet.` };
				return;
			}
			const src = await ctx.fs.readFile(path);
			yield { type: 'tool-done', id, output: src.split('\n').slice(0, 24).join('\n') };
			yield { type: 'text', text: summarize(path, src) };
			return;
		}

		// Search the workspace.
		if ((m = text.match(/\b(?:find|search|grep|where(?:'s| is)?)\b.*?["'`]?([\w.$-]{2,})["'`]?\s*$/i))) {
			const term = m[1];
			const id = uid('tool');
			yield { type: 'tool', id, tool: 'search', label: `Search "${term}"` };
			const hits = await grep(ctx.fs, term);
			yield { type: 'tool-done', id, output: hits.slice(0, 12).join('\n') || 'no matches' };
			yield { type: 'text', text: hits.length ? `Found ${hits.length} match${hits.length === 1 ? '' : 'es'} for \`${term}\`.` : `No matches for \`${term}\`.` };
			return;
		}

		// Fallback: explain what I can do.
		yield {
			type: 'text',
			text:
				"I'm a workspace agent — my actions are real. Try:\n" +
				'• `run npm test` or just `ls` — run commands\n' +
				'• `build a landing page for a coffee shop` — scaffold an app\n' +
				'• `create file src/hooks/useTimer.ts` — write a file\n' +
				'• `open src/App.tsx` — open it in the editor\n' +
				'• `explain src/lib/store.ts` — read & summarize\n' +
				'• `find useTodos` — search the codebase',
		};
	}
}

function summarize(path: string, src: string): string {
	const lines = src.split('\n');
	const imports = lines.filter((l) => /^\s*import\b/.test(l)).length;
	const exports = (src.match(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/g) ?? []).map((e) => e.replace(/.*\s([A-Za-z0-9_]+)$/, '$1'));
	const ext = path.slice(path.lastIndexOf('.') + 1);
	const parts = [`\`${path}\` is ${lines.length} lines of ${ext}.`];
	if (imports) {
		parts.push(`It pulls in ${imports} import${imports === 1 ? '' : 's'}.`);
	}
	if (exports.length) {
		parts.push(`It exports ${exports.slice(0, 6).map((e) => `\`${e}\``).join(', ')}.`);
	}
	return parts.join(' ');
}

/** Write a file and report the diff stats (new lines added, prior lines removed). */
async function writeTracked(fs: IFileSystem, path: string, content: string): Promise<FileChange> {
	const p = normalizePath(path);
	const existed = await fs.exists(p);
	const removed = existed ? (await fs.readFile(p)).split('\n').length : 0;
	await fs.writeFile(p, content);
	return { path: p, added: content.replace(/\n$/, '').split('\n').length, removed: existed ? removed : 0 };
}

async function grep(fs: IFileSystem, term: string): Promise<string[]> {
	const files = await fs.list();
	const hits: string[] = [];
	const needle = term.toLowerCase();
	for (const f of files) {
		const src = await fs.readFile(f);
		const rows = src.split('\n');
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].toLowerCase().includes(needle)) {
				hits.push(`${f}:${i + 1}  ${rows[i].trim().slice(0, 80)}`);
			}
		}
	}
	return hits;
}

// --- Conversation state per pane -----------------------------------------

export interface ToolCall {
	id: string;
	tool: string;
	label: string;
	status: 'running' | 'done' | 'error';
	output?: string;
}

export interface AgentMessage {
	id: string;
	role: 'user' | 'assistant';
	text: string;
	tools: ToolCall[];
	changes?: FileChange[];
	pending?: boolean;
}

const GREETING: AgentMessage = {
	id: 'greeting',
	role: 'assistant',
	text: "I'm your workspace agent. I can run commands, create and open files, scaffold apps, and search — all against this real workspace. What should we build?",
	tools: [],
};

export class AgentService {
	private threads = new Map<string, AgentMessage[]>();
	private busy = new Set<string>();
	private listeners = new Set<() => void>();
	private rev = 0;

	constructor(
		private fs: IFileSystem,
		private editor: EditorService,
		private shells: ShellService,
		public backend: AgentBackend,
	) {}

	thread(paneId: string): AgentMessage[] {
		let t = this.threads.get(paneId);
		if (!t) {
			t = [GREETING];
			this.threads.set(paneId, t);
		}
		return t;
	}

	isBusy(paneId: string): boolean {
		return this.busy.has(paneId);
	}

	async send(paneId: string, input: string): Promise<void> {
		const text = input.trim();
		if (!text || this.busy.has(paneId)) {
			return;
		}
		const asst: AgentMessage = { id: uid('m'), role: 'assistant', text: '', tools: [], pending: true };
		this.threads.set(paneId, [...this.thread(paneId), { id: uid('m'), role: 'user', text, tools: [] }, asst]);
		this.busy.add(paneId);
		this.bump();

		const ctx: AgentContext = { fs: this.fs, editor: this.editor, shell: this.shells.for(`agent:${paneId}`) };
		try {
			for await (const ev of this.backend.run(text, ctx)) {
				this.apply(paneId, asst.id, ev);
				this.bump();
			}
		} catch (e) {
			this.apply(paneId, asst.id, { type: 'text', text: `\n\n_Error: ${e instanceof Error ? e.message : String(e)}_` });
		}
		asst.pending = false;
		this.busy.delete(paneId);
		this.bump();
	}

	release(paneId: string): void {
		this.threads.delete(paneId);
		this.busy.delete(paneId);
		this.shells.release(`agent:${paneId}`);
	}

	private apply(paneId: string, msgId: string, ev: AgentEvent): void {
		const t = this.threads.get(paneId);
		if (!t) {
			return;
		}
		const msg = t.find((x) => x.id === msgId);
		if (!msg) {
			return;
		}
		if (ev.type === 'text') {
			msg.text = msg.text ? `${msg.text}\n\n${ev.text}` : ev.text;
		} else if (ev.type === 'tool') {
			msg.tools.push({ id: ev.id, tool: ev.tool, label: ev.label, status: 'running' });
		} else if (ev.type === 'tool-done') {
			const tc = msg.tools.find((x) => x.id === ev.id);
			if (tc) {
				tc.status = ev.status ?? 'done';
				tc.output = ev.output;
			}
		} else if (ev.type === 'changes') {
			msg.changes = [...(msg.changes ?? []), ...ev.files];
		}
	}

	readonly subscribe = (l: () => void): (() => void) => {
		this.listeners.add(l);
		return () => this.listeners.delete(l);
	};
	readonly getSnapshot = (): number => this.rev;

	private bump(): void {
		this.rev++;
		for (const l of this.listeners) {
			l();
		}
	}
}

// --- React binding --------------------------------------------------------

// Imported lazily to avoid a static import cycle at module-eval time.
import { useServices } from './container';

/** The agent conversation for a pane, re-rendering as events stream in. */
export function useAgentThread(paneId: string): { thread: AgentMessage[]; busy: boolean } {
	const { agent } = useServices();
	useSyncExternalStore(agent.subscribe, agent.getSnapshot);
	return { thread: agent.thread(paneId), busy: agent.isBusy(paneId) };
}
