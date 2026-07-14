// ---------------------------------------------------------------------------
// Agent settings — which backend/model drives the agent. Persisted so a chosen
// local (Ollama) model survives reloads. resolveBackend() maps the settings to
// a concrete AgentBackend at send time (see AgentService), caching the Ollama
// client per url+model so we don't rebuild it every message.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { AgentBackend } from './agent';
import { OllamaAgent, DEFAULT_OLLAMA_URL } from './ollama';

export type AgentProvider = 'local' | 'ollama';

export interface AgentSettings {
	provider: AgentProvider;
	ollamaUrl: string;
	ollamaModel: string;
}

const KEY = 'velocity.agent.settings.v1';

function load(): AgentSettings {
	const base: AgentSettings = { provider: 'local', ollamaUrl: DEFAULT_OLLAMA_URL, ollamaModel: '' };
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) return { ...base, ...(JSON.parse(raw) as Partial<AgentSettings>) };
	} catch { /* ignore */ }
	return base;
}

let settings = load();
const listeners = new Set<() => void>();
let rev = 0;

export function getAgentSettings(): AgentSettings {
	return settings;
}

export function setAgentSettings(patch: Partial<AgentSettings>): void {
	settings = { ...settings, ...patch };
	try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
	rev++;
	for (const l of listeners) l();
}

const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => rev;

export function useAgentSettings(): AgentSettings {
	useSyncExternalStore(subscribe, getSnapshot);
	return settings;
}

// --- backend resolution ---------------------------------------------------

let cached: { key: string; agent: OllamaAgent } | null = null;

/** Resolve the active backend from settings; `local` is the built-in fallback. */
export function resolveBackend(local: AgentBackend): AgentBackend {
	if (settings.provider === 'ollama' && settings.ollamaModel) {
		const key = `${settings.ollamaUrl}::${settings.ollamaModel}`;
		if (!cached || cached.key !== key) {
			cached = { key, agent: new OllamaAgent(settings.ollamaUrl, settings.ollamaModel) };
		}
		return cached.agent;
	}
	return local;
}

/** A short label for the current selection (for the composer model chip). */
export function providerLabel(s: AgentSettings): string {
	if (s.provider === 'ollama' && s.ollamaModel) return s.ollamaModel;
	return 'Velocity · Local';
}
