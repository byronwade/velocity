// ---------------------------------------------------------------------------
// BrowserService — per-pane navigation state for the Browser mode.
//
// Each browser pane keeps its own history stack + position, so switching a
// pane's mode away and back (or splitting) preserves where it was. The view
// itself is a real <iframe>; this only tracks the address history.
// ---------------------------------------------------------------------------

export const BROWSER_HOME = 'velocity:start';

export interface BrowserState {
	history: string[];
	index: number;
}

export class BrowserService {
	private states = new Map<string, BrowserState>();

	for(paneId: string): BrowserState {
		let s = this.states.get(paneId);
		if (!s) {
			s = { history: [BROWSER_HOME], index: 0 };
			this.states.set(paneId, s);
		}
		return s;
	}

	release(paneId: string): void {
		this.states.delete(paneId);
	}
}

/** Turn a typed address or query into a navigable URL. */
export function normalizeUrl(raw: string): string {
	const s = raw.trim();
	if (!s) {
		return BROWSER_HOME;
	}
	if (s === BROWSER_HOME || /^https?:\/\//i.test(s)) {
		return s;
	}
	// A bare domain (has a dot, no spaces) → https; otherwise a web search.
	if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/.test(s)) {
		return `https://${s}`;
	}
	return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
}
