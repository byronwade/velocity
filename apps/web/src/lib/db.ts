// ---------------------------------------------------------------------------
// A tiny real relational engine for the Database studio.
//
// Schemas are parsed from the workspace's own .sql files (CREATE TABLE …); rows
// live in an in-memory store. runQuery executes a genuine — if deliberately
// small — subset of SQL: SELECT (with WHERE / ORDER BY / LIMIT) and INSERT.
// It actually filters, sorts, and projects real rows; it is not a mock.
// ---------------------------------------------------------------------------

export interface Column {
	name: string;
	type: string;
	pk?: boolean;
}

export interface TableSchema {
	name: string;
	columns: Column[];
}

export type Value = string | number | null;
export type Row = Record<string, Value>;

export interface QueryResult {
	columns: string[];
	rows: Row[];
	/** A human note for statements that don't return rows (e.g. INSERT). */
	note?: string;
}

export interface QueryError {
	error: string;
}

export function isError(r: QueryResult | QueryError): r is QueryError {
	return (r as QueryError).error !== undefined;
}

/** Split a parenthesised column list on top-level commas only. */
function splitTopLevel(s: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let cur = '';
	for (const ch of s) {
		if (ch === '(') depth++;
		if (ch === ')') depth--;
		if (ch === ',' && depth === 0) { out.push(cur); cur = ''; }
		else cur += ch;
	}
	if (cur.trim()) out.push(cur);
	return out;
}

/** Parse every `CREATE TABLE name ( … )` in a SQL string into schemas. */
export function parseSchema(sql: string): TableSchema[] {
	const tables: TableSchema[] = [];
	const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["'`]?(\w+)["'`]?\s*\(([\s\S]*?)\)\s*;/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(sql))) {
		const name = m[1];
		const cols: Column[] = [];
		for (const raw of splitTopLevel(m[2])) {
			const def = raw.trim();
			if (!def) continue;
			// Skip standalone table constraints (PRIMARY KEY (...), FOREIGN KEY ...).
			if (/^(primary|foreign|unique|constraint|check)\b/i.test(def)) continue;
			const parts = def.split(/\s+/);
			const colName = parts[0].replace(/["'`]/g, '');
			const type = parts[1] ?? 'text';
			const pk = /primary\s+key/i.test(def);
			cols.push({ name: colName, type: type.toLowerCase(), pk });
		}
		if (cols.length) tables.push({ name, columns: cols });
	}
	return tables;
}

function parseValue(raw: string): Value {
	const t = raw.trim();
	if (/^null$/i.test(t)) return null;
	if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
	const q = t.match(/^'(.*)'$/s) ?? t.match(/^"(.*)"$/s);
	return q ? q[1] : t;
}

type Op = '=' | '!=' | '<>' | '<' | '>' | '<=' | '>=' | 'like';

function compare(a: Value, op: Op, b: Value): boolean {
	if (op === 'like') {
		const rx = new RegExp('^' + String(b).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
		return rx.test(String(a ?? ''));
	}
	if (a === null || b === null) {
		return op === '=' ? a === b : op === '!=' || op === '<>' ? a !== b : false;
	}
	const na = typeof a === 'number' ? a : Number(a);
	const nb = typeof b === 'number' ? b : Number(b);
	const bothNum = !Number.isNaN(na) && !Number.isNaN(nb) && typeof b === 'number';
	const x = bothNum ? na : String(a).toLowerCase();
	const y = bothNum ? nb : String(b).toLowerCase();
	switch (op) {
		case '=': return x === y;
		case '!=': case '<>': return x !== y;
		case '<': return x < y;
		case '>': return x > y;
		case '<=': return x <= y;
		case '>=': return x >= y;
	}
}

/** Execute a SELECT or INSERT against the in-memory store. Mutates `data` on INSERT. */
export function runQuery(sql: string, schema: TableSchema[], data: Map<string, Row[]>): QueryResult | QueryError {
	const q = sql.trim().replace(/;\s*$/, '');
	if (!q) return { error: 'Empty query.' };
	const tableByName = (n: string) => schema.find((t) => t.name.toLowerCase() === n.toLowerCase());

	// INSERT INTO t (a, b) VALUES (1, 'x')
	const ins = q.match(/^insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([\s\S]+)\)$/i);
	if (ins) {
		const t = tableByName(ins[1]);
		if (!t) return { error: `No such table: ${ins[1]}` };
		const cols = ins[2].split(',').map((c) => c.trim().replace(/["'`]/g, ''));
		const vals = splitTopLevel(ins[3]).map(parseValue);
		if (cols.length !== vals.length) return { error: 'Column/value count mismatch.' };
		const row: Row = {};
		for (const c of t.columns) row[c.name] = null;
		cols.forEach((c, i) => { row[c] = vals[i]; });
		const rows = data.get(t.name) ?? [];
		rows.push(row);
		data.set(t.name, rows);
		return { columns: [], rows: [], note: `1 row inserted into ${t.name}.` };
	}

	// SELECT cols FROM t [WHERE c op v] [ORDER BY c [DESC]] [LIMIT n]
	const sel = q.match(/^select\s+([\s\S]+?)\s+from\s+(\w+)(?:\s+where\s+([\s\S]+?))?(?:\s+order\s+by\s+(\w+)(\s+desc)?)?(?:\s+limit\s+(\d+))?$/i);
	if (sel) {
		const t = tableByName(sel[2]);
		if (!t) return { error: `No such table: ${sel[2]}` };
		let rows = [...(data.get(t.name) ?? [])];
		if (sel[3]) {
			const w = sel[3].match(/^(\w+)\s*(=|!=|<>|<=|>=|<|>|like)\s*([\s\S]+)$/i);
			if (!w) return { error: 'Unsupported WHERE clause.' };
			const [, col, opRaw, valRaw] = w;
			if (!t.columns.some((c) => c.name === col)) return { error: `No such column: ${col}` };
			const op = opRaw.toLowerCase() as Op;
			const val = parseValue(valRaw);
			rows = rows.filter((r) => compare(r[col], op, val));
		}
		if (sel[4]) {
			const col = sel[4];
			const dir = sel[5] ? -1 : 1;
			rows.sort((a, b) => {
				const x = a[col], y = b[col];
				if (x === y) return 0;
				if (x === null) return 1;
				if (y === null) return -1;
				return (x < y ? -1 : 1) * dir;
			});
		}
		if (sel[6]) rows = rows.slice(0, Number(sel[6]));
		const columns = sel[1].trim() === '*' ? t.columns.map((c) => c.name) : sel[1].split(',').map((c) => c.trim());
		const projected = rows.map((r) => {
			const o: Row = {};
			for (const c of columns) o[c] = r[c] ?? null;
			return o;
		});
		return { columns, rows: projected };
	}

	return { error: 'Only SELECT and INSERT are supported in this studio.' };
}
