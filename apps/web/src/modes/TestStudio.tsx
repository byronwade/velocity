// The Test studio — a real check runner over the live workspace.
//
// The checks live in services/checks.ts (shared with the swarm's testing task);
// each executes against the actual services and reports a genuine pass/fail. Run
// all re-executes against current state.

import { useCallback, useEffect, useState } from 'react';
import { useServices } from '../services/container';
import { CHECKS, runChecks } from '../services/checks';
import { Icon } from '../lib/icons';

type Status = 'running' | 'pass' | 'fail';
interface Result { name: string; category: string; status: Status; detail: string; }

const INITIAL: Result[] = CHECKS.map((c) => ({ name: c.name, category: c.category, status: 'running' as Status, detail: '' }));

export function TestStudio(_props: { paneId: string }) {
	const services = useServices();
	const [results, setResults] = useState<Result[]>(INITIAL);
	const [running, setRunning] = useState(false);

	const run = useCallback(async () => {
		setRunning(true);
		setResults(CHECKS.map((c) => ({ name: c.name, category: c.category, status: 'running', detail: '' })));
		setResults(await runChecks(services));
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
