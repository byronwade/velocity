// ---------------------------------------------------------------------------
// Browser — a real embedded browser (an <iframe>), minimal by design. The
// workspace tab above this pane IS the browser tab, so there is no internal
// tab strip: just a slim toolbar (back/forward/reload/home + address bar), a
// bookmarks row, and the page filling everything else. Navigating renames the
// workspace tab to the current site, so the top tab acts as the browser's tab.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useServices } from '../services/container';
import { useShell } from '../lib/store';
import { leaves } from '../lib/tree';
import { BROWSER_HOME, hostColor, normalizeUrl, titleFor } from '../services/browser';
import { startPage } from './browserStart';
import { Icon } from '../lib/icons';

const BOOKMARKS: Array<[string, string]> = [
	['Example', 'https://example.com'],
	['Wikipedia', 'https://en.wikipedia.org'],
	['MDN', 'https://developer.mozilla.org'],
	['Hacker News', 'https://news.ycombinator.com'],
	['GitHub', 'https://github.com'],
];

export function BrowserMode({ paneId }: { paneId: string }) {
	const { browser } = useServices();
	const theme = useShell((s) => s.theme);
	const state = useMemo(() => browser.for(paneId), [browser, paneId]);
	const [, bump] = useReducer((x: number) => x + 1, 0);
	const [loadKey, setLoadKey] = useState(0);
	const current = state.history[state.index];
	const [urlInput, setUrlInput] = useState(current === BROWSER_HOME ? '' : current);

	useEffect(() => {
		setUrlInput(current === BROWSER_HOME ? '' : current);
	}, [current]);

	// Reflect the page into the workspace tab title — but only for a tab that is
	// a single browser pane (don't hijack a split tab), and not the start page.
	useEffect(() => {
		if (current === BROWSER_HOME) {
			return;
		}
		const s = useShell.getState();
		const tab = s.tabs.find((t) => leaves(t.tree).some((l) => l.pane.id === paneId));
		if (tab && leaves(tab.tree).length === 1) {
			s.renameTab(tab.id, titleFor(current));
		}
	}, [current, paneId]);

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

	return (
		<div className="mode browser">
			<div className="chrome-bar">
				<button className="ib sm" title="Back" aria-label="Back" disabled={state.index === 0} onClick={back}><Icon.back /></button>
				<button className="ib sm" title="Forward" aria-label="Forward" disabled={state.index >= state.history.length - 1} onClick={forward}><Icon.forward /></button>
				<button className="ib sm" title="Reload" aria-label="Reload" onClick={() => setLoadKey((k) => k + 1)}><Icon.reload /></button>
				<button className="ib sm" title="Home" aria-label="Home" onClick={() => navigate(BROWSER_HOME)}><Icon.builder /></button>
				<form
					className="url"
					onSubmit={(e) => {
						e.preventDefault();
						navigate(urlInput);
					}}
				>
					{isStart ? <Icon.search /> : <Icon.lock />}
					<input value={urlInput} spellCheck={false} placeholder="Search or enter address" aria-label="Address" onChange={(e) => setUrlInput(e.target.value)} />
				</form>
			</div>

			<div className="bx-marks">
				{BOOKMARKS.map(([name, url]) => (
					<button className="bx-mark" key={url} title={url} onClick={() => navigate(url)}>
						<span className="fav" style={{ background: hostColor(url) }} />
						{name}
					</button>
				))}
			</div>

			<div className="browser-view">
				{isStart ? (
					<iframe key={`start-${theme}-${loadKey}`} className="frame" title="New tab" srcDoc={startPage(theme)} sandbox="allow-scripts" />
				) : (
					<iframe
						key={`${current}-${loadKey}`}
						className="frame"
						title={titleFor(current)}
						src={current}
						sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
						referrerPolicy="no-referrer"
					/>
				)}
			</div>
		</div>
	);
}
