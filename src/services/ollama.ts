// ---------------------------------------------------------------------------
// Ollama backend — run LOCAL models (llama, qwen, mistral…) as the workspace
// agent. Talks to the Ollama HTTP API (default http://localhost:11434):
// /api/tags lists installed models and /api/chat streams a tool-calling
// conversation. In Tauri, requests use the Rust HTTP plugin so a normal local
// Ollama install works without weakening its CORS policy. The browser build
// retains native fetch as a development/demo fallback.
//
// Browser-only CORS: Ollama must allow the Vite origin. Run it with
//   OLLAMA_ORIGINS='http://localhost:5199' ollama serve
// Desktop access is capability-scoped to localhost:11434 in
// src-tauri/capabilities/default.json.
// ---------------------------------------------------------------------------

import { isTauri } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { AgentBackend, AgentContext, AgentEvent } from './agent';
import { toolSchemas, runTool, toolLabel, projectIndex } from './tools';
import { memoryPrompt } from './memory';
import { uid } from '../lib/tree';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

interface OllamaModel { name: string; }
interface OllamaMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	thinking?: string;
	tool_calls?: OllamaToolCall[];
	tool_name?: string;
}
interface OllamaToolCall { function: { name: string; arguments: Record<string, unknown> }; }

/** Route through Rust on desktop (no browser CORS); stay web-native in Vite. */
function ollamaFetch(input: string, init?: RequestInit): Promise<Response> {
	return isTauri() ? tauriFetch(input, init) : globalThis.fetch(input, init);
}

/** True if an Ollama server answers at `url`. */
export async function pingOllama(url: string, signal?: AbortSignal): Promise<boolean> {
	try {
		const res = await ollamaFetch(`${url.replace(/\/$/, '')}/api/tags`, { signal });
		return res.ok;
	} catch {
		return false;
	}
}

/** Installed model names, or [] if unreachable. */
export async function listOllamaModels(url: string): Promise<string[]> {
	try {
		const res = await ollamaFetch(`${url.replace(/\/$/, '')}/api/tags`);
		if (!res.ok) return [];
		const data = (await res.json()) as { models?: OllamaModel[] };
		return (data.models ?? []).map((m) => m.name).sort();
	} catch {
		return [];
	}
}

function systemPrompt(index: string, memory: string): string {
	return [
		'You are Velocity Agent, an AI pair programmer operating a local-first developer workspace.',
		'You have tools to read/write files, run shell commands, search the code, open files in the editor, drive the in-app browser, index the project, and remember durable facts. Prefer using tools to inspect the project before answering, and to make real changes rather than describing them.',
		'Keep replies concise. Use short markdown. When you edit or create files, say what you did.',
		memory ? `\n${memory}` : '',
		'',
		'Project index (files → exported symbols):',
		index,
	].join('\n');
}

export class OllamaAgent implements AgentBackend {
	name: string;
	constructor(private url: string, private model: string) {
		this.name = `Ollama · ${model}`;
	}

	async *run(input: string, ctx: AgentContext): AsyncGenerator<AgentEvent> {
		const base = this.url.replace(/\/$/, '');
		let index = '';
		try { index = await projectIndex(ctx); } catch { /* ignore */ }

		const messages: OllamaMessage[] = [
			{ role: 'system', content: systemPrompt(index, memoryPrompt()) },
			...ctx.history.map((h) => ({ role: h.role, content: h.content } as OllamaMessage)),
			{ role: 'user', content: input },
		];

		const MAX_STEPS = 8;
		for (let step = 0; step < MAX_STEPS; step++) {
			let res: Response;
			try {
				res = await ollamaFetch(`${base}/api/chat`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ model: this.model, messages, tools: toolSchemas(), stream: true }),
				});
			} catch {
				const setup = isTauri()
					? 'The desktop app permits local Ollama at `http://localhost:11434` or `http://127.0.0.1:11434`.'
					: "For the browser preview, start it with `OLLAMA_ORIGINS='http://localhost:5199' ollama serve`.";
				yield { type: 'text', text: `⚠️ Couldn't reach Ollama at \`${base}\`. Is it running? ${setup}` };
				return;
			}
			if (!res.ok || !res.body) {
				const detail = await res.text().catch(() => '');
				yield { type: 'text', text: `⚠️ Ollama error (${res.status}). ${detail.slice(0, 200)}` };
				return;
			}

			// Stream NDJSON: accumulate content (as deltas) + any tool calls.
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = '';
			let content = '';
			let thinking = '';
			const toolCalls: OllamaToolCall[] = [];
			let streamErr = false;
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				let nl: number;
				while ((nl = buf.indexOf('\n')) >= 0) {
					const line = buf.slice(0, nl).trim();
					buf = buf.slice(nl + 1);
					if (!line) continue;
					let obj: { message?: OllamaMessage; error?: string };
					try { obj = JSON.parse(line); } catch { continue; }
					if (obj.error) { yield { type: 'text', text: `⚠️ Ollama: ${obj.error}` }; streamErr = true; break; }
					const delta = obj.message?.content ?? '';
					if (delta) { content += delta; yield { type: 'text-delta', text: delta }; }
					thinking += obj.message?.thinking ?? '';
					if (obj.message?.tool_calls?.length) toolCalls.push(...obj.message.tool_calls);
				}
				if (streamErr) return;
			}

			if (toolCalls.length === 0) {
				return; // model produced a final answer
			}

			// Record the assistant turn (with its tool calls), then run each tool.
			messages.push({ role: 'assistant', content, thinking, tool_calls: toolCalls });
			for (const call of toolCalls) {
				const name = call.function?.name ?? '';
				const args = (call.function?.arguments ?? {}) as Record<string, unknown>;
				const id = uid('tool');
				yield { type: 'tool', id, tool: name, label: toolLabel(name, args) };
				const result = await runTool(name, args, ctx);
				const failed = result.startsWith('Error');
				yield { type: 'tool-done', id, status: failed ? 'error' : 'done', output: result.slice(0, 2000) };
				messages.push({ role: 'tool', tool_name: name, content: result });
			}
			// loop: let the model read tool results and continue
		}
		yield { type: 'text', text: '\n\n_(stopped after the tool-step limit)_' };
	}
}
