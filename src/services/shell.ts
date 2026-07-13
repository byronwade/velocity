// ---------------------------------------------------------------------------
// Shell — a real command interpreter over the virtual FileSystem.
//
// This is not a transcript of a terminal; it executes. `ls`, `cat`, `touch`,
// `mkdir`, `rm`, `mv`, `cp` read and mutate the SAME FileSystem the editor and
// Explorer use, so a `touch` shows up in the tree and `open` hands a file to the
// editor. Per-pane instances keep their own cwd and history. A backend PTY (for
// a real system shell) is a future swap behind this same surface.
// ---------------------------------------------------------------------------

import type { IFileSystem } from './filesystem';
import { normalizePath } from './filesystem';
import type { EditorService } from './editorService';
import { openFileInActivePane } from '../lib/openFile';

export interface ShellLine {
	kind: 'in' | 'out' | 'err' | 'sys' | 'clear';
	text: string;
}

const COMMANDS = ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'open', 'tree', 'grep', 'find', 'head', 'tail', 'wc', 'history', 'clear', 'date', 'whoami'];

/** Resolve `arg` against `cwd`, honoring '.', '..' and a leading '/'. */
function resolvePath(cwd: string, arg: string): string {
	const abs = arg.startsWith('/');
	const stack = abs ? [] : cwd ? cwd.split('/') : [];
	for (const part of normalizePath(arg).split('/')) {
		if (!part || part === '.') {
			continue;
		}
		if (part === '..') {
			stack.pop();
		} else {
			stack.push(part);
		}
	}
	return stack.join('/');
}

function basename(path: string): string {
	const i = path.lastIndexOf('/');
	return i === -1 ? path : path.slice(i + 1);
}

export class Shell {
	cwd = '';
	readonly history: string[] = [];

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
		if (!line) {
			return [];
		}
		this.history.push(line);
		const tokens = line.split(/\s+/);
		const cmd = tokens[0];
		const args = tokens.slice(1);
		try {
			switch (cmd) {
				case 'help':
					return this.help();
				case 'pwd':
					return [out(`/${this.cwd}`)];
				case 'ls':
					return await this.ls(args);
				case 'cd':
					return await this.cd(args[0]);
				case 'cat':
					return await this.cat(args);
				case 'echo':
					return await this.echo(args);
				case 'touch':
					return await this.touch(args);
				case 'mkdir':
					return await this.mkdir(args);
				case 'rm':
					return await this.rm(args);
				case 'mv':
					return await this.mvcp(args, true);
				case 'cp':
					return await this.mvcp(args, false);
				case 'open':
					return await this.open(args);
				case 'tree':
					return await this.tree();
				case 'grep':
					return await this.grep(args);
				case 'find':
					return await this.find(args);
				case 'head':
					return await this.headTail(args, true);
				case 'tail':
					return await this.headTail(args, false);
				case 'wc':
					return await this.wc(args);
				case 'history':
					return this.history.map((h, i) => out(`${String(i + 1).padStart(4)}  ${h}`));
				case 'clear':
					return [{ kind: 'clear', text: '' }];
				case 'date':
					return [out(new Date().toString())];
				case 'whoami':
					return [out('velocity')];
				default:
					return [err(`command not found: ${cmd} — try 'help'`)];
			}
		} catch (e) {
			return [err(e instanceof Error ? e.message : String(e))];
		}
	}

	// --- commands ----------------------------------------------------------

	private help(): ShellLine[] {
		return [
			out('Commands:'),
			out('  ls [dir]        list directory        cat <file>     print a file'),
			out('  cd <dir>        change directory      open <file>    open in the editor'),
			out('  pwd             print working dir     tree           print the file tree'),
			out('  touch <file>    create a file         mkdir <dir>    create a directory'),
			out('  echo <t> > f    write text to file    rm [-r] <p>    remove'),
			out('  mv <a> <b>      move / rename         cp <a> <b>     copy'),
			out('  grep <pat> [f]  search text          find <name>    find paths'),
			out('  head/tail <f>   first/last lines      wc <file>      line/word/char count'),
			out('  history         command history       clear · date · whoami'),
			out('  Tab completes commands + paths · ↑/↓ history'),
		];
	}

	private async ls(args: string[]): Promise<ShellLine[]> {
		const target = args[0] ? resolvePath(this.cwd, args[0]) : this.cwd;
		const prefix = target ? `${target}/` : '';
		const files = await this.fs.list();
		const dirs = await this.fs.directories();
		const entries = new Set<string>();
		for (const d of dirs) {
			if (d.startsWith(prefix) && d.slice(prefix.length).indexOf('/') === -1 && d !== target && d.length > prefix.length) {
				entries.add(`${basename(d)}/`);
			}
		}
		for (const f of files) {
			if (f.startsWith(prefix) && f.slice(prefix.length).indexOf('/') === -1) {
				entries.add(basename(f));
			}
		}
		if (target && entries.size === 0 && !dirs.includes(target) && !files.some((f) => f.startsWith(prefix))) {
			return [err(`ls: no such directory: ${args[0]}`)];
		}
		const sorted = [...entries].sort((a, b) => a.localeCompare(b));
		return sorted.length ? [out(sorted.join('   '))] : [];
	}

	private async cd(arg?: string): Promise<ShellLine[]> {
		if (!arg || arg === '~' || arg === '/') {
			this.cwd = '';
			return [];
		}
		const target = resolvePath(this.cwd, arg);
		if (target === '') {
			this.cwd = '';
			return [];
		}
		const dirs = await this.fs.directories();
		if (!dirs.includes(target)) {
			return [err(`cd: no such directory: ${arg}`)];
		}
		this.cwd = target;
		return [];
	}

	private async cat(args: string[]): Promise<ShellLine[]> {
		if (!args.length) {
			return [err('cat: missing file operand')];
		}
		const lines: ShellLine[] = [];
		for (const a of args) {
			const p = resolvePath(this.cwd, a);
			if (!(await this.fs.exists(p)) || !(await this.isFile(p))) {
				lines.push(err(`cat: ${a}: no such file`));
				continue;
			}
			const content = await this.fs.readFile(p);
			for (const l of content.replace(/\n$/, '').split('\n')) {
				lines.push(out(l));
			}
		}
		return lines;
	}

	private async echo(args: string[]): Promise<ShellLine[]> {
		const redir = args.findIndex((a) => a === '>' || a === '>>');
		if (redir === -1) {
			return [out(args.join(' '))];
		}
		const text = args.slice(0, redir).join(' ');
		const targetArg = args[redir + 1];
		if (!targetArg) {
			return [err('echo: missing redirection target')];
		}
		const p = resolvePath(this.cwd, targetArg);
		const append = args[redir] === '>>';
		const prev = append && (await this.fs.exists(p)) ? await this.fs.readFile(p) : '';
		await this.fs.writeFile(p, `${prev}${text}\n`);
		return [];
	}

	private async touch(args: string[]): Promise<ShellLine[]> {
		if (!args.length) {
			return [err('touch: missing file operand')];
		}
		for (const a of args) {
			const p = resolvePath(this.cwd, a);
			if (!(await this.fs.exists(p))) {
				await this.fs.writeFile(p, '');
			}
		}
		return [];
	}

	private async mkdir(args: string[]): Promise<ShellLine[]> {
		if (!args.length) {
			return [err('mkdir: missing operand')];
		}
		for (const a of args) {
			await this.fs.mkdir(resolvePath(this.cwd, a));
		}
		return [];
	}

	private async rm(args: string[]): Promise<ShellLine[]> {
		const targets = args.filter((a) => a !== '-r' && a !== '-rf' && a !== '-f');
		if (!targets.length) {
			return [err('rm: missing operand')];
		}
		for (const a of targets) {
			const p = resolvePath(this.cwd, a);
			if (!(await this.fs.exists(p))) {
				return [err(`rm: ${a}: no such file or directory`)];
			}
			await this.fs.delete(p);
		}
		return [];
	}

	private async mvcp(args: string[], move: boolean): Promise<ShellLine[]> {
		const name = move ? 'mv' : 'cp';
		if (args.length < 2) {
			return [err(`${name}: expected <source> <dest>`)];
		}
		const src = resolvePath(this.cwd, args[0]);
		const dest = resolvePath(this.cwd, args[1]);
		if (!(await this.fs.exists(src)) || !(await this.isFile(src))) {
			return [err(`${name}: ${args[0]}: no such file`)];
		}
		const content = await this.fs.readFile(src);
		await this.fs.writeFile(dest, content);
		if (move) {
			await this.fs.delete(src);
		}
		return [];
	}

	private async open(args: string[]): Promise<ShellLine[]> {
		if (!args.length) {
			return [err('open: missing file operand')];
		}
		const p = resolvePath(this.cwd, args[0]);
		if (!(await this.fs.exists(p)) || !(await this.isFile(p))) {
			return [err(`open: ${args[0]}: no such file`)];
		}
		openFileInActivePane(this.editor, p);
		return [{ kind: 'sys', text: `opened ${p} in the editor` }];
	}

	private async tree(): Promise<ShellLine[]> {
		const files = await this.fs.list();
		const root = this.cwd ? `${this.cwd}/` : '';
		const rel = files.filter((f) => f.startsWith(root)).map((f) => f.slice(root.length));
		const lines: ShellLine[] = [out(this.cwd ? `${this.cwd}/` : '.')];
		rel.sort((a, b) => a.localeCompare(b));
		for (const r of rel) {
			const depth = r.split('/').length - 1;
			lines.push(out(`${'  '.repeat(depth)}${depth ? '└ ' : ''}${basename(r)}`));
		}
		return lines;
	}

	private async grep(args: string[]): Promise<ShellLine[]> {
		const rec = args.includes('-r') || args.includes('-rn');
		const rest = args.filter((a) => a !== '-r' && a !== '-rn' && a !== '-n' && a !== '-i');
		const ci = args.includes('-i');
		const pattern = rest[0];
		if (!pattern) return [err('grep: usage: grep [-r] [-i] <pattern> [file]')];
		const needle = ci ? pattern.toLowerCase() : pattern;
		const files = await this.fs.list();
		let targets: string[];
		if (rest[1]) {
			targets = [resolvePath(this.cwd, rest[1])];
		} else {
			const prefix = this.cwd ? `${this.cwd}/` : '';
			targets = rec ? files.filter((f) => f.startsWith(prefix)) : files.filter((f) => f.startsWith(prefix) && f.slice(prefix.length).indexOf('/') === -1);
		}
		const lines: ShellLine[] = [];
		for (const p of targets) {
			if (!files.includes(p)) continue;
			const content = await this.fs.readFile(p);
			content.split('\n').forEach((l, i) => {
				const hay = ci ? l.toLowerCase() : l;
				if (hay.includes(needle)) lines.push(out(`${basename(p)}:${i + 1}: ${l.trim()}`));
			});
		}
		return lines.length ? lines : [out('(no matches)')];
	}

	private async find(args: string[]): Promise<ShellLine[]> {
		const term = (args[0] ?? '').toLowerCase();
		const files = await this.fs.list();
		const dirs = await this.fs.directories();
		const prefix = this.cwd ? `${this.cwd}/` : '';
		const all = [...dirs.map((d) => `${d}/`), ...files].filter((p) => p.startsWith(prefix));
		const hits = all.filter((p) => !term || basename(p.replace(/\/$/, '')).toLowerCase().includes(term)).sort();
		return hits.length ? hits.map((p) => out(`./${p}`)) : [out('(nothing found)')];
	}

	private async headTail(args: string[], head: boolean): Promise<ShellLine[]> {
		let n = 10;
		const ni = args.indexOf('-n');
		if (ni !== -1 && args[ni + 1]) n = Math.max(1, parseInt(args[ni + 1], 10) || 10);
		const file = args.find((a, i) => a !== '-n' && (i === 0 ? true : args[i - 1] !== '-n') && !a.startsWith('-'));
		if (!file) return [err(`${head ? 'head' : 'tail'}: missing file operand`)];
		const p = resolvePath(this.cwd, file);
		if (!(await this.isFile(p))) return [err(`${head ? 'head' : 'tail'}: ${file}: no such file`)];
		const all = (await this.fs.readFile(p)).replace(/\n$/, '').split('\n');
		const slice = head ? all.slice(0, n) : all.slice(-n);
		return slice.map((l) => out(l));
	}

	private async wc(args: string[]): Promise<ShellLine[]> {
		if (!args[0]) return [err('wc: missing file operand')];
		const p = resolvePath(this.cwd, args[0]);
		if (!(await this.isFile(p))) return [err(`wc: ${args[0]}: no such file`)];
		const content = await this.fs.readFile(p);
		const lines = content ? content.replace(/\n$/, '').split('\n').length : 0;
		const words = content.split(/\s+/).filter(Boolean).length;
		return [out(`${String(lines).padStart(6)} ${String(words).padStart(6)} ${String(content.length).padStart(6)}  ${args[0]}`)];
	}

	/** Completion candidates for the terminal UI: commands or paths in cwd. */
	async complete(token: string, isFirst: boolean): Promise<string[]> {
		if (isFirst && !token.includes('/')) {
			return COMMANDS.filter((c) => c.startsWith(token));
		}
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

function out(text: string): ShellLine {
	return { kind: 'out', text };
}
function err(text: string): ShellLine {
	return { kind: 'err', text };
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
