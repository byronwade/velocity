// ---------------------------------------------------------------------------
// Real AI chat — coworkers answer with an actual model, streamed.
//
// Built on the Vercel AI SDK (`streamText`) with the OpenAI-compatible
// provider pointed at local Ollama's /v1 endpoint — the exact provider seam
// the integrations research prescribes, so swapping in AI Gateway later is a
// baseURL + key change, not a rewrite. Each coworker replies in persona; a
// second responder receives the first one's ACTUAL reply, so agents genuinely
// build on each other rather than reciting canned lines.
// ---------------------------------------------------------------------------

import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { listOllamaModels, DEFAULT_OLLAMA_URL } from '../services/ollama';
import type { Coworker } from './model';

const ollama = createOpenAICompatible({
	name: 'ollama',
	baseURL: `${DEFAULT_OLLAMA_URL}/v1`,
	// Ollama ignores the key but the provider requires the header.
	apiKey: 'ollama',
});

let cachedModel: string | null | undefined;
let pinnedModel: string | null = null;

/** Pin chat replies to a specific installed model; null returns to auto
 *  (best installed, coder-first). The composer's model chip calls this. */
export function setChatModel(model: string | null): void {
	pinnedModel = model;
	cachedModel = undefined;
}

export function pinnedChatModel(): string | null {
	return pinnedModel;
}

/** The best installed local model (coder-first), or null when Ollama is down. */
export async function chatModel(): Promise<string | null> {
	if (pinnedModel) return pinnedModel;
	if (cachedModel !== undefined) return cachedModel;
	const models = await listOllamaModels(DEFAULT_OLLAMA_URL);
	cachedModel = models.length ? (models.find((m) => m.includes('coder')) ?? models[0]) : null;
	// Re-probe on the next call if Ollama was down.
	if (cachedModel === null) setTimeout(() => { cachedModel = undefined; }, 15_000);
	return cachedModel;
}

export interface ChatTurn {
	speaker: string;
	text: string;
	/** True when the speaker is the coworker who is about to reply. */
	self?: boolean;
}

function persona(c: Coworker, team: Coworker[], project: string): string {
	return [
		`You are ${c.name}, the ${c.role} (${c.department}) — an AI coworker in the Velocity workspace, working on the "${project}" project.`,
		`Right now you are: ${c.action.toLowerCase()}.`,
		`Your teammates: ${team.filter((t) => t.id !== c.id).map((t) => `${t.name} (${t.role})`).join(', ')}.`,
		'You are chatting in the team channel. Write ONLY your own single reply, in 1–3 short, concrete sentences — a teammate, not an assistant.',
		'Never write lines for teammates, never quote their turns, never prefix any name followed by a colon. No markdown headings or lists.',
		'When you want a specific teammate to act, address them as @Name (e.g. "@Theo can you…") — they will see it and answer.',
	].join('\n');
}

/** Small local models sometimes roleplay the whole team. Keep only THIS
 *  coworker's voice: drop a leading "Name:" prefix and cut at the first line
 *  that starts impersonating someone else. */
function onlyOwnVoice(text: string, self: Coworker, team: Coworker[]): string {
	const names = team.map((t) => t.name);
	let out = text.replace(new RegExp(`^\\s*@?${self.name}\\s*[:,]\\s*`, 'i'), '');
	for (const name of names) {
		if (name === self.name) continue;
		const at = out.search(new RegExp(`(^|\\n)\\s*${name}\\s*:`, 'i'));
		if (at >= 0) out = out.slice(0, at);
	}
	return out.trim();
}

/** Stream one coworker's reply. Deltas arrive via onDelta; resolves with the
 *  full text. Throws when the model/provider is unavailable. */
export async function streamCoworkerReply(
	coworker: Coworker,
	team: Coworker[],
	project: string,
	transcript: ChatTurn[],
	onDelta: (text: string) => void,
): Promise<string> {
	const model = await chatModel();
	if (!model) throw new Error('no local model');
	const messages = transcript.slice(-10).map((t) => ({
		role: t.self ? ('assistant' as const) : ('user' as const),
		content: t.self ? t.text : `${t.speaker}: ${t.text}`,
	}));
	const result = streamText({
		model: ollama(model),
		system: persona(coworker, team, project),
		messages,
		temperature: 0.7,
		maxOutputTokens: 180,
	});
	let full = '';
	for await (const delta of result.textStream) {
		full += delta;
		onDelta(onlyOwnVoice(full, coworker, team));
	}
	return onlyOwnVoice(full, coworker, team);
}
