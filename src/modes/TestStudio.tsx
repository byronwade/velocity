// The Test studio — a real check runner over the live workspace.
//
// Each check executes against the actual services (file system, graph, database,
// telemetry) and reports a genuine pass/fail — including a real dangling-import
// lint that reuses the graph's own resolver. Nothing is stubbed; Run re-executes
// every check against the current state.

import { useCallback, useEffect, useState } from 'react';
import { useServices } from '../services/container';
import type { Services } from '../services/container';
import { basename, findRelativeImports, resolveImport } from '../lib/graph';
import { Icon } from '../lib/icons';

interface CheckOutcome { pass: boolean; detail: string; }
interface Check { name: string; category: string; run: (s: Services) => Promise<CheckOutcome>; }

const CHECKS: Check[] = [
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

type Status = 'running' | 'pass' | 'fail';
interface Result { name: string; category: string; status: Status; detail: string; }

export function TestStudio(_props: { paneId: string }) {
	const services = useServices();
	const [results, setResults] = useState<Result[]>(() => CHECKS.map((c) => ({ name: c.name, category: c.category, status: 'running' as Status, detail: '' })));
	const [running, setRunning] = useState(false);

	const run = useCallback(async () => {
		setRunning(true);
		setResults(CHECKS.map((c) => ({ name: c.name, category: c.category, status: 'running', detail: '' })));
		const settled = await Promise.all(CHECKS.map(async (c): Promise<Result> => {
			try {
				const o = await c.run(services);
				return { name: c.name, category: c.category, status: o.pass ? 'pass' : 'fail', detail: o.detail };
			} catch (e) {
				return { name: c.name, category: c.category, status: 'fail', detail: e instanceof Error ? e.message : 'threw' };
			}
		}));
		setResults(settled);
		setRunning(false);
	}, [services]);

	useEffect(() => { void run(); }, [run]);

	const passed = results.filter((r) => r.status === 'pass').length;
	const failed = results.filter((r) => r.status === 'fail').length;

	return (
		<div className="test">
			<div className="test-head">
				<div className="test-summary">
					<span className="ts-pass"><b>{passed}</b> passed</span>
					{failed > 0 && <span className="ts-fail"><b>{failed}</b> failed</span>}
					<span className="ts-total">of {results.length}</span>
				</div>
				<span className="sp" />
				<button className="test-run" onClick={() => void run()} disabled={running}>
					{running ? <span className="spin" /> : <Icon.play />}{running ? 'Running' : 'Run all'}
				</button>
			</div>
			<div className="test-list">
				{results.map((r) => (
					<div className={`test-row s-${r.status}`} key={r.name}>
						<span className="tr-ic">{r.status === 'running' ? <span className="spin" /> : r.status === 'pass' ? <Icon.check /> : <Icon.close />}</span>
						<span className="tr-name">{r.name}</span>
						<span className="tr-cat">{r.category}</span>
						<span className="tr-detail">{r.detail}</span>
					</div>
				))}
			</div>
		</div>
	);
}
