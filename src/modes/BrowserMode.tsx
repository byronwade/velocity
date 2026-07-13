// ---------------------------------------------------------------------------
// Browser — a real embedded browser (an <iframe>) styled to look, act, and
// feel like a Google Chrome tab: a rounded tab strip, the Chrome nav cluster,
// a pill "omnibox" address bar with a lock/search glyph and a star, and the
// right-hand action cluster (extensions · profile · menu). Navigating renames
// the workspace tab and the on-screen Chrome tab to the current site's title.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useServices } from '../services/container';
import { useShell } from '../lib/store';
import { leaves } from '../lib/tree';
import { BROWSER_HOME, normalizeUrl, titleFor } from '../services/browser';
import { startPage } from './browserStart';
import { Icon } from '../lib/icons';

/** Hostname for a URL, for the tab favicon + omnibox. */
function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

/** A real favicon for the site (Chrome-style), falling back to a globe glyph. */
function FavIcon({ url, start }: { url: string; start: boolean }) {
	const host = hostOf(url);
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [host]);
	if (start || !host || failed) {
		return <span className="cr-fav cr-fav-globe"><Icon.browser /></span>;
	}
	return (
		<img
			className="cr-fav"
			src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
			alt=""
			width={16}
			height={16}
			onError={() => setFailed(true)}
		/>
	);
}

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
	const tabTitle = isStart ? 'New tab' : titleFor(current);

	return (
		<div className="mode browser chrome">
			{/* Chrome tab strip */}
			<div className="cr-tabs">
				<div className="cr-tab active" title={tabTitle}>
					<FavIcon url={current} start={isStart} />
					<span className="cr-tab-title">{tabTitle}</span>
					<button className="cr-tab-x" aria-label="New tab" title="New tab" onClick={() => navigate(BROWSER_HOME)}><Icon.close /></button>
				</div>
				<button className="cr-newtab" aria-label="New tab" title="New tab" onClick={() => navigate(BROWSER_HOME)}><Icon.plus /></button>
				<span className="cr-tabs-sp" />
			</div>

			{/* Chrome toolbar: nav cluster · omnibox · actions */}
			<div className="cr-toolbar">
				<div className="cr-nav">
					<button className="cr-icb" title="Back" aria-label="Back" disabled={state.index === 0} onClick={back}><Icon.back /></button>
					<button className="cr-icb" title="Forward" aria-label="Forward" disabled={state.index >= state.history.length - 1} onClick={forward}><Icon.forward /></button>
					<button className="cr-icb" title="Reload" aria-label="Reload" onClick={() => setLoadKey((k) => k + 1)}><Icon.reload /></button>
				</div>
				<form className="cr-omni" onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }}>
					<span className="cr-omni-lead">{isStart ? <Icon.search /> : <Icon.lock />}</span>
					<input value={urlInput} spellCheck={false} placeholder="Search Google or type a URL" aria-label="Address and search bar" onChange={(e) => setUrlInput(e.target.value)} />
					<button type="button" className="cr-star" title="Bookmark this tab" aria-label="Bookmark this tab"><Icon.star /></button>
				</form>
				<div className="cr-actions">
					<button className="cr-icb" title="Extensions" aria-label="Extensions"><Icon.puzzle /></button>
					<button className="cr-icb" title="Home" aria-label="Home" onClick={() => navigate(BROWSER_HOME)}><Icon.home /></button>
					<span className="cr-avatar" title="Profile" aria-hidden>B</span>
					<button className="cr-icb" title="Menu" aria-label="Menu"><Icon.dots /></button>
				</div>
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
