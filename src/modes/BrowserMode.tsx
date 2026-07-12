// ---------------------------------------------------------------------------
// Browser — a real embedded browser with Chrome-style chrome: a tab strip,
// a toolbar (back/forward/reload/home + address bar), and a bookmarks bar.
// Each tab is a real <iframe> with its own history. Sites that forbid framing
// simply won't render — honest browser behavior, not a fake.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useServices } from '../services/container';
import { useShell } from '../lib/store';
import { BROWSER_HOME, hostColor, newBrowserTab, normalizeUrl, titleFor, type BrowserTab } from '../services/browser';
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

	const tab = state.tabs[state.active];
	const current = tab.history[tab.index];
	const [urlInput, setUrlInput] = useState(current === BROWSER_HOME ? '' : current);

	useEffect(() => {
		setUrlInput(current === BROWSER_HOME ? '' : current);
	}, [current, state.active]);

	function navigate(raw: string) {
		const url = normalizeUrl(raw);
		if (url === current) {
			setLoadKey((k) => k + 1);
			return;
		}
		tab.history = [...tab.history.slice(0, tab.index + 1), url];
		tab.index = tab.history.length - 1;
		tab.title = titleFor(url);
		bump();
	}

	function back() {
		if (tab.index > 0) {
			tab.index -= 1;
			bump();
		}
	}
	function forward() {
		if (tab.index < tab.history.length - 1) {
			tab.index += 1;
			bump();
		}
	}
	function openTab() {
		state.tabs.push(newBrowserTab());
		state.active = state.tabs.length - 1;
		bump();
	}
	function closeTab(i: number) {
		if (state.tabs.length === 1) {
			state.tabs = [newBrowserTab()];
			state.active = 0;
		} else {
			state.tabs.splice(i, 1);
			state.active = Math.min(state.active, state.tabs.length - 1);
		}
		bump();
	}
	function selectTab(i: number) {
		state.active = i;
		bump();
	}

	// Start-page shortcuts post a message; navigate the active tab.
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
			<div className="bx-tabs">
				{state.tabs.map((t, i) => (
					<BxTab key={t.id} t={t} active={i === state.active} onSelect={() => selectTab(i)} onClose={() => closeTab(i)} />
				))}
				<button className="bx-newtab" title="New tab" aria-label="New browser tab" onClick={openTab}><Icon.plus /></button>
			</div>

			<div className="chrome-bar">
				<button className="ib sm" title="Back" aria-label="Back" disabled={tab.index === 0} onClick={back}><Icon.back /></button>
				<button className="ib sm" title="Forward" aria-label="Forward" disabled={tab.index >= tab.history.length - 1} onClick={forward}><Icon.forward /></button>
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
				<button className="ib sm" title="Menu" aria-label="Menu"><Icon.command /></button>
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
						key={`${tab.id}-${current}-${loadKey}`}
						className="frame"
						title={tab.title}
						src={current}
						sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
						referrerPolicy="no-referrer"
					/>
				)}
			</div>
		</div>
	);
}

function BxTab({ t, active, onSelect, onClose }: { t: BrowserTab; active: boolean; onSelect: () => void; onClose: () => void }) {
	const url = t.history[t.index];
	const isStart = url === BROWSER_HOME;
	return (
		<div className={`bx-tab${active ? ' active' : ''}`} onClick={onSelect} onAuxClick={(e) => { if (e.button === 1) { onClose(); } }} title={t.title}>
			{isStart ? <Icon.browser /> : <span className="fav" style={{ background: hostColor(url) }} />}
			<span className="bt-title">{t.title}</span>
			<button className="bt-x" aria-label="Close tab" onClick={(e) => { e.stopPropagation(); onClose(); }}><Icon.close /></button>
		</div>
	);
}
