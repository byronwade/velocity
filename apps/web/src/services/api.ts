// The API service — a real, in-process request router that backs the API
// studio. Requests execute against genuine workspace state (the virtual file
// system and the relational store), so a "Send" returns a real, deterministic
// response computed from the same data the rest of the app uses — no mocks.

import type { IFileSystem } from './filesystem';
import type { DbService } from './db';
import { isError } from '../lib/db';

export interface ApiRoute {
	readonly method: string;
	readonly path: string;
	readonly summary: string;
	/** A sample JSON body for non-GET routes, pre-filled into the composer. */
	readonly sample?: string;
}

export interface ApiResponse {
	readonly status: number;
	readonly statusText: string;
	readonly body: unknown;
	/** Round-trip time in milliseconds. */
	readonly ms: number;
}

type HandlerResult = { status?: number; body: unknown };
type Handler = (req: { body: unknown; query: URLSearchParams }) => HandlerResult | Promise<HandlerResult>;

const STATUS: Record<number, string> = {
	200: 'OK', 201: 'Created', 400: 'Bad Request', 404: 'Not Found', 500: 'Internal Server Error',
};

export class ApiService {
	private routes: Array<ApiRoute & { handler: Handler }> = [];

	constructor(private fs: IFileSystem, private db: DbService) {
		this.register('GET', '/api/health', 'Service liveness probe',
			() => ({ body: { status: 'ok', service: 'velocity', time: new Date().toISOString() } }));

		this.register('GET', '/api/files', 'List every file in the workspace',
			async () => { const files = await this.fs.list(); return { body: { count: files.length, files } }; });

		this.register('GET', '/api/tables', 'Database tables and their column counts',
			() => ({ body: { tables: this.db.get().schema.map((t) => ({ name: t.name, columns: t.columns.length })) } }));

		this.register('GET', '/api/users', 'All users — SELECT * FROM users',
			() => {
				const r = this.db.query('SELECT * FROM users');
				return isError(r) ? { status: 500, body: { error: r.error } } : { body: { count: r.rows.length, rows: r.rows } };
			});

		this.register('POST', '/api/echo', 'Echo the JSON request body back',
			(req) => ({ status: 201, body: { received: req.body ?? null, at: new Date().toISOString() } }),
			'{\n  "hello": "world"\n}');
	}

	private register(method: string, path: string, summary: string, handler: Handler, sample?: string): void {
		this.routes.push({ method, path, summary, sample, handler });
	}

	/** The runnable routes, for the studio's endpoint list. */
	list(): ApiRoute[] {
		return this.routes.map(({ method, path, summary, sample }) => ({ method, path, summary, sample }));
	}

	/** Execute a request against the live workspace. Never throws. */
	async request(method: string, rawPath: string, bodyText: string): Promise<ApiResponse> {
		const start = performance.now();
		const [path, qs] = rawPath.split('?');
		const query = new URLSearchParams(qs ?? '');
		const route = this.routes.find((r) => r.method === method.toUpperCase() && r.path === path);

		let out: HandlerResult;
		if (!route) {
			out = { status: 404, body: { error: `No route for ${method.toUpperCase()} ${path}` } };
		} else {
			let body: unknown;
			let parseFailed = false;
			if (bodyText.trim()) {
				try { body = JSON.parse(bodyText); } catch { parseFailed = true; }
			}
			if (parseFailed) {
				out = { status: 400, body: { error: 'Request body is not valid JSON' } };
			} else {
				try { out = await route.handler({ body, query }); } catch (e) {
					out = { status: 500, body: { error: e instanceof Error ? e.message : String(e) } };
				}
			}
		}

		const status = out.status ?? 200;
		const ms = Math.round((performance.now() - start) * 10) / 10;
		return { status, statusText: STATUS[status] ?? '', body: out.body, ms };
	}
}
