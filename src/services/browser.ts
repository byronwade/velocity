// ---------------------------------------------------------------------------
// BrowserService — per-pane browser state: multiple tabs, each with its own
// history stack + position, like a real browser window. The view is a real
// <iframe>; this tracks tabs and addresses so switching a mode away and back
// (or splitting) preserves the browsing session.
// ---------------------------------------------------------------------------

export const BROWSER_HOME = 'velocity:start';

let seq = 0;
const tabId = () => `bt_${(seq++).toString(36)}`;

export interface BrowserTab {
	id: string;
	history: string[];
	index: number;
	title: string;
}

export interface BrowserState {
	tabs: BrowserTab[];
	active: number;
}

export function newBrowserTab(): BrowserTab {
	return { id: tabId(), history: [BROWSER_HOME], index: 0, title: 'New tab' };
}

export class BrowserService {
	private states = new Map<string, BrowserState>();

	for(paneId: string): BrowserState {
		let s = this.states.get(paneId);
		if (!s) {
			s = { tabs: [newBrowserTab()], active: 0 };
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
	if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/.test(s)) {
		return `https://${s}`;
	}
	return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
}

/** A short, stable-ish title/host for an address. */
export function titleFor(url: string): string {
	if (url === BROWSER_HOME) {
		return 'New tab';
	}
	try {
		return new URL(url).host.replace(/^www\./, '');
	} catch {
		return url;
	}
}

/** A deterministic accent color for a host, for tab/bookmark favicons. */
export function hostColor(url: string): string {
	const palette = ['#4a90d9', '#3fae6a', '#e8863c', '#d0567f', '#7b5bd6', '#2aa1a1', '#c0842f'];
	let h = 0;
	const s = titleFor(url);
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) >>> 0;
	}
	return palette[h % palette.length];
}
