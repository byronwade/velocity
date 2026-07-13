// ---------------------------------------------------------------------------
// Workspace checks — real assertions shared by the Test studio and the swarm's
// testing task. Each runs against the live services and returns a genuine
// pass/fail; the dangling-import check reuses the graph's own resolver.
// ---------------------------------------------------------------------------

import type { Services } from './container';
import { basename, findRelativeImports, resolveImport } from '../lib/graph';

export interface CheckOutcome { pass: boolean; detail: string; }
export interface Check { name: string; category: string; run: (s: Services) => Promise<CheckOutcome>; }
export interface CheckResult { name: string; category: string; status: 'pass' | 'fail'; detail: string; }

export const CHECKS: Check[] = [
	{
		name: 'package.json is valid JSON', category: 'Build',
		run: async (s) => {
			try { JSON.parse(await s.fs.readFile('package.json')); return { pass: true, detail: 'Parses cleanly' }; }
			catch (e) { return { pass: false, detail: e instanceof Error ? e.message : 'unreadable' }; }
		},
	},
	{
		name: 'Entry point present', category: 'Build',
		run: async (s) => {
			const ok = await s.fs.exists('src/main.tsx');
			return ok ? { pass: true, detail: 'src/main.tsx' } : { pass: false, detail: 'src/main.tsx is missing' };
		},
	},
	{
		name: 'Component sources resolve', category: 'Graph',
		run: async (s) => {
			const comps = [...s.graph.get().nodes.values()].filter((n) => n.kind === 'component');
			const missing: string[] = [];
			for (const c of comps) { if (!c.path || !(await s.fs.exists(c.path))) missing.push(c.label); }
			return missing.length ? { pass: false, detail: `Missing source: ${missing.join(', ')}` } : { pass: true, detail: `${comps.length} components resolve` };
		},
	},
	{
		name: 'No broken local imports', category: 'Graph',
		run: async (s) => {
			const paths = await s.fs.list();
			const set = new Set(paths);
			const bad: string[] = [];
			for (const p of paths) {
				if (!/\.(t|j)sx?$/.test(p)) continue;
				const content = await s.fs.readFile(p);
				for (const spec of findRelativeImports(content)) {
					if (!resolveImport(p, spec, set)) bad.push(`${basename(p)} → ${spec}`);
				}
			}
			return bad.length ? { pass: false, detail: bad.slice(0, 3).join('; ') + (bad.length > 3 ? ` (+${bad.length - 3})` : '') } : { pass: true, detail: 'All local imports resolve' };
		},
	},
	{
		name: 'Database tables seeded', category: 'Data',
		run: async (s) => {
			const { schema, data } = s.db.get();
			if (schema.length === 0) return { pass: true, detail: 'No schema (n/a)' };
			const empty = schema.filter((t) => (data.get(t.name) ?? []).length === 0).map((t) => t.name);
			return empty.length ? { pass: false, detail: `Empty: ${empty.join(', ')}` } : { pass: true, detail: `${schema.length} tables have rows` };
		},
	},
	{
		name: 'No runtime errors', category: 'Runtime',
		run: async (s) => {
			const errs = s.observability.get().filter((e) => e.level === 'error').length;
			return errs ? { pass: false, detail: `${errs} error${errs === 1 ? '' : 's'} captured this session` } : { pass: true, detail: 'Clean session' };
		},
	},
];

/** Run all checks against the live services. */
export async function runChecks(s: Services): Promise<CheckResult[]> {
	return Promise.all(CHECKS.map(async (c): Promise<CheckResult> => {
		try {
			const o = await c.run(s);
			return { name: c.name, category: c.category, status: o.pass ? 'pass' : 'fail', detail: o.detail };
		} catch (e) {
			return { name: c.name, category: c.category, status: 'fail', detail: e instanceof Error ? e.message : 'threw' };
		}
	}));
}
