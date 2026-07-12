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

const COMMANDS = ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'open', 'tree', 'clear', 'date', 'whoami'];

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
			out('  clear           clear the screen      date · whoami'),
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
