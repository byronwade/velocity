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
import { addMemory, getMemories } from './memory';
import { openFileInActivePane } from '../lib/openFile';
import { uid } from '../lib/tree';

export interface ChatMsg {
	role: 'user' | 'assistant';
	content: string;
}

export interface AgentContext {
	fs: IFileSystem;
	editor: EditorService;
	shell: Shell;
	/** Prior conversation turns (text only), oldest first — for model backends. */
	history: ChatMsg[];
}

export interface FileChange {
	path: string;
	added: number;
	removed: number;
}

export type AgentEvent =
	| { type: 'text'; text: string }
	| { type: 'text-delta'; text: string }
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

		// Save a durable memory.
		if ((m = text.match(/^remember(?:\s+that)?\s+(.+)/i))) {
			const note = m[1].trim();
			addMemory(note);
			yield { type: 'tool', id: uid('tool'), tool: 'plan', label: `Remember "${note.slice(0, 40)}"` };
			yield { type: 'text', text: `Got it — I'll remember that: "${note}".` };
			return;
		}
		// Recall memories.
		if (/^(what do you remember|list memor|show memor|what.s in memor)/i.test(lower)) {
			const notes = getMemories();
			yield { type: 'text', text: notes.length ? `I remember:\n${notes.map((n) => `• ${n.text}`).join('\n')}` : "I don't have any saved memories yet. Tell me to “remember …” and I'll keep it." };
			return;
		}

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

/** Compaction thresholds: fold older turns once a thread grows past this. */
const CONTEXT_LIMIT_CHARS = 24000; // ≈ 6k tokens
const KEEP_RECENT = 6;

export class AgentService {
	private threads = new Map<string, AgentMessage[]>();
	private busy = new Set<string>();
	private queues = new Map<string, string[]>();
	private listeners = new Set<() => void>();
	private rev = 0;

	constructor(
		private fs: IFileSystem,
		private editor: EditorService,
		private shells: ShellService,
		public backend: AgentBackend,
		/** Resolves the active backend at send time (e.g. Local vs Ollama). */
		private resolve?: () => AgentBackend,
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

	/** Queued follow-ups waiting to run after the current turn. */
	queued(paneId: string): string[] {
		return this.queues.get(paneId) ?? [];
	}

	/** Approximate context usage of a thread (chars ≈ 4 chars/token). */
	contextInfo(paneId: string): { tokens: number; pct: number } {
		const chars = this.thread(paneId).reduce((n, m) => n + m.text.length + m.tools.reduce((a, t) => a + t.label.length + (t.output?.length ?? 0), 0), 0);
		return { tokens: Math.round(chars / 4), pct: Math.min(100, Math.round((chars / CONTEXT_LIMIT_CHARS) * 100)) };
	}

	/** Automatic compaction: once a thread gets long, fold older turns into a
	 *  one-line summary so the model context (and the UI) stays bounded. */
	private compact(paneId: string): void {
		const t = this.thread(paneId);
		const chars = t.reduce((n, m) => n + m.text.length, 0);
		if (chars < CONTEXT_LIMIT_CHARS || t.length <= KEEP_RECENT + 2) return;
		const head = t[0]?.id === 'greeting' ? [t[0]] : [];
		const tail = t.slice(-KEEP_RECENT);
		const dropped = t.slice(head.length, t.length - KEEP_RECENT);
		if (dropped.length <= 0) return;
		const files = new Set<string>();
		for (const m of dropped) for (const c of m.changes ?? []) files.add(c.path);
		const summary: AgentMessage = {
			id: uid('m'), role: 'assistant', tools: [],
			text: `_Compacted ${dropped.length} earlier message${dropped.length === 1 ? '' : 's'} to save context${files.size ? ` · touched ${[...files].slice(0, 6).join(', ')}` : ''}._`,
		};
		this.threads.set(paneId, [...head, summary, ...tail]);
		this.bump();
	}

	async send(paneId: string, input: string): Promise<void> {
		const text = input.trim();
		if (!text) {
			return;
		}
		// While a turn is running, a follow-up is queued and dispatched after.
		if (this.busy.has(paneId)) {
			this.queues.set(paneId, [...(this.queues.get(paneId) ?? []), text]);
			this.bump();
			return;
		}
		// Keep context bounded before we build history for the model.
		this.compact(paneId);
		// Snapshot prior turns (text only) as history for a model backend.
		const history: ChatMsg[] = this.thread(paneId)
			.filter((m) => m.id !== 'greeting' && m.text.trim())
			.map((m) => ({ role: m.role, content: m.text }));
		const asst: AgentMessage = { id: uid('m'), role: 'assistant', text: '', tools: [], pending: true };
		this.threads.set(paneId, [...this.thread(paneId), { id: uid('m'), role: 'user', text, tools: [] }, asst]);
		this.busy.add(paneId);
		this.bump();

		const ctx: AgentContext = { fs: this.fs, editor: this.editor, shell: this.shells.for(`agent:${paneId}`), history };
		const backend = this.resolve?.() ?? this.backend;
		try {
			for await (const ev of backend.run(text, ctx)) {
				this.apply(paneId, asst.id, ev);
				this.bump();
			}
		} catch (e) {
			this.apply(paneId, asst.id, { type: 'text', text: `\n\n_Error: ${e instanceof Error ? e.message : String(e)}_` });
		}
		this.patch(paneId, asst.id, (m) => ({ ...m, pending: false }));
		this.busy.delete(paneId);
		this.bump();

		// Dispatch the next queued follow-up, if any.
		const q = this.queues.get(paneId);
		if (q && q.length) {
			const [next, ...rest] = q;
			if (rest.length) this.queues.set(paneId, rest); else this.queues.delete(paneId);
			this.bump();
			void this.send(paneId, next);
		}
	}

	release(paneId: string): void {
		this.threads.delete(paneId);
		this.busy.delete(paneId);
		this.shells.release(`agent:${paneId}`);
	}

	/** Immutably replace one message in a thread: new message object + new
	 *  array, untouched messages keep their reference. This lets the UI wrap
	 *  each message in React.memo so only the changed (streaming) message
	 *  re-renders, not the whole conversation. */
	private patch(paneId: string, msgId: string, fn: (m: AgentMessage) => AgentMessage): void {
		const t = this.threads.get(paneId);
		if (!t) {
			return;
		}
		const idx = t.findIndex((x) => x.id === msgId);
		if (idx === -1) {
			return;
		}
		const arr = t.slice();
		arr[idx] = fn(t[idx]);
		this.threads.set(paneId, arr);
	}

	private apply(paneId: string, msgId: string, ev: AgentEvent): void {
		this.patch(paneId, msgId, (msg) => {
			if (ev.type === 'text') {
				return { ...msg, text: msg.text ? `${msg.text}\n\n${ev.text}` : ev.text };
			}
			if (ev.type === 'text-delta') {
				return { ...msg, text: msg.text + ev.text };
			}
			if (ev.type === 'tool') {
				return { ...msg, tools: [...msg.tools, { id: ev.id, tool: ev.tool, label: ev.label, status: 'running' as const }] };
			}
			if (ev.type === 'tool-done') {
				return { ...msg, tools: msg.tools.map((tc) => tc.id === ev.id ? { ...tc, status: ev.status ?? 'done', output: ev.output } : tc) };
			}
			if (ev.type === 'changes') {
				return { ...msg, changes: [...(msg.changes ?? []), ...ev.files] };
			}
			return msg;
		});
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
export function useAgentThread(paneId: string): { thread: AgentMessage[]; busy: boolean; queued: string[]; context: { tokens: number; pct: number } } {
	const { agent } = useServices();
	useSyncExternalStore(agent.subscribe, agent.getSnapshot);
	return { thread: agent.thread(paneId), busy: agent.isBusy(paneId), queued: agent.queued(paneId), context: agent.contextInfo(paneId) };
}
