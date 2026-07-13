// ---------------------------------------------------------------------------
// Agent tools — the capabilities any model backend can call to operate the
// workspace. Each tool has a JSON-Schema signature (OpenAI/Ollama compatible)
// and a real executor over the AgentContext. The LocalAgent triggers these by
// rule; a model backend (Ollama, Claude) requests them by name via tool-calls.
// This is the shared surface for "tooling / computer use / browser use".
// ---------------------------------------------------------------------------

import type { AgentContext } from './agent';
import { normalizePath } from './filesystem';
import { openFileInActivePane } from '../lib/openFile';
import { addMemory } from './memory';

export interface ToolDef {
	name: string;
	description: string;
	parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
	run(args: Record<string, unknown>, ctx: AgentContext): Promise<string>;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export const TOOLS: ToolDef[] = [
	{
		name: 'list_files',
		description: 'List every file path in the workspace. Use this to understand the project structure before reading or editing.',
		parameters: { type: 'object', properties: {} },
		async run(_args, ctx) {
			const files = await ctx.fs.list();
			return files.join('\n') || '(empty workspace)';
		},
	},
	{
		name: 'read_file',
		description: 'Read a file\'s contents. Returns the full text (large files are truncated).',
		parameters: { type: 'object', properties: { path: { type: 'string', description: 'Workspace-relative file path' } }, required: ['path'] },
		async run(args, ctx) {
			const p = normalizePath(str(args.path));
			if (!(await ctx.fs.exists(p))) return `Error: no such file '${p}'`;
			const src = await ctx.fs.readFile(p);
			return src.length > 12000 ? `${src.slice(0, 12000)}\n… (truncated)` : src;
		},
	},
	{
		name: 'write_file',
		description: 'Create or overwrite a file with the given contents, and open it in the editor. Parent directories are created automatically.',
		parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
		async run(args, ctx) {
			const p = normalizePath(str(args.path));
			await ctx.fs.writeFile(p, str(args.content));
			openFileInActivePane(ctx.editor, p);
			return `Wrote ${p} (${str(args.content).split('\n').length} lines).`;
		},
	},
	{
		name: 'search',
		description: 'Search the whole workspace for a substring. Returns matching file:line locations.',
		parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
		async run(args, ctx) {
			const needle = str(args.query).toLowerCase();
			if (!needle) return 'Error: empty query';
			const files = await ctx.fs.list();
			const hits: string[] = [];
			for (const f of files) {
				const rows = (await ctx.fs.readFile(f)).split('\n');
				rows.forEach((r, i) => { if (r.toLowerCase().includes(needle)) hits.push(`${f}:${i + 1}: ${r.trim().slice(0, 100)}`); });
				if (hits.length > 40) break;
			}
			return hits.join('\n') || '(no matches)';
		},
	},
	{
		name: 'run_command',
		description: 'Run a shell command in the workspace (ls, cat, grep, mkdir, rm, mv, cp, echo, node, npm, git…). Real: it mutates the workspace filesystem.',
		parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
		async run(args, ctx) {
			const lines = await ctx.shell.run(str(args.command));
			return lines.map((l) => l.text).join('\n') || '(no output)';
		},
	},
	{
		name: 'open_file',
		description: 'Open a file in the editor for the user to see.',
		parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
		async run(args, ctx) {
			const p = normalizePath(str(args.path));
			if (!(await ctx.fs.exists(p))) return `Error: no such file '${p}'`;
			openFileInActivePane(ctx.editor, p);
			return `Opened ${p} in the editor.`;
		},
	},
	{
		name: 'navigate_browser',
		description: 'Point the in-app browser at a URL (browser use / computer use). Use "localhost:3000" to open the live app preview.',
		parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
		async run(args) {
			const url = str(args.url);
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('velocity:navigate', { detail: { url } }));
			}
			return `Navigated the browser to ${url}.`;
		},
	},
	{
		name: 'remember',
		description: 'Save a durable note about the user or project that you should recall in future conversations (preferences, decisions, conventions).',
		parameters: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] },
		async run(args) {
			const note = str(args.note).trim();
			if (!note) return 'Error: empty note';
			addMemory(note);
			return `Remembered: "${note}"`;
		},
	},
	{
		name: 'index_project',
		description: 'Get a symbol index of the project: each source file with its exported functions/components/types. Use this to locate code before editing.',
		parameters: { type: 'object', properties: {} },
		async run(_args, ctx) {
			return await projectIndex(ctx);
		},
	},
];

/** A compact symbol index: source files with their exported symbols. */
export async function projectIndex(ctx: AgentContext): Promise<string> {
	const files = (await ctx.fs.list()).filter((f) => /\.(tsx?|jsx?)$/.test(f));
	const out: string[] = [];
	for (const f of files) {
		let src: string;
		try { src = await ctx.fs.readFile(f); } catch { continue; }
		const symbols = [...src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
		out.push(symbols.length ? `${f}: ${symbols.join(', ')}` : f);
	}
	return out.join('\n') || '(no source files)';
}

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/** Tool schemas in OpenAI/Ollama function-calling format. */
export function toolSchemas(): Array<{ type: 'function'; function: { name: string; description: string; parameters: unknown } }> {
	return TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

/** Execute a tool by name; never throws (returns an error string instead). */
export async function runTool(name: string, args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
	const tool = BY_NAME.get(name);
	if (!tool) return `Error: unknown tool '${name}'`;
	try {
		return await tool.run(args ?? {}, ctx);
	} catch (e) {
		return `Error running ${name}: ${e instanceof Error ? e.message : String(e)}`;
	}
}

/** A concise, human-readable label for a tool call (for the UI tool cards). */
export function toolLabel(name: string, args: Record<string, unknown>): string {
	switch (name) {
		case 'read_file': return `Read ${str(args.path)}`;
		case 'write_file': return `Write ${str(args.path)}`;
		case 'open_file': return `Open ${str(args.path)}`;
		case 'search': return `Search "${str(args.query)}"`;
		case 'run_command': return `$ ${str(args.command)}`;
		case 'navigate_browser': return `Browse ${str(args.url)}`;
		case 'list_files': return 'List files';
		case 'index_project': return 'Index project';
		case 'remember': return `Remember "${str(args.note).slice(0, 40)}"`;
		default: return name;
	}
}
