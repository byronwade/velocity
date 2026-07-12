// ---------------------------------------------------------------------------
// Browser — a real embedded browser (an <iframe>, not a mockup).
//
// Working address bar, back/forward/reload/home with a real per-pane history
// stack. The start page is a self-contained srcdoc whose shortcuts post a
// message here so the URL bar stays in sync. Sites that forbid framing simply
// won't render — which is honest browser behavior, not a fake.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useServices } from '../services/container';
import { useShell } from '../lib/store';
import { BROWSER_HOME, normalizeUrl } from '../services/browser';
import { startPage } from './browserStart';
import { Icon } from '../lib/icons';

export function BrowserMode({ paneId }: { paneId: string }) {
	const { browser } = useServices();
	const theme = useShell((s) => s.theme);
	const state = useMemo(() => browser.for(paneId), [browser, paneId]);
	const [, bump] = useReducer((x: number) => x + 1, 0);
	const [loadKey, setLoadKey] = useState(0);
	const current = state.history[state.index];
	const [urlInput, setUrlInput] = useState(current === BROWSER_HOME ? '' : current);

	// Reflect the active history entry into the editable address field.
	useEffect(() => {
		setUrlInput(current === BROWSER_HOME ? '' : current);
	}, [current]);

	function navigate(raw: string) {
		const url = normalizeUrl(raw);
		if (url === current) {
			setLoadKey((k) => k + 1);
			return;
		}
		state.history = [...state.history.slice(0, state.index + 1), url];
		state.index = state.history.length - 1;
		bump();
	}

	function back() {
		if (state.index > 0) {
			state.index -= 1;
			bump();
		}
	}
	function forward() {
		if (state.index < state.history.length - 1) {
			state.index += 1;
			bump();
		}
	}

	// Start-page shortcuts navigate the parent via postMessage.
	useEffect(() => {
		function onMsg(e: MessageEvent) {
			const d = e.data;
			if (d && d.type === 'velocity-nav' && typeof d.url === 'string' && /^https?:\/\//i.test(d.url)) {
				navigate(d.url);
			}
		}
		window.addEventListener('message', onMsg);
		return () => window.removeEventListener('message', onMsg);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state]);

	const isStart = current === BROWSER_HOME;
	const host = isStart ? '' : safeHost(current);

	return (
		<div className="mode browser">
			<div className="chrome-bar">
				<button className="ib sm" title="Back" aria-label="Back" disabled={state.index === 0} onClick={back}><Icon.back /></button>
				<button className="ib sm" title="Forward" aria-label="Forward" disabled={state.index >= state.history.length - 1} onClick={forward}><Icon.forward /></button>
				<button className="ib sm" title="Reload" aria-label="Reload" onClick={() => setLoadKey((k) => k + 1)}><Icon.reload /></button>
				<form
					className="url"
					onSubmit={(e) => {
						e.preventDefault();
						navigate(urlInput);
					}}
				>
					<Icon.lock />
					<input
						value={urlInput}
						spellCheck={false}
						placeholder="Search or enter address"
						aria-label="Address"
						onChange={(e) => setUrlInput(e.target.value)}
					/>
					{host && <span className="host">{host}</span>}
				</form>
				<button className="ib sm" title="Home" aria-label="Home" onClick={() => navigate(BROWSER_HOME)}><Icon.builder /></button>
			</div>
			<div className="browser-view">
				{isStart ? (
					<iframe key={`start-${theme}-${loadKey}`} className="frame" title="New tab" srcDoc={startPage(theme)} sandbox="allow-scripts" />
				) : (
					<iframe
						key={`${current}-${loadKey}`}
						className="frame"
						title={current}
						src={current}
						sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
						referrerPolicy="no-referrer"
					/>
				)}
			</div>
		</div>
	);
}

function safeHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return '';
	}
}
