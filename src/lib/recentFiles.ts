// Most-recently-used file tracking. A tiny persisted stack that powers the
// recency ordering in Quick Open (⌘P) and the recent-files switcher (⌘E), so the
// files you bounce between sit at the top instead of buried in the tree.

const KEY = 'velocity.recent.v1';
const LIMIT = 40;

function load(): string[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

let recent: string[] = load();

/** Record `path` as the most recently opened file (moves it to the front). */
export function pushRecent(path: string): void {
	recent = [path, ...recent.filter((p) => p !== path)].slice(0, LIMIT);
	try {
		localStorage.setItem(KEY, JSON.stringify(recent));
	} catch {
		/* ignore storage errors */
	}
}

/** Current MRU list, newest first. */
export function getRecent(): string[] {
	return recent;
}

/** Rank of `path` in the MRU list (0 = most recent), or Infinity if unseen. */
export function recentRank(path: string): number {
	const i = recent.indexOf(path);
	return i === -1 ? Infinity : i;
}
