// ---------------------------------------------------------------------------
// ObservabilityService — the Observe studio's data source.
//
// Real telemetry from the running workspace: uncaught errors, unhandled promise
// rejections, failed resource loads, and console output — captured through the
// browser's own machinery (window error events + a console wrapper), never
// fabricated. Callers (e.g. the agent) can also record operational events.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';

export type LogLevel = 'error' | 'warn' | 'info' | 'log';

export interface LogEntry {
	id: number;
	level: LogLevel;
	message: string;
	source?: string;
	/** HH:MM:SS wall-clock of capture. */
	time: string;
}

const MAX = 300;

function stamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function stringify(v: unknown): string {
	if (typeof v === 'string') return v;
	if (v instanceof Error) return v.message;
	try { return JSON.stringify(v); } catch { return String(v); }
}

export class ObservabilityService {
	private entries: LogEntry[] = [];
	private seq = 0;
	private rev = 0;
	private installed = false;
	private listeners = new Set<() => void>();

	/** Attach to real browser sources. Idempotent; safe outside a browser. */
	install(): void {
		if (this.installed || typeof window === 'undefined') return;
		this.installed = true;

		// Uncaught errors — including resource load failures (capture phase).
		window.addEventListener('error', (e: ErrorEvent | Event) => {
			const ev = e as ErrorEvent;
			if (ev.message) {
				this.record('error', ev.message, ev.filename ? `${ev.filename.split('/').pop()}:${ev.lineno}` : 'window');
			} else {
				const t = (e.target as HTMLElement | null);
				if (t && 'src' in t) {
					this.record('error', `Failed to load resource: ${(t as HTMLImageElement).src}`, 'network');
				}
			}
		}, true);

		window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
			this.record('error', `Unhandled rejection: ${stringify(e.reason)}`, 'promise');
		});

		// Wrap console so real logs are captured, then forwarded to the original.
		const wrap = (level: LogLevel, orig: (...a: unknown[]) => void) => (...args: unknown[]) => {
			this.record(level, args.map(stringify).join(' '), 'console');
			orig.apply(console, args);
		};
		console.error = wrap('error', console.error.bind(console));
		console.warn = wrap('warn', console.warn.bind(console));
		console.info = wrap('info', console.info.bind(console));
	}

	/** Record an event from any source (also used by the browser hooks above). */
	record(level: LogLevel, message: string, source?: string): void {
		this.entries.push({ id: this.seq++, level, message, source, time: stamp() });
		if (this.entries.length > MAX) {
			this.entries.splice(0, this.entries.length - MAX);
		}
		this.bump();
	}

	clear(): void {
		this.entries = [];
		this.bump();
	}

	get(): LogEntry[] {
		return this.entries;
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

export function useObservability(): LogEntry[] {
	const { observability } = useServices();
	useSyncExternalStore(observability.subscribe, observability.getSnapshot);
	return observability.get();
}
