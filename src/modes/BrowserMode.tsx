// ---------------------------------------------------------------------------
// Browser — a real, working embedded browser with Chrome's look and feel.
//
// The workspace tab above this pane IS the browser's page tab (there's no
// second tab strip). A local address (localhost / 127.0.0.1) renders the LIVE
// workspace app preview — a real, interactive page built from the project's
// files — so the browser actually runs what you're building. External http(s)
// addresses load in a sandboxed iframe (best-effort: sites that permit framing
// render inline; those that don't get an "open externally" affordance).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useServices } from '../services/container';
import { useShell } from '../lib/store';
import { leaves } from '../lib/tree';
import { BROWSER_HOME, isLocalUrl, normalizeUrl, titleFor } from '../services/browser';
import { usePreview } from '../services/preview';
import { startPage } from './browserStart';
import { Icon } from '../lib/icons';

export function BrowserMode({ paneId }: { paneId: string }) {
	const { browser } = useServices();
	const theme = useShell((s) => s.theme);
	const previewHtml = usePreview();
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
	const isLocal = !isStart && isLocalUrl(current);
	const isExternal = !isStart && !isLocal;

	return (
		<div className="mode browser chrome">
			{/* Chrome toolbar: nav cluster · omnibox · actions. The page tab is the
			    workspace tab above this pane. */}
			<div className="cr-toolbar">
				<div className="cr-nav">
					<button className="cr-icb" title="Back" aria-label="Back" disabled={state.index === 0} onClick={back}><Icon.back /></button>
					<button className="cr-icb" title="Forward" aria-label="Forward" disabled={state.index >= state.history.length - 1} onClick={forward}><Icon.forward /></button>
					<button className="cr-icb" title="Reload" aria-label="Reload" onClick={() => setLoadKey((k) => k + 1)}><Icon.reload /></button>
				</div>
				<form className="cr-omni" onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }}>
					<span className="cr-omni-lead">{isStart ? <Icon.search /> : <Icon.lock />}</span>
					<input value={urlInput} spellCheck={false} placeholder="Search or type a URL — try localhost:3000" aria-label="Address and search bar" onChange={(e) => setUrlInput(e.target.value)} />
					{isLocal && <span className="cr-live" title="Live workspace preview">● Live</span>}
					<button type="button" className="cr-star" title="Bookmark this tab" aria-label="Bookmark this tab"><Icon.star /></button>
				</form>
				<div className="cr-actions">
					<button className="cr-icb" title="Extensions" aria-label="Extensions"><Icon.puzzle /></button>
					<button className="cr-icb" title="Home" aria-label="Home" onClick={() => navigate(BROWSER_HOME)}><Icon.home /></button>
					{isExternal && <a className="cr-icb" title="Open in a new tab" aria-label="Open externally" href={current} target="_blank" rel="noreferrer noopener"><Icon.share /></a>}
					<span className="cr-avatar" title="Profile" aria-hidden>B</span>
					<button className="cr-icb" title="Menu" aria-label="Menu"><Icon.dots /></button>
				</div>
			</div>

			<div className="browser-view">
				{isStart && (
					<iframe key={`start-${theme}-${loadKey}`} className="frame" title="New tab" srcDoc={startPage(theme)} sandbox="allow-scripts" />
				)}
				{isLocal && (
					<iframe key={`local-${loadKey}-${previewHtml.length}`} className="frame" title="Live preview" srcDoc={previewHtml} sandbox="allow-scripts allow-forms" />
				)}
				{isExternal && (
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
