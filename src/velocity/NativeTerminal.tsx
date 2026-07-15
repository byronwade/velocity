// ---------------------------------------------------------------------------
// NativeTerminal — xterm.js over a real PTY (desktop build only).
//
// The Rust side (src-tauri/src/pty.rs) owns the pseudo-terminal; this
// component renders its byte stream and sends keystrokes/resizes back. It is
// loaded lazily so the browser bundle never pays for xterm — the browser
// preview renders the workspace shell (TerminalMode) instead.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

function cssVar(name: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function NativeTerminal({ sessionId, shell }: { sessionId: string; shell: string }) {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		let disposed = false;
		const cleanups: (() => void)[] = [];

		const term = new Terminal({
			fontFamily: cssVar('--mono') || 'monospace',
			fontSize: 12.5,
			cursorBlink: true,
			theme: {
				background: cssVar('--panel') || '#ffffff',
				foreground: cssVar('--fg') || '#171717',
				cursor: cssVar('--fg') || '#171717',
				selectionBackground: cssVar('--line-2') || 'rgba(0,0,0,0.13)',
			},
		});
		const fit = new FitAddon();
		term.loadAddon(fit);
		term.open(host);
		fit.fit();

		void (async () => {
			const [{ invoke }, { listen }] = await Promise.all([
				import('@tauri-apps/api/core'),
				import('@tauri-apps/api/event'),
			]);
			if (disposed) return;

			const unOut = await listen<{ id: string; data: string }>('pty-output', (e) => {
				if (e.payload.id === sessionId) term.write(e.payload.data);
			});
			const unExit = await listen<string>('pty-exit', (e) => {
				if (e.payload === sessionId) term.write('\r\n\x1b[2m[session ended]\x1b[0m\r\n');
			});
			cleanups.push(unOut, unExit);

			try {
				await invoke('pty_spawn', { id: sessionId, shell, cols: term.cols, rows: term.rows, cwd: null });
			} catch (err) {
				term.write(`\x1b[2m${shell}: ${String(err)}\x1b[0m\r\n`);
				return;
			}

			const data = term.onData((d) => void invoke('pty_write', { id: sessionId, data: d }).catch(() => {}));
			cleanups.push(() => data.dispose());

			const ro = new ResizeObserver(() => {
				fit.fit();
				void invoke('pty_resize', { id: sessionId, cols: term.cols, rows: term.rows }).catch(() => {});
			});
			ro.observe(host);
			cleanups.push(() => ro.disconnect());
			cleanups.push(() => void invoke('pty_kill', { id: sessionId }).catch(() => {}));
		})();

		return () => {
			disposed = true;
			for (const fn of cleanups) fn();
			term.dispose();
		};
	}, [sessionId, shell]);

	return <div ref={hostRef} className="vs-xterm" />;
}
