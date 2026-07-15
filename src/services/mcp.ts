// ---------------------------------------------------------------------------
// Workspace MCP server — the standard tool seam under every coworker.
//
// Velocity's real services (filesystem, shell, browser) are exposed as Model
// Context Protocol tools over an in-process transport. Any MCP-speaking
// runtime — the future Claude Agent SDK sidecar, an AI SDK ToolLoopAgent, an
// external agent — consumes the same toolbelt the human uses, and third-party
// MCP servers can later be merged alongside. The client half is connected
// immediately so the UI (Settings → Integrations) can list the live tools via
// a real MCP handshake, not a hardcoded list.
// ---------------------------------------------------------------------------

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { getServices } from './container';

export interface McpToolInfo {
	name: string;
	description: string;
}

export interface WorkspaceMcp {
	client: Client;
	/** The registered tools, straight from the server via listTools(). */
	tools: McpToolInfo[];
}

let started: Promise<WorkspaceMcp> | null = null;

/** Start (once) the in-process workspace MCP server + a connected client. */
export function getWorkspaceMcp(): Promise<WorkspaceMcp> {
	started ??= start();
	return started;
}

async function start(): Promise<WorkspaceMcp> {
	const { fs, shell } = getServices();
	const server = new McpServer({ name: 'velocity-workspace', version: '1.0.0' });

	server.tool(
		'read_file',
		'Read a file from the workspace filesystem.',
		{ path: z.string().describe('Workspace-relative path, e.g. src/App.tsx') },
		async ({ path }) => ({ content: [{ type: 'text', text: await fs.readFile(path) }] }),
	);

	server.tool(
		'write_file',
		'Write (create or overwrite) a file in the workspace filesystem.',
		{ path: z.string(), content: z.string() },
		async ({ path, content }) => {
			await fs.writeFile(path, content);
			return { content: [{ type: 'text', text: `wrote ${path}` }] };
		},
	);

	server.tool(
		'list_files',
		'List every file path in the workspace.',
		{},
		async () => ({ content: [{ type: 'text', text: (await fs.list()).join('\n') }] }),
	);

	server.tool(
		'run_command',
		'Run a shell command against the workspace filesystem (ls, cat, grep, mkdir, …).',
		{ command: z.string() },
		async ({ command }) => {
			const lines = await shell.for('mcp:tool').run(command);
			const text = lines.filter((l) => l.kind === 'out' || l.kind === 'err').map((l) => l.text).join('\n');
			const failed = lines.some((l) => l.kind === 'err');
			return { content: [{ type: 'text', text: text || '(no output)' }], isError: failed || undefined };
		},
	);

	server.tool(
		'navigate_browser',
		'Point the in-app browser at a URL (local URLs render the live preview).',
		{ url: z.string() },
		async ({ url }) => {
			window.dispatchEvent(new CustomEvent('velocity:navigate', { detail: { url } }));
			return { content: [{ type: 'text', text: `navigating to ${url}` }] };
		},
	);

	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: 'velocity-ui', version: '1.0.0' });
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

	const listed = await client.listTools();
	const tools = listed.tools.map((t) => ({ name: t.name, description: t.description ?? '' }));
	return { client, tools };
}
