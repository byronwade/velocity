// The Observe studio — real runtime telemetry.
//
// Streams what the ObservabilityService actually captured from the running
// workspace: uncaught errors, unhandled rejections, failed resource loads, and
// console output. Filter by level, watch the counts, clear the buffer. Nothing
// here is fabricated — it is the live signal from the browser.

import { useMemo, useState } from 'react';
import { useObservability, type LogLevel } from '../services/observability';
import { useServices } from '../services/container';
import { Icon } from '../lib/icons';

type Filter = 'all' | LogLevel;

const LEVEL_ORDER: { key: Filter; label: string }[] = [
	{ key: 'all', label: 'All' },
	{ key: 'error', label: 'Errors' },
	{ key: 'warn', label: 'Warnings' },
	{ key: 'info', label: 'Info' },
];

export function ObservabilityStudio(_props: { paneId: string }) {
	const entries = useObservability();
	const { observability } = useServices();
	const [filter, setFilter] = useState<Filter>('all');

	const counts = useMemo(() => {
		const c = { error: 0, warn: 0, info: 0, log: 0 };
		for (const e of entries) c[e.level]++;
		return c;
	}, [entries]);

	const shown = useMemo(() => {
		const list = filter === 'all' ? entries : entries.filter((e) => e.level === filter);
		return [...list].reverse(); // newest first
	}, [entries, filter]);

	return (
		<div className="obs">
			<div className="obs-head">
				<div className="obs-metrics">
					<span className="obm error"><b>{counts.error}</b> errors</span>
					<span className="obm warn"><b>{counts.warn}</b> warnings</span>
					<span className="obm"><b>{entries.length}</b> events</span>
				</div>
				<span className="sp" />
				<div className="obs-filters">
					{LEVEL_ORDER.map((f) => (
						<button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>{f.label}</button>
					))}
				</div>
				<button className="ib" title="Clear" aria-label="Clear" onClick={() => observability.clear()}><Icon.close /></button>
			</div>
			<div className="obs-body">
				{shown.length === 0 ? (
					<div className="obs-empty"><Icon.check />All clear — no {filter === 'all' ? 'events' : `${filter}s`} captured.</div>
				) : (
					shown.map((e) => (
						<div className={`obs-row l-${e.level}`} key={e.id}>
							<span className="obs-time">{e.time}</span>
							<span className="obs-level">{e.level}</span>
							{e.source && <span className="obs-src">{e.source}</span>}
							<span className="obs-msg">{e.message}</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
