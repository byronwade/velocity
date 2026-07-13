// ---------------------------------------------------------------------------
// Line diff — a small, dependency-free LCS diff for the review studio.
//
// Given two versions of a file it produces a unified line list (context / added
// / removed), then collapses long unchanged runs into gap markers so a narrow
// review column stays readable. Pure and synchronous.
// ---------------------------------------------------------------------------

export type DiffLineType = 'ctx' | 'add' | 'del' | 'gap';

export interface DiffLine {
	type: DiffLineType;
	text: string;
	/** 1-based line number in the old file (context / removed). */
	a?: number;
	/** 1-based line number in the new file (context / added). */
	b?: number;
	/** For gap markers: how many unchanged lines were collapsed. */
	count?: number;
}

/** Split into lines, treating an empty string as zero lines (not one blank). */
function toLines(text: string): string[] {
	return text.length ? text.split('\n') : [];
}

/** A unified line diff via longest-common-subsequence. O(n·m) — guarded for size. */
export function diffLines(aText: string, bText: string): DiffLine[] {
	const a = toLines(aText);
	const b = toLines(bText);
	const n = a.length;
	const m = b.length;

	// Guard against pathological cost on very large files: treat as full replace.
	if (n * m > 4_000_000) {
		return [
			...a.map((text, i): DiffLine => ({ type: 'del', text, a: i + 1 })),
			...b.map((text, i): DiffLine => ({ type: 'add', text, b: i + 1 })),
		];
	}

	// dp[i][j] = LCS length of a[i:] and b[j:].
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const out: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			out.push({ type: 'ctx', text: a[i], a: i + 1, b: j + 1 });
			i++; j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			out.push({ type: 'del', text: a[i], a: i + 1 });
			i++;
		} else {
			out.push({ type: 'add', text: b[j], b: j + 1 });
			j++;
		}
	}
	while (i < n) { out.push({ type: 'del', text: a[i], a: i + 1 }); i++; }
	while (j < m) { out.push({ type: 'add', text: b[j], b: j + 1 }); j++; }
	return out;
}

/** Collapse unchanged runs more than `context` lines from any change into gaps. */
export function collapse(lines: DiffLine[], context = 3): DiffLine[] {
	const keep = new Array(lines.length).fill(false);
	lines.forEach((l, idx) => {
		if (l.type !== 'ctx') {
			for (let k = Math.max(0, idx - context); k <= Math.min(lines.length - 1, idx + context); k++) {
				keep[k] = true;
			}
		}
	});
	const out: DiffLine[] = [];
	let gap = 0;
	for (let idx = 0; idx < lines.length; idx++) {
		if (keep[idx]) {
			if (gap > 0) {
				out.push({ type: 'gap', text: `${gap} unchanged line${gap === 1 ? '' : 's'}`, count: gap });
				gap = 0;
			}
			out.push(lines[idx]);
		} else {
			gap++;
		}
	}
	if (gap > 0) {
		out.push({ type: 'gap', text: `${gap} unchanged line${gap === 1 ? '' : 's'}`, count: gap });
	}
	return out;
}

export interface FileDiff {
	path: string;
	status: 'added' | 'modified' | 'deleted';
	added: number;
	removed: number;
	lines: DiffLine[];
}

/** Diff one file's old→new content into a collapsed unified FileDiff. */
export function fileDiff(path: string, oldText: string | undefined, newText: string | undefined): FileDiff {
	const status: FileDiff['status'] = oldText === undefined ? 'added' : newText === undefined ? 'deleted' : 'modified';
	const raw = diffLines(oldText ?? '', newText ?? '');
	const added = raw.filter((l) => l.type === 'add').length;
	const removed = raw.filter((l) => l.type === 'del').length;
	return { path, status, added, removed, lines: collapse(raw) };
}
