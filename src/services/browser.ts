// ---------------------------------------------------------------------------
// BrowserService — per-pane navigation state. Each Browser pane is one browser
// "tab" (the workspace tab above it plays that role), so state is a single
// history stack + position. The view is a real <iframe>.
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
	// Local dev server addresses navigate to the live workspace preview.
	if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(s)) {
		return `http://${s}`;
	}
	if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/.test(s)) {
		return `https://${s}`;
	}
	return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
}

/** True if a URL points at the local dev server — rendered as the live app preview. */
export function isLocalUrl(url: string): boolean {
	try {
		const h = new URL(url).hostname;
		return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
	} catch {
		return false;
	}
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

/** A deterministic accent color for a host, for bookmark favicons. */
export function hostColor(url: string): string {
	const palette = ['#4a90d9', '#3fae6a', '#e8863c', '#d0567f', '#7b5bd6', '#2aa1a1', '#c0842f'];
	let h = 0;
	const s = titleFor(url);
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) >>> 0;
	}
	return palette[h % palette.length];
}
