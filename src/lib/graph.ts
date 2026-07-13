// ---------------------------------------------------------------------------
// The project graph — the shared spine of Velocity.
//
// Every meaningful object in a project (files, components, routes, endpoints,
// tables, tests, deployments, agents, tasks) is a node; relationships between
// them are edges. The editor, browser, terminal, canvas, and agents are all
// *views* over this one graph. This module is pure: it derives a graph from the
// real contents of the workspace file system via lightweight static analysis —
// no mock data. GraphService (services/graph.ts) owns building + caching it.
// ---------------------------------------------------------------------------

export type GraphKind =
	| 'project'
	| 'file'
	| 'component'
	| 'route'
	| 'endpoint'
	| 'table'
	| 'test'
	| 'deployment'
	| 'agent'
	| 'task';

export type EdgeKind = 'contains' | 'imports' | 'defines' | 'renders' | 'routes' | 'tests' | 'calls';

export interface GraphNode {
	/** Stable, kind-prefixed id, e.g. `file:src/App.tsx` or `component:TodoList`. */
	readonly id: string;
	readonly kind: GraphKind;
	/** Human label (basename, component name, route path…). */
	readonly label: string;
	/** The file path this node lives in, when applicable. */
	readonly path?: string;
	/** Small facts for display (lines, language, method…). */
	readonly meta?: Record<string, string | number>;
}

export interface GraphEdge {
	readonly from: string;
	readonly to: string;
	readonly kind: EdgeKind;
}

export interface ProjectGraph {
	readonly nodes: Map<string, GraphNode>;
	readonly edges: GraphEdge[];
}

export const KIND_LABEL: Record<GraphKind, string> = {
	project: 'Project',
	file: 'Files',
	component: 'Components',
	route: 'Routes',
	endpoint: 'Endpoints',
	table: 'Tables',
	test: 'Tests',
	deployment: 'Deployments',
	agent: 'Agents',
	task: 'Tasks',
};

/** The order kinds are surfaced in the map / navigator. */
export const KIND_ORDER: GraphKind[] = ['route', 'component', 'endpoint', 'table', 'test', 'file', 'deployment', 'agent', 'task', 'project'];

export function basename(path: string): string {
	const i = path.lastIndexOf('/');
	return i === -1 ? path : path.slice(i + 1);
}

function ext(path: string): string {
	const b = basename(path);
	const i = b.lastIndexOf('.');
	return i === -1 ? '' : b.slice(i + 1).toLowerCase();
}

const LANG: Record<string, string> = {
	ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
	css: 'CSS', json: 'JSON', md: 'Markdown', html: 'HTML', sql: 'SQL', py: 'Python',
};

function isTest(path: string): boolean {
	return /\.(test|spec)\.[tj]sx?$/.test(path) || /(^|\/)__tests__\//.test(path);
}

function isRouteFile(path: string): boolean {
	return /(^|\/)(pages|routes|app)\//.test(path) && /\.(t|j)sx?$/.test(path) && !isTest(path);
}

function isEndpointFile(path: string): boolean {
	return /(^|\/)(api|server|routes\/api)\//.test(path) || /(^|\/)route\.(t|j)s$/.test(path);
}

/** Turn a file path under pages/ | routes/ | app/ into a URL-ish route path. */
function routePath(path: string): string {
	let p = path.replace(/^.*?(pages|routes|app)\//, '/');
	p = p.replace(/\.(t|j)sx?$/, '');
	p = p.replace(/\/(index|page|route)$/, '');
	p = p.replace(/\[([^\]]+)\]/g, ':$1'); // [id] -> :id
	return p === '' ? '/' : p;
}

/** Exported React components: `export function Name(`, `export const Name = (…) =>`, `export default function Name`. */
function findComponents(content: string): string[] {
	const names = new Set<string>();
	const re = /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z]\w*)/g;
	const re2 = /export\s+const\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(content))) names.add(m[1]);
	while ((m = re2.exec(content))) names.add(m[1]);
	return [...names];
}

/** Local component references: JSX tags starting with an uppercase letter. */
function findRenders(content: string): string[] {
	const names = new Set<string>();
	const re = /<([A-Z]\w*)[\s/>]/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(content))) names.add(m[1]);
	return [...names];
}

/** Relative import specifiers: `import … from './x'` / `import('../y')`. */
export function findRelativeImports(content: string): string[] {
	const specs = new Set<string>();
	const re = /(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]/g;
	const re2 = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(content))) specs.add(m[1]);
	while ((m = re2.exec(content))) specs.add(m[1]);
	return [...specs];
}

/** SQL `create table foo` declarations. */
function findTables(content: string): string[] {
	const names = new Set<string>();
	const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["'`]?(\w+)["'`]?/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(content))) names.add(m[1]);
	return [...names];
}

/** HTTP handler exports: `export async function GET(` etc. */
function findHttpMethods(content: string): string[] {
	const methods = new Set<string>();
	const re = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(content))) methods.add(m[1]);
	return [...methods];
}

/** Resolve a relative import specifier from a source path to a concrete file path in the set. */
export function resolveImport(fromPath: string, spec: string, files: Set<string>): string | undefined {
	const dir = fromPath.slice(0, fromPath.lastIndexOf('/'));
	const parts = (dir ? dir + '/' + spec : spec).split('/');
	const stack: string[] = [];
	for (const part of parts) {
		if (part === '.' || part === '') continue;
		if (part === '..') stack.pop();
		else stack.push(part);
	}
	const bare = stack.join('/');
	const candidates = [bare, `${bare}.ts`, `${bare}.tsx`, `${bare}.js`, `${bare}.jsx`, `${bare}/index.ts`, `${bare}/index.tsx`];
	return candidates.find((c) => files.has(c));
}

export interface BuildInput {
	projectName: string;
	/** path -> file contents, the real workspace. */
	files: Record<string, string>;
	/** Live agents to surface as nodes (id + label). */
	agents?: { id: string; label: string }[];
}

/** Derive the project graph from real file contents. Pure and synchronous. */
export function buildGraph(input: BuildInput): ProjectGraph {
	const nodes = new Map<string, GraphNode>();
	const edges: GraphEdge[] = [];
	const add = (n: GraphNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); };
	const link = (from: string, to: string, kind: EdgeKind) => { edges.push({ from, to, kind }); };

	const projectId = `project:${input.projectName}`;
	add({ id: projectId, kind: 'project', label: input.projectName });

	const paths = Object.keys(input.files).sort();
	const fileSet = new Set(paths);
	const componentToFile = new Map<string, string>(); // component name -> defining file path

	for (const path of paths) {
		const content = input.files[path];
		const lines = content ? content.split('\n').length : 0;
		const fileId = `file:${path}`;
		add({ id: fileId, kind: 'file', label: basename(path), path, meta: { lines, lang: LANG[ext(path)] ?? (ext(path) || 'text') } });
		link(projectId, fileId, 'contains');

		// tests
		if (isTest(path)) {
			const id = `test:${path}`;
			add({ id, kind: 'test', label: basename(path), path });
			link(fileId, id, 'defines');
		}

		// routes
		if (isRouteFile(path)) {
			const rp = routePath(path);
			const id = `route:${rp}`;
			add({ id, kind: 'route', label: rp, path, meta: { file: path } });
			link(id, fileId, 'routes');
		}

		// endpoints
		if (isEndpointFile(path)) {
			const methods = findHttpMethods(content);
			const rp = routePath(path);
			const label = methods.length ? `${methods.join('/')} ${rp}` : rp;
			const id = `endpoint:${path}`;
			add({ id, kind: 'endpoint', label, path, meta: methods.length ? { methods: methods.join(', ') } : undefined });
			link(id, fileId, 'routes');
		}

		// database tables (from SQL)
		if (ext(path) === 'sql') {
			for (const t of findTables(content)) {
				const id = `table:${t}`;
				add({ id, kind: 'table', label: t, path });
				link(fileId, id, 'defines');
			}
		}

		// components (tsx/jsx only)
		if (/[tj]sx$/.test(path) && !isTest(path)) {
			for (const name of findComponents(content)) {
				const id = `component:${name}`;
				add({ id, kind: 'component', label: name, path });
				componentToFile.set(name, path);
				link(fileId, id, 'defines');
			}
		}
	}

	// Second pass: import edges (file -> file) and render edges (component -> component).
	for (const path of paths) {
		const content = input.files[path];
		const fileId = `file:${path}`;
		for (const spec of findRelativeImports(content)) {
			const target = resolveImport(path, spec, fileSet);
			if (target && target !== path) link(fileId, `file:${target}`, 'imports');
		}
		if (/[tj]sx$/.test(path) && !isTest(path)) {
			const defined = findComponents(content);
			for (const tag of findRenders(content)) {
				if (componentToFile.has(tag) && !defined.includes(tag)) {
					for (const owner of defined) link(`component:${owner}`, `component:${tag}`, 'renders');
					if (defined.length === 0) link(fileId, `component:${tag}`, 'renders');
				}
			}
		}
	}

	// Live agents as first-class nodes.
	for (const a of input.agents ?? []) {
		const id = `agent:${a.id}`;
		add({ id, kind: 'agent', label: a.label, meta: { status: 'idle' } });
		link(projectId, id, 'contains');
	}

	return { nodes, edges };
}

export interface Connections {
	readonly node: GraphNode;
	/** Neighbours reachable in one hop, grouped by kind, each with the connecting edge. */
	readonly neighbours: { node: GraphNode; edge: GraphEdge; direction: 'out' | 'in' }[];
}

/** Everything directly connected to a node — the click-through query. */
export function connected(graph: ProjectGraph, id: string): Connections | null {
	const node = graph.nodes.get(id);
	if (!node) return null;
	const seen = new Set<string>();
	const neighbours: Connections['neighbours'] = [];
	for (const edge of graph.edges) {
		if (edge.from === id) {
			const n = graph.nodes.get(edge.to);
			if (n && !seen.has(n.id)) { seen.add(n.id); neighbours.push({ node: n, edge, direction: 'out' }); }
		} else if (edge.to === id) {
			const n = graph.nodes.get(edge.from);
			if (n && !seen.has(n.id)) { seen.add(n.id); neighbours.push({ node: n, edge, direction: 'in' }); }
		}
	}
	return { node, neighbours };
}

/** Group a graph's nodes by kind, in display order, omitting empty kinds. */
export function groupByKind(graph: ProjectGraph): { kind: GraphKind; nodes: GraphNode[] }[] {
	const groups = new Map<GraphKind, GraphNode[]>();
	for (const n of graph.nodes.values()) {
		const arr = groups.get(n.kind) ?? [];
		arr.push(n);
		groups.set(n.kind, arr);
	}
	return KIND_ORDER
		.filter((k) => groups.has(k))
		.map((k) => ({ kind: k, nodes: groups.get(k)!.sort((a, b) => a.label.localeCompare(b.label)) }));
}
