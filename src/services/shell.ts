// ---------------------------------------------------------------------------
// Shell — a real command interpreter over the virtual FileSystem.
//
// This is not a transcript of a terminal; it executes. `ls`, `cat`, `touch`,
// `mkdir`, `rm`, `mv`, `cp` read and mutate the SAME FileSystem the editor and
// Explorer use. It supports the pieces that make a shell feel real: quote-aware
// tokenizing, pipelines (`a | b`), output redirection (`> f`, `>> f`), command
// chaining (`&&`, `||`, `;`), environment variables (`export`, `$VAR`), and
// stdin-aware filters (grep/wc/head/tail/sort/uniq). Per-pane instances keep
// their own cwd, env, and history. A backend PTY is a future swap behind this.
// ---------------------------------------------------------------------------

import type { IFileSystem } from './filesystem';
import { normalizePath } from './filesystem';
import type { EditorService } from './editorService';
import { openFileInActivePane } from '../lib/openFile';

export interface ShellLine {
	kind: 'in' | 'out' | 'err' | 'sys' | 'clear';
	text: string;
}

const COMMANDS = ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'open', 'tree', 'grep', 'find', 'head', 'tail', 'wc', 'sort', 'uniq', 'env', 'export', 'which', 'history', 'clear', 'date', 'whoami'];

/** The result of one command stage. `out`/`err` are full text (may be multi-line). */
interface Res {
	out: string;
	err: string;
	code: number;
	clear?: boolean;
}

const ok = (out = ''): Res => ({ out, err: '', code: 0 });
const fail = (err: string): Res => ({ out: '', err, code: 1 });

/** Resolve `arg` against `cwd`, honoring '.', '..' and a leading '/'. */
function resolvePath(cwd: string, arg: string): string {
	const abs = arg.startsWith('/');
	const stack = abs ? [] : cwd ? cwd.split('/') : [];
	for (const part of normalizePath(arg).split('/')) {
		if (!part || part === '.') continue;
		if (part === '..') stack.pop();
		else stack.push(part);
	}
	return stack.join('/');
}

function basename(path: string): string {
	const i = path.lastIndexOf('/');
	return i === -1 ? path : path.slice(i + 1);
}

/** Split a line into tokens, honoring single/double quotes and treating the
 *  shell operators (| > >> && || ;) as standalone tokens even without spaces. */
function tokenize(line: string): string[] {
	const tokens: string[] = [];
	let cur = '';
	let quote: '"' | "'" | null = null;
	let has = false; // current token started (to preserve empty quoted strings)
	const push = () => { if (has || cur) { tokens.push(cur); } cur = ''; has = false; };
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (quote) {
			if (c === quote) quote = null;
			else cur += c;
			has = true;
			continue;
		}
		if (c === '"' || c === "'") { quote = c; has = true; continue; }
		if (c === ' ' || c === '\t') { push(); continue; }
		if (c === '|' && line[i + 1] === '|') { push(); tokens.push('||'); i++; continue; }
		if (c === '|') { push(); tokens.push('|'); continue; }
		if (c === '&' && line[i + 1] === '&') { push(); tokens.push('&&'); i++; continue; }
		if (c === '>' && line[i + 1] === '>') { push(); tokens.push('>>'); i++; continue; }
		if (c === '>') { push(); tokens.push('>'); continue; }
		if (c === ';') { push(); tokens.push(';'); continue; }
		cur += c;
		has = true;
	}
	push();
	return tokens;
}

const OPERATORS = new Set(['|', '>', '>>', '&&', '||', ';']);

export class Shell {
	cwd = '';
	private prevCwd = '';
	readonly history: string[] = [];
	private env: Record<string, string> = { HOME: '~', USER: 'velocity', SHELL: '/bin/velocity', PWD: '~' };

	constructor(
		private fs: IFileSystem,
		private editor: EditorService,
	) {}

	/** The prompt path, e.g. '~' at root or '~/src/lib'. */
	promptPath(): string {
		return this.cwd ? `~/${this.cwd}` : '~';
	}

	async run(raw: string): Promise<ShellLine[]> {
		const line = raw.trim();
		if (!line) return [];
		this.history.push(line);

		let tokens: string[];
		try {
			tokens = tokenize(line);
		} catch {
			return [{ kind: 'err', text: 'syntax error' }];
		}

		// Split into chained segments on ; && ||, remembering the joining operator.
		const segments: { op: ';' | '&&' | '||' | null; toks: string[] }[] = [];
		let curOp: ';' | '&&' | '||' | null = null;
		let buf: string[] = [];
		for (const t of tokens) {
			if (t === ';' || t === '&&' || t === '||') {
				segments.push({ op: curOp, toks: buf });
				curOp = t;
				buf = [];
			} else {
				buf.push(t);
			}
		}
		segments.push({ op: curOp, toks: buf });

		const lines: ShellLine[] = [];
		let lastCode = 0;
		for (const seg of segments) {
			if (seg.op === '&&' && lastCode !== 0) continue;
			if (seg.op === '||' && lastCode === 0) continue;
			if (!seg.toks.length) continue;
			const res = await this.runPipeline(seg.toks);
			if (res.clear) return [{ kind: 'clear', text: '' }];
			pushText(lines, res.out, 'out');
			pushText(lines, res.err, 'err');
			lastCode = res.code;
		}
		return lines;
	}

	/** Run a single pipeline (stages joined by `|`), applying trailing redirection. */
	private async runPipeline(toks: string[]): Promise<Res> {
		// Peel a trailing redirection: `> file` or `>> file` at the end.
		let redirect: { append: boolean; path: string } | null = null;
		const ri = Math.max(toks.lastIndexOf('>'), toks.lastIndexOf('>>'));
		if (ri !== -1) {
			const target = toks[ri + 1];
			if (!target || OPERATORS.has(target)) return fail('syntax error near redirection');
			redirect = { append: toks[ri] === '>>', path: resolvePath(this.cwd, target) };
			toks = toks.slice(0, ri);
		}

		// Split into pipeline stages.
		const stages: string[][] = [];
		let stage: string[] = [];
		for (const t of toks) {
			if (t === '|') { stages.push(stage); stage = []; }
			else stage.push(t);
		}
		stages.push(stage);

		let stdin: string | null = null;
		let last: Res = ok();
		for (let i = 0; i < stages.length; i++) {
			const st = stages[i];
			if (!st.length) return fail('syntax error near `|`');
			const cmd = st[0];
			const args = st.slice(1).map((a) => this.expand(a));
			// A stage whose output is consumed (piped onward or redirected to a file)
			// formats for machines — e.g. `ls` emits one entry per line, like a real
			// shell writing to a non-tty.
			const piped = i < stages.length - 1 || !!redirect;
			last = await this.exec(cmd, args, stdin, piped);
			if (last.clear) return last;
			// stderr from a mid-pipeline stage still surfaces; stdout pipes onward.
			stdin = last.out;
		}

		if (redirect && last.code === 0) {
			const prev = redirect.append && (await this.fs.exists(redirect.path)) ? await this.fs.readFile(redirect.path) : '';
			const body = last.out.endsWith('\n') || last.out === '' ? last.out : `${last.out}\n`;
			await this.fs.writeFile(redirect.path, `${prev}${body}`);
			return { out: '', err: last.err, code: last.code };
		}
		return last;
	}

	/** Expand $VAR / ${VAR} references from the environment. */
	private expand(arg: string): string {
		return arg.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, a, b) => this.env[a ?? b] ?? '');
	}

	// --- command dispatch --------------------------------------------------

	private async exec(cmd: string, args: string[], stdin: string | null, piped = false): Promise<Res> {
		try {
			switch (cmd) {
				case 'help': return ok(this.help());
				case 'pwd': return ok(`/${this.cwd}`);
				case 'ls': return await this.ls(args, piped);
				case 'cd': return await this.cd(args[0]);
				case 'cat': return await this.cat(args, stdin);
				case 'echo': return this.echo(args);
				case 'touch': return await this.touch(args);
				case 'mkdir': return await this.mkdir(args);
				case 'rm': return await this.rm(args);
				case 'mv': return await this.mvcp(args, true);
				case 'cp': return await this.mvcp(args, false);
				case 'open': return await this.open(args);
				case 'tree': return await this.tree();
				case 'grep': return await this.grep(args, stdin);
				case 'find': return await this.find(args);
				case 'head': return await this.headTail(args, stdin, true);
				case 'tail': return await this.headTail(args, stdin, false);
				case 'wc': return await this.wc(args, stdin);
				case 'sort': return await this.sortCmd(args, stdin);
				case 'uniq': return await this.uniqCmd(args, stdin);
				case 'env': return ok(Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n'));
				case 'export': return this.exportCmd(args);
				case 'which': return this.which(args);
				case 'history': return ok(this.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'));
				case 'clear': return { out: '', err: '', code: 0, clear: true };
				case 'date': return ok(new Date().toString());
				case 'whoami': return ok(this.env.USER ?? 'velocity');
				default: return fail(`command not found: ${cmd} — try 'help'`);
			}
		} catch (e) {
			return fail(e instanceof Error ? e.message : String(e));
		}
	}

	// --- commands ----------------------------------------------------------

	private help(): string {
		return [
			'Commands:',
			'  ls [dir]        list directory        cat <file>     print a file / stdin',
			'  cd <dir|->      change directory      open <file>    open in the editor',
			'  pwd             print working dir     tree           print the file tree',
			'  touch <file>    create a file         mkdir <dir>    create a directory',
			'  echo <text>     print text            rm [-r] <p>    remove',
			'  mv <a> <b>      move / rename         cp <a> <b>     copy',
			'  grep <pat> [f]  search text          find <name>    find paths',
			'  head/tail <f>   first/last lines      wc [file]      line/word/char count',
			'  sort · uniq     order / dedupe lines  env · export   environment vars',
			'  which <cmd>     locate a command      history · clear · date · whoami',
			'',
			'  Pipes a | b · redirect > file  >> file · chain with && || ;',
			'  Tab completes commands + paths · ↑/↓ history · Ctrl+L clears',
		].join('\n');
	}

	private async ls(args: string[], piped = false): Promise<Res> {
		const flags = args.filter((a) => a.startsWith('-'));
		const longFmt = flags.some((f) => f.includes('l'));
		const showAll = flags.some((f) => f.includes('a'));
		const pathArg = args.find((a) => !a.startsWith('-'));
		const target = pathArg ? resolvePath(this.cwd, pathArg) : this.cwd;
		const prefix = target ? `${target}/` : '';
		const files = await this.fs.list();
		const dirs = await this.fs.directories();
		const entries: { name: string; dir: boolean }[] = [];
		for (const d of dirs) {
			if (d.startsWith(prefix) && d.slice(prefix.length).indexOf('/') === -1 && d !== target && d.length > prefix.length) {
				entries.push({ name: basename(d), dir: true });
			}
		}
		for (const f of files) {
			if (f.startsWith(prefix) && f.slice(prefix.length).indexOf('/') === -1) {
				entries.push({ name: basename(f), dir: false });
			}
		}
		if (target && entries.length === 0 && !dirs.includes(target) && !files.some((f) => f.startsWith(prefix))) {
			// Maybe it's a file, not a directory.
			if (files.includes(target)) return ok(basename(target));
			return fail(`ls: no such file or directory: ${pathArg}`);
		}
		const visible = showAll ? entries : entries;
		visible.sort((a, b) => a.name.localeCompare(b.name));
		if (longFmt) {
			return ok(visible.map((e) => `${e.dir ? 'd' : '-'}rw-r--r--  ${e.dir ? `${e.name}/` : e.name}`).join('\n'));
		}
		const names = visible.map((e) => (e.dir ? `${e.name}/` : e.name));
		// One entry per line when piped/redirected (non-tty), a grid otherwise.
		return ok(names.join(piped ? '\n' : '   '));
	}

	private async cd(arg?: string): Promise<Res> {
		if (arg === '-') {
			const to = this.prevCwd;
			this.prevCwd = this.cwd;
			this.cwd = to;
			this.env.PWD = this.promptPath();
			return ok(`/${this.cwd}`);
		}
		const set = (next: string) => { this.prevCwd = this.cwd; this.cwd = next; this.env.PWD = this.promptPath(); };
		if (!arg || arg === '~' || arg === '/') { set(''); return ok(); }
		const target = resolvePath(this.cwd, arg);
		if (target === '') { set(''); return ok(); }
		const dirs = await this.fs.directories();
		if (!dirs.includes(target)) return fail(`cd: no such directory: ${arg}`);
		set(target);
		return ok();
	}

	private async cat(args: string[], stdin: string | null): Promise<Res> {
		const files = args.filter((a) => !a.startsWith('-'));
		if (!files.length) return ok(stdin ?? '');
		const parts: string[] = [];
		let err = '';
		for (const a of files) {
			const p = resolvePath(this.cwd, a);
			if (!(await this.fs.exists(p)) || !(await this.isFile(p))) { err += `cat: ${a}: no such file\n`; continue; }
			parts.push((await this.fs.readFile(p)).replace(/\n$/, ''));
		}
		return { out: parts.join('\n'), err: err.replace(/\n$/, ''), code: err ? 1 : 0 };
	}

	private echo(args: string[]): Res {
		const noNewline = args[0] === '-n';
		const text = (noNewline ? args.slice(1) : args).join(' ');
		return ok(noNewline ? text : text);
	}

	private async touch(args: string[]): Promise<Res> {
		if (!args.length) return fail('touch: missing file operand');
		for (const a of args) {
			const p = resolvePath(this.cwd, a);
			if (!(await this.fs.exists(p))) await this.fs.writeFile(p, '');
		}
		return ok();
	}

	private async mkdir(args: string[]): Promise<Res> {
		const targets = args.filter((a) => !a.startsWith('-'));
		if (!targets.length) return fail('mkdir: missing operand');
		for (const a of targets) await this.fs.mkdir(resolvePath(this.cwd, a));
		return ok();
	}

	private async rm(args: string[]): Promise<Res> {
		const targets = args.filter((a) => !a.startsWith('-'));
		const recursive = args.some((a) => a.startsWith('-') && a.includes('r'));
		if (!targets.length) return fail('rm: missing operand');
		const dirs = await this.fs.directories();
		for (const a of targets) {
			const p = resolvePath(this.cwd, a);
			const isDir = dirs.includes(p);
			if (isDir && !recursive) return fail(`rm: ${a}: is a directory (use -r)`);
			if (!(await this.fs.exists(p)) && !isDir) return fail(`rm: ${a}: no such file or directory`);
			await this.fs.delete(p);
		}
		return ok();
	}

	private async mvcp(args: string[], move: boolean): Promise<Res> {
		const name = move ? 'mv' : 'cp';
		const rest = args.filter((a) => !a.startsWith('-'));
		if (rest.length < 2) return fail(`${name}: expected <source> <dest>`);
		const src = resolvePath(this.cwd, rest[0]);
		const dest = resolvePath(this.cwd, rest[1]);
		if (!(await this.fs.exists(src)) || !(await this.isFile(src))) return fail(`${name}: ${rest[0]}: no such file`);
		// If dest is an existing directory, copy into it under the same basename.
		const dirs = await this.fs.directories();
		const finalDest = dirs.includes(dest) ? `${dest}/${basename(src)}` : dest;
		const content = await this.fs.readFile(src);
		await this.fs.writeFile(finalDest, content);
		if (move) await this.fs.delete(src);
		return ok();
	}

	private async open(args: string[]): Promise<Res> {
		if (!args.length) return fail('open: missing file operand');
		const p = resolvePath(this.cwd, args[0]);
		if (!(await this.fs.exists(p)) || !(await this.isFile(p))) return fail(`open: ${args[0]}: no such file`);
		openFileInActivePane(this.editor, p);
		return ok(`opened ${p} in the editor`);
	}

	private async tree(): Promise<Res> {
		const files = await this.fs.list();
		const root = this.cwd ? `${this.cwd}/` : '';
		const rel = files.filter((f) => f.startsWith(root)).map((f) => f.slice(root.length));
		rel.sort((a, b) => a.localeCompare(b));
		const lines = [this.cwd ? `${this.cwd}/` : '.'];
		for (const r of rel) {
			const depth = r.split('/').length - 1;
			lines.push(`${'  '.repeat(depth)}${depth ? '└ ' : ''}${basename(r)}`);
		}
		return ok(lines.join('\n'));
	}

	private async grep(args: string[], stdin: string | null): Promise<Res> {
		const rec = args.some((a) => a.startsWith('-') && a.includes('r'));
		const ci = args.some((a) => a.startsWith('-') && a.includes('i'));
		const showN = args.some((a) => a.startsWith('-') && a.includes('n'));
		const rest = args.filter((a) => !a.startsWith('-'));
		const pattern = rest[0];
		if (!pattern) return fail('grep: usage: grep [-rin] <pattern> [file]');
		const needle = ci ? pattern.toLowerCase() : pattern;
		const match = (l: string) => (ci ? l.toLowerCase() : l).includes(needle);

		// Filter stdin when no file is given.
		if (rest.length < 2 && stdin !== null && !rec) {
			const hits = stdin.split('\n').filter(match);
			return hits.length ? ok(hits.join('\n')) : { out: '', err: '', code: 1 };
		}

		const files = await this.fs.list();
		let targets: string[];
		if (rest[1]) targets = [resolvePath(this.cwd, rest[1])];
		else {
			const prefix = this.cwd ? `${this.cwd}/` : '';
			targets = rec ? files.filter((f) => f.startsWith(prefix)) : files.filter((f) => f.startsWith(prefix) && f.slice(prefix.length).indexOf('/') === -1);
		}
		const out: string[] = [];
		for (const p of targets) {
			if (!files.includes(p)) continue;
			(await this.fs.readFile(p)).split('\n').forEach((l, i) => {
				if (match(l)) out.push(`${targets.length > 1 || rec ? `${basename(p)}:` : ''}${showN ? `${i + 1}:` : ''} ${l.trim()}`.trim());
			});
		}
		return out.length ? ok(out.join('\n')) : { out: '', err: '', code: 1 };
	}

	private async find(args: string[]): Promise<Res> {
		const term = (args.find((a) => !a.startsWith('-')) ?? '').toLowerCase();
		const files = await this.fs.list();
		const dirs = await this.fs.directories();
		const prefix = this.cwd ? `${this.cwd}/` : '';
		const all = [...dirs.map((d) => `${d}/`), ...files].filter((p) => p.startsWith(prefix));
		const hits = all.filter((p) => !term || basename(p.replace(/\/$/, '')).toLowerCase().includes(term)).sort();
		return hits.length ? ok(hits.map((p) => `./${p}`).join('\n')) : ok('');
	}

	private async headTail(args: string[], stdin: string | null, head: boolean): Promise<Res> {
		let n = 10;
		const ni = args.indexOf('-n');
		if (ni !== -1 && args[ni + 1]) n = Math.max(1, parseInt(args[ni + 1], 10) || 10);
		// The `-N` shorthand (e.g. `head -5`, `tail -3`).
		const short = args.find((a) => /^-\d+$/.test(a));
		if (short) n = Math.max(1, parseInt(short.slice(1), 10));
		const file = args.find((a, i) => !a.startsWith('-') && (i === 0 || args[i - 1] !== '-n'));
		let all: string[];
		if (file) {
			const p = resolvePath(this.cwd, file);
			if (!(await this.isFile(p))) return fail(`${head ? 'head' : 'tail'}: ${file}: no such file`);
			all = (await this.fs.readFile(p)).replace(/\n$/, '').split('\n');
		} else if (stdin !== null) {
			all = stdin.replace(/\n$/, '').split('\n');
		} else {
			return fail(`${head ? 'head' : 'tail'}: missing file operand`);
		}
		return ok((head ? all.slice(0, n) : all.slice(-n)).join('\n'));
	}

	private async wc(args: string[], stdin: string | null): Promise<Res> {
		const onlyLines = args.some((a) => a.startsWith('-') && a.includes('l'));
		const onlyWords = args.some((a) => a.startsWith('-') && a.includes('w'));
		const file = args.find((a) => !a.startsWith('-'));
		let content: string;
		let label = '';
		if (file) {
			const p = resolvePath(this.cwd, file);
			if (!(await this.isFile(p))) return fail(`wc: ${file}: no such file`);
			content = await this.fs.readFile(p);
			label = `  ${file}`;
		} else if (stdin !== null) {
			content = stdin;
		} else {
			return fail('wc: missing file operand');
		}
		const lines = content ? content.replace(/\n$/, '').split('\n').length : 0;
		const words = content.split(/\s+/).filter(Boolean).length;
		if (onlyLines) return ok(String(lines));
		if (onlyWords) return ok(String(words));
		return ok(`${String(lines).padStart(6)} ${String(words).padStart(6)} ${String(content.length).padStart(6)}${label}`);
	}

	private async sortCmd(args: string[], stdin: string | null): Promise<Res> {
		const reverse = args.some((a) => a.startsWith('-') && a.includes('r'));
		const numeric = args.some((a) => a.startsWith('-') && a.includes('n'));
		const text = await this.textFrom(args, stdin);
		if (text === null) return fail('sort: missing input');
		let lines = text.replace(/\n$/, '').split('\n');
		lines = lines.sort(numeric ? (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) : (a, b) => a.localeCompare(b));
		if (reverse) lines.reverse();
		return ok(lines.join('\n'));
	}

	private async uniqCmd(args: string[], stdin: string | null): Promise<Res> {
		const count = args.some((a) => a.startsWith('-') && a.includes('c'));
		const text = await this.textFrom(args, stdin);
		if (text === null) return fail('uniq: missing input');
		const lines = text.replace(/\n$/, '').split('\n');
		const out: string[] = [];
		let prev: string | null = null;
		let run = 0;
		for (const l of lines) {
			if (l === prev) { run++; continue; }
			if (prev !== null) out.push(count ? `${String(run).padStart(4)} ${prev}` : prev);
			prev = l;
			run = 1;
		}
		if (prev !== null) out.push(count ? `${String(run).padStart(4)} ${prev}` : prev);
		return ok(out.join('\n'));
	}

	/** Text input for a filter: the named file, else stdin. */
	private async textFrom(args: string[], stdin: string | null): Promise<string | null> {
		const file = args.find((a) => !a.startsWith('-'));
		if (file) {
			const p = resolvePath(this.cwd, file);
			if (await this.isFile(p)) return this.fs.readFile(p);
			return '';
		}
		return stdin;
	}

	private exportCmd(args: string[]): Res {
		for (const a of args) {
			const eq = a.indexOf('=');
			if (eq === -1) continue;
			const key = a.slice(0, eq);
			const val = this.expand(a.slice(eq + 1));
			if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) this.env[key] = val;
		}
		return ok();
	}

	private which(args: string[]): Res {
		const name = args[0];
		if (!name) return fail('which: missing command');
		return COMMANDS.includes(name) ? ok(`${name}: shell builtin`) : { out: '', err: `which: ${name} not found`, code: 1 };
	}

	/** Completion candidates for the terminal UI: commands or paths in cwd. */
	async complete(token: string, isFirst: boolean): Promise<string[]> {
		if (isFirst && !token.includes('/')) return COMMANDS.filter((c) => c.startsWith(token));
		const slash = token.lastIndexOf('/');
		const dirPart = slash === -1 ? '' : token.slice(0, slash);
		const base = slash === -1 ? token : token.slice(slash + 1);
		const target = dirPart ? resolvePath(this.cwd, dirPart) : this.cwd;
		const prefix = target ? `${target}/` : '';
		const files = await this.fs.list();
		const dirs = await this.fs.directories();
		const names = new Set<string>();
		for (const d of dirs) if (d.startsWith(prefix) && d.slice(prefix.length).indexOf('/') === -1 && d.length > prefix.length) names.add(`${basename(d)}/`);
		for (const f of files) if (f.startsWith(prefix) && f.slice(prefix.length).indexOf('/') === -1) names.add(basename(f));
		const pre = dirPart ? `${dirPart}/` : '';
		return [...names].filter((n) => n.startsWith(base)).map((n) => `${pre}${n}`).sort();
	}

	private async isFile(path: string): Promise<boolean> {
		const files = await this.fs.list();
		return files.includes(path);
	}
}

/** Append `text` (possibly multi-line) to `lines` as ShellLines of `kind`. */
function pushText(lines: ShellLine[], text: string, kind: 'out' | 'err'): void {
	if (!text) return;
	for (const l of text.replace(/\n$/, '').split('\n')) lines.push({ kind, text: l });
}

// --- per-pane vending -----------------------------------------------------

export class ShellService {
	private shells = new Map<string, Shell>();

	constructor(
		private fs: IFileSystem,
		private editor: EditorService,
	) {}

	for(paneId: string): Shell {
		let s = this.shells.get(paneId);
		if (!s) {
			s = new Shell(this.fs, this.editor);
			this.shells.set(paneId, s);
		}
		return s;
	}

	release(paneId: string): void {
		this.shells.delete(paneId);
	}
}

export { COMMANDS };
