// ---------------------------------------------------------------------------
// Terminal — an interactive shell over the virtual FileSystem.
//
// Commands actually run: `touch` adds a file the Explorer shows, `open` hands a
// file to the editor, `cat` prints what the editor is editing. Each pane keeps
// its own cwd + history (via ShellService). Input history with ↑/↓; click
// anywhere to focus.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useServices } from '../services/container';
import type { ShellLine } from '../services/shell';
import { Icon } from '../lib/icons';

const BANNER: ShellLine[] = [
	{ kind: 'sys', text: 'velocity shell — a real shell over the workspace filesystem' },
	{ kind: 'sys', text: "type 'help' for commands · try: ls · cat src/App.tsx · open src/App.tsx" },
];

export function TerminalMode({ paneId }: { paneId: string }) {
	const { shell } = useServices();
	const sh = useMemo(() => shell.for(paneId), [shell, paneId]);
	const [lines, setLines] = useState<ShellLine[]>(BANNER);
	const [input, setInput] = useState('');
	const [histIdx, setHistIdx] = useState(-1);
	const bodyRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Keep the newest output in view.
	useEffect(() => {
		const el = bodyRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [lines]);

	async function submit() {
		const raw = input;
		setInput('');
		setHistIdx(-1);
		const prompt: ShellLine = { kind: 'in', text: `${sh.promptPath()} $ ${raw}` };
		const result = await sh.run(raw);
		if (result.some((l) => l.kind === 'clear')) {
			setLines([]);
			return;
		}
		setLines((prev) => [...prev, prompt, ...result]);
	}

	function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void submit();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const h = sh.history;
			if (!h.length) {
				return;
			}
			const next = histIdx === -1 ? h.length - 1 : Math.max(0, histIdx - 1);
			setHistIdx(next);
			setInput(h[next]);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			const h = sh.history;
			if (histIdx === -1) {
				return;
			}
			const next = histIdx + 1;
			if (next >= h.length) {
				setHistIdx(-1);
				setInput('');
			} else {
				setHistIdx(next);
				setInput(h[next]);
			}
		}
	}

	return (
		<div className="term" onPointerDown={() => inputRef.current?.focus()}>
			<div className="term-body" ref={bodyRef}>
				{lines.map((l, i) => (
					<div key={i} className={`tl ${l.kind}`}>
						{l.text || ' '}
					</div>
				))}
				<div className="term-input">
					<span className="tp">{sh.promptPath()}</span>
					<span className="tg">$</span>
					<input
						ref={inputRef}
						value={input}
						spellCheck={false}
						autoCapitalize="off"
						autoComplete="off"
						aria-label="Terminal input"
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={onKey}
					/>
				</div>
			</div>
			<div className="term-foot">
				<Icon.terminal />
				<span>zsh · workspace fs</span>
				<span className="sp" />
				<span>{sh.promptPath()}</span>
			</div>
		</div>
	);
}
