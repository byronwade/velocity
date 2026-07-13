// ---------------------------------------------------------------------------
// DbService — the Database studio's data source.
//
// Schema comes from the workspace's real .sql files (parsed on every FS change);
// rows live in an in-memory store seeded with real sample data. Queries run
// through the engine in lib/db.ts against that live store, so an INSERT you run
// actually persists for the session and shows up in the next SELECT.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';
import { parseSchema, runQuery, type QueryError, type QueryResult, type Row, type TableSchema } from '../lib/db';

// Sample rows for the seed schema, so the studio opens with real data.
const SEED_ROWS: Record<string, Row[]> = {
	users: [
		{ id: 1, email: 'ada@velocity.dev', name: 'Ada Lovelace', created_at: '2026-01-04' },
		{ id: 2, email: 'grace@velocity.dev', name: 'Grace Hopper', created_at: '2026-01-09' },
		{ id: 3, email: 'linus@velocity.dev', name: 'Linus T.', created_at: '2026-02-02' },
		{ id: 4, email: 'margaret@velocity.dev', name: 'Margaret Hamilton', created_at: '2026-02-18' },
	],
	todos: [
		{ id: 1, user_id: 1, title: 'Wire the project graph', done: 1 },
		{ id: 2, user_id: 1, title: 'Ship the cockpit shell', done: 1 },
		{ id: 3, user_id: 2, title: 'Design the agent dock', done: 1 },
		{ id: 4, user_id: 2, title: 'Build the review studio', done: 1 },
		{ id: 5, user_id: 3, title: 'Add the database studio', done: 0 },
		{ id: 6, user_id: 4, title: 'Draft the observability studio', done: 0 },
	],
};

export interface DbSnapshot {
	schema: TableSchema[];
	data: Map<string, Row[]>;
}

export class DbService {
	private schema: TableSchema[] = [];
	private data = new Map<string, Row[]>();
	private rev = 0;
	private building = false;
	private dirty = true;
	private listeners = new Set<() => void>();

	constructor(private fs: IFileSystem) {
		this.fs.onChange(() => { this.dirty = true; void this.rebuild(); });
		void this.rebuild();
	}

	get(): DbSnapshot {
		return { schema: this.schema, data: this.data };
	}

	async rebuild(): Promise<void> {
		if (this.building) return;
		this.building = true;
		try {
			while (this.dirty) {
				this.dirty = false;
				const paths = (await this.fs.list()).filter((p) => p.endsWith('.sql'));
				const tables: TableSchema[] = [];
				for (const p of paths) {
					try { tables.push(...parseSchema(await this.fs.readFile(p))); } catch { /* skip */ }
				}
				this.schema = tables;
				// Seed rows for any table that has none yet; keep existing (inserted) rows.
				for (const t of tables) {
					if (!this.data.has(t.name)) {
						this.data.set(t.name, (SEED_ROWS[t.name] ?? []).map((r) => ({ ...r })));
					}
				}
				this.bump();
			}
		} finally {
			this.building = false;
		}
	}

	/** Run a query against the live store; an INSERT mutates it and notifies. */
	query(sql: string): QueryResult | QueryError {
		const result = runQuery(sql, this.schema, this.data);
		this.bump();
		return result;
	}

	readonly subscribe = (l: () => void): (() => void) => {
		this.listeners.add(l);
		return () => this.listeners.delete(l);
	};
	readonly getSnapshot = (): number => this.rev;

	private bump(): void {
		this.rev++;
		for (const l of this.listeners) l();
	}
}

// --- React binding --------------------------------------------------------

import { useServices } from './container';

export function useDb(): DbSnapshot {
	const { db } = useServices();
	useSyncExternalStore(db.subscribe, db.getSnapshot);
	return db.get();
}
