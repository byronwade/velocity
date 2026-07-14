// The Database studio — a real relational environment over the workspace.
//
// Left: a schema explorer built from the project's .sql files. Right: a SQL
// editor that runs genuine SELECT / INSERT queries against an in-memory store
// (lib/db.ts), and a results grid. Selecting a table loads its rows; an INSERT
// you run persists and shows up on the next query.

import { useEffect, useMemo, useState } from 'react';
import { useDb } from '../services/db';
import { useServices } from '../services/container';
import { isError, type QueryError, type QueryResult } from '../lib/db';
import { Icon } from '../lib/icons';

export function DatabaseStudio(_props: { paneId: string }) {
	const { schema } = useDb();
	const { db } = useServices();
	const [table, setTable] = useState<string | null>(null);
	const [sql, setSql] = useState('');
	const [result, setResult] = useState<QueryResult | QueryError | null>(null);

	const active = table ?? schema[0]?.name ?? null;

	// Load a table's rows when the selection (or schema) settles.
	useEffect(() => {
		if (!active) return;
		const q = `SELECT * FROM ${active}`;
		setSql(q);
		setResult(db.query(q));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);

	function run() {
		if (!sql.trim()) return;
		setResult(db.query(sql));
	}

	const grid = useMemo(() => {
		if (!result || isError(result)) return null;
		return result;
	}, [result]);

	if (schema.length === 0) {
		return <div className="db-empty">No schema found.<br />Add a <code>.sql</code> file with <code>CREATE TABLE</code> statements to populate the database.</div>;
	}

	return (
		<div className="dbstudio">
			<aside className="db-side">
				<div className="db-side-head"><Icon.database /><span>Schema</span></div>
				{schema.map((t) => (
					<div className="db-table" key={t.name}>
						<button className={`db-tbtn${active === t.name ? ' on' : ''}`} onClick={() => setTable(t.name)}>
							<Icon.database /><span className="db-tname">{t.name}</span>
						</button>
						{active === t.name && (
							<ul className="db-cols">
								{t.columns.map((c) => (
									<li key={c.name}><span className="db-cname">{c.name}</span><span className="db-ctype">{c.type}{c.pk ? ' · pk' : ''}</span></li>
								))}
							</ul>
						)}
					</div>
				))}
			</aside>
			<div className="db-main">
				<div className="db-query">
					<textarea
						value={sql}
						spellCheck={false}
						onChange={(e) => setSql(e.target.value)}
						onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); } }}
						placeholder="SELECT * FROM users WHERE id > 1 ORDER BY name"
					/>
					<div className="db-qbar">
						<span className="db-hint">⌘↵ to run · SELECT and INSERT supported</span>
						<span className="sp" />
						<button className="db-run" onClick={run}><Icon.play />Run</button>
					</div>
				</div>
				<div className="db-result">
					{result && isError(result) ? (
						<div className="db-error">{result.error}</div>
					) : grid && grid.note ? (
						<div className="db-note"><Icon.check />{grid.note}</div>
					) : grid ? (
						<div className="db-grid-wrap">
							<table className="db-grid">
								<thead>
									<tr>{grid.columns.map((c) => <th key={c}>{c}</th>)}</tr>
								</thead>
								<tbody>
									{grid.rows.map((r, i) => (
										<tr key={i}>{grid.columns.map((c) => <td key={c}>{r[c] === null ? <span className="db-null">null</span> : String(r[c])}</td>)}</tr>
									))}
								</tbody>
							</table>
							<div className="db-count">{grid.rows.length} row{grid.rows.length === 1 ? '' : 's'}</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
