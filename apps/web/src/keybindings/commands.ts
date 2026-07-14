// Command registry — every user-visible action is a named command with a stable
// id (VS Code-style, e.g. `editor.action.formatDocument`). Keybindings reference
// commands by id, and the command palette / shortcuts editor enumerate them.

export interface Command {
	id: string;
	title: string;
	category?: string;
	/** Optional gate; the command is inert (and greyed in UI) when false. */
	when?: string;
	run: (args?: unknown) => void | Promise<void>;
}

const registry = new Map<string, Command>();
const listeners = new Set<() => void>();

export function registerCommand(cmd: Command): void {
	registry.set(cmd.id, cmd);
	listeners.forEach((l) => l());
}

export function registerCommands(cmds: Command[]): void {
	for (const c of cmds) registry.set(c.id, c);
	listeners.forEach((l) => l());
}

export function getCommand(id: string): Command | undefined {
	return registry.get(id);
}

export function allCommands(): Command[] {
	return [...registry.values()];
}

export function runCommand(id: string, args?: unknown): boolean {
	const c = registry.get(id);
	if (!c) return false;
	void c.run(args);
	return true;
}

export function onCommandsChange(l: () => void): () => void {
	listeners.add(l);
	return () => listeners.delete(l);
}
