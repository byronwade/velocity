// ---------------------------------------------------------------------------
// Real work — a coworker actually doing the job with a local model.
//
// When a work item is created with the Local model, the assigned coworker
// runs the existing OllamaAgent tool loop (read/write files, run commands,
// search — all against the real workspace) on the request. The coworker's
// action updates live as tools run, the model's answer lands as a thread
// reply, and any file changes become a checkpoint whose diff is COMPUTED
// from the actual before/after contents — nothing simulated.
// ---------------------------------------------------------------------------

import { OllamaAgent, listOllamaModels, DEFAULT_OLLAMA_URL } from '../services/ollama';
import { getServices } from '../services/container';
import { runTool } from '../services/tools';
import type { AgentContext, FileChange } from '../services/agent';
import type { CoworkerRuntime } from './runtime';

/** Small local models often NARRATE a tool call (a JSON block in the answer)
 *  instead of emitting Ollama's structured tool_calls. Rescue those: parse
 *  JSON blocks shaped like {name, arguments} and execute them for real. */
async function applyNarratedToolCalls(text: string, ctx: AgentContext): Promise<number> {
	let applied = 0;
	const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
	for (const block of fenced.length ? fenced : [text]) {
		let parsed: unknown;
		try { parsed = JSON.parse(block.trim()); } catch { continue; }
		for (const call of Array.isArray(parsed) ? parsed : [parsed]) {
			const c = call as { name?: string; arguments?: unknown; function?: { name?: string; arguments?: unknown } };
			const name = c?.name ?? c?.function?.name;
			const args = c?.arguments ?? c?.function?.arguments;
			if (typeof name !== 'string' || !args || typeof args !== 'object') continue;
			const result = await runTool(name, args as Record<string, unknown>, ctx);
			if (!result.startsWith('Error')) applied++;
		}
	}
	return applied;
}

/** Real line-level delta between two versions (multiset line diff). */
function lineDelta(was: string, now: string): { added: number; removed: number } {
	const a = was.split('\n');
	const b = now.split('\n');
	const pool = new Map<string, number>();
	for (const line of a) pool.set(line, (pool.get(line) ?? 0) + 1);
	let unchanged = 0;
	for (const line of b) {
		const n = pool.get(line) ?? 0;
		if (n > 0) { unchanged++; pool.set(line, n - 1); }
	}
	return { added: b.length - unchanged, removed: a.length - unchanged };
}

/** Files the loop should never count as "the work" (workspace bookkeeping). */
const isBookkeeping = (path: string) => path.startsWith('.velocity/');

export async function runRealWork(runtime: CoworkerRuntime, commentId: string): Promise<void> {
	const state = runtime.getState();
	const comment = state.comments.find((c) => c.id === commentId);
	const coworker = comment && state.coworkers.find((c) => c.id === comment.assignedCoworkerId);
	if (!comment || !coworker) return;

	const models = await listOllamaModels(DEFAULT_OLLAMA_URL);
	if (!models.length) {
		runtime.notify('Ollama isn’t reachable — start it to run local work.');
		return;
	}
	const model = models.find((m) => m.includes('coder')) ?? models[0];

	const { fs, editor, shell } = getServices();
	// Snapshot the workspace so the checkpoint diff is real, not narrated.
	const before = new Map<string, string>();
	for (const path of await fs.list()) {
		if (!isBookkeeping(path)) before.set(path, await fs.readFile(path));
	}

	runtime.realWorkStarted(commentId, model);
	const agent = new OllamaAgent(DEFAULT_OLLAMA_URL, model);
	const ctx: AgentContext = { fs, editor, shell: shell.for(`realwork:${commentId}`), history: [] };

	let text = '';
	try {
		for await (const ev of agent.run(comment.text, ctx)) {
			if (ev.type === 'text' || ev.type === 'text-delta') text += ev.text;
			else if (ev.type === 'tool') runtime.realWorkTool(coworker.id, ev.label);
		}
	} catch (err) {
		text += `\n⚠️ ${String(err)}`;
	}

	// Rescue tool calls the model narrated instead of invoking.
	try {
		const rescued = await applyNarratedToolCalls(text, ctx);
		if (rescued) text += `\n\n(applied ${rescued} narrated tool call${rescued > 1 ? 's' : ''})`;
	} catch { /* rescue is best-effort */ }

	// Compute what actually changed.
	const files: FileChange[] = [];
	const after = await fs.list();
	for (const path of after) {
		if (isBookkeeping(path)) continue;
		const now = await fs.readFile(path);
		const was = before.get(path);
		if (was === undefined) files.push({ path, added: now.split('\n').length, removed: 0 });
		else if (was !== now) files.push({ path, ...lineDelta(was, now) });
	}
	for (const [path, was] of before) {
		if (!after.includes(path)) files.push({ path, added: 0, removed: was.split('\n').length });
	}

	runtime.realWorkDone(commentId, text.trim(), files, model);
}
