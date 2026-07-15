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

import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
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
	const [loading, setLoading] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [zoom, setZoom] = useState(1);
	const inputRef = useRef<HTMLInputElement>(null);
	const zoomBy = (d: number) => setZoom((z) => Math.max(0.25, Math.min(3, Math.round((z + d) * 100) / 100)));
	const current = state.history[state.index];
	const [urlInput, setUrlInput] = useState(current === BROWSER_HOME ? '' : current);
	useSyncExternalStore(browser.subscribe, browser.getSnapshot);
	const bookmarks = browser.getBookmarks();
	// Most real sites refuse to be embedded (X-Frame-Options / CSP). Rather than
	// show the browser's ugly "refused to connect", offer a clean card; users can
	// open the page in a real tab, or try embedding anyway.
	const [tryFrame, setTryFrame] = useState(false);
	useEffect(() => { setTryFrame(false); }, [current]);

	// Dismiss the browser menu on outside click.
	useEffect(() => {
		if (!menuOpen) return;
		const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.cr-menu-wrap')) setMenuOpen(false); };
		document.addEventListener('mousedown', close);
		return () => document.removeEventListener('mousedown', close);
	}, [menuOpen]);

	// Show a loading bar until the frame reports load (or a short timeout).
	useEffect(() => {
		setLoading(true);
		const t = window.setTimeout(() => setLoading(false), 1600);
		return () => window.clearTimeout(t);
	}, [current, loadKey]);

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
		// The agent's navigate_browser tool drives the browser via this event.
		function onNav(e: Event) {
			const url = (e as CustomEvent<{ url?: string }>).detail?.url;
			if (typeof url === 'string' && url) navigate(url);
		}
		window.addEventListener('message', onMsg);
		window.addEventListener('velocity:navigate', onNav);
		return () => { window.removeEventListener('message', onMsg); window.removeEventListener('velocity:navigate', onNav); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state]);

	const isStart = current === BROWSER_HOME;
	const isLocal = !isStart && isLocalUrl(current);
	const isExternal = !isStart && !isLocal;
	const bookmarked = browser.isBookmarked(current);

	// Chrome-style keyboard shortcuts, scoped to the browser pane.
	function onKeyDown(e: React.KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey;
		const k = e.key.toLowerCase();
		if (mod && k === 'l') { e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); }
		else if ((mod && k === 'r') || e.key === 'F5') { e.preventDefault(); setLoadKey((n) => n + 1); }
		else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); }
		else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); forward(); }
		else if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomBy(0.1); }
		else if (mod && k === '-') { e.preventDefault(); zoomBy(-0.1); }
		else if (mod && k === '0') { e.preventDefault(); setZoom(1); }
	}

	return (
		<div className="mode browser chrome" onKeyDown={onKeyDown}>
			{/* Chrome toolbar: nav cluster · omnibox · actions. The page tab is the
			    workspace tab above this pane. */}
			<div className="cr-toolbar">
				<div className="cr-nav">
					<button className="cr-icb" title="Back" aria-label="Back" disabled={state.index === 0} onClick={back}><Icon.back /></button>
					<button className="cr-icb" title="Forward" aria-label="Forward" disabled={state.index >= state.history.length - 1} onClick={forward}><Icon.forward /></button>
					<button className="cr-icb" title="Reload (⌘R)" aria-label="Reload" onClick={() => setLoadKey((k) => k + 1)}><Icon.reload /></button>
				</div>
				<form className="cr-omni" onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }}>
					<span className="cr-omni-lead">{isStart ? <Icon.search /> : <Icon.lock />}</span>
					<input ref={inputRef} value={urlInput} spellCheck={false} placeholder="Search or type a URL — try localhost:3000" aria-label="Address and search bar" onChange={(e) => setUrlInput(e.target.value)} />
					{isLocal && <span className="cr-live" title="Live workspace preview">● Live</span>}
					<button type="button" className={`cr-star${bookmarked ? ' on' : ''}`} title={bookmarked ? 'Remove bookmark' : 'Bookmark this tab'} aria-label="Bookmark this tab" aria-pressed={bookmarked} onClick={() => browser.toggleBookmark(current)}><Icon.star /></button>
				</form>
				<div className="cr-actions">
					{zoom !== 1 && (
						<button className="cr-zoom" title="Reset zoom (⌘0)" aria-label="Reset zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
					)}
					<button className="cr-icb" title="Home" aria-label="Home" onClick={() => navigate(BROWSER_HOME)}><Icon.home /></button>
					{isExternal && <a className="cr-icb" title="Open in a new tab" aria-label="Open externally" href={current} target="_blank" rel="noreferrer noopener"><Icon.share /></a>}
					<span className="cr-avatar" title="Profile" aria-hidden>B</span>
					<div className="cr-menu-wrap">
						<button className="cr-icb" title="Menu" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}><Icon.dots /></button>
						{menuOpen && (
							<div className="cr-menu" role="menu">
								<button onClick={() => { setLoadKey((k) => k + 1); setMenuOpen(false); }}><Icon.reload />Reload</button>
								<button disabled={isStart} onClick={() => { void navigator.clipboard?.writeText(current); setMenuOpen(false); }}><Icon.share />Copy URL</button>
								<button disabled={isStart} onClick={() => { browser.toggleBookmark(current); setMenuOpen(false); }}><Icon.star />{bookmarked ? 'Remove bookmark' : 'Bookmark'}</button>
								{isExternal && <button onClick={() => { window.open(current, '_blank', 'noopener'); setMenuOpen(false); }}><Icon.share />Open in new tab</button>}
								<div className="cr-menu-sep" />
								<div className="cr-menu-zoom">
									<span>Zoom</span>
									<button title="Zoom out" onClick={() => zoomBy(-0.1)}><Icon.minus /></button>
									<b>{Math.round(zoom * 100)}%</b>
									<button title="Zoom in" onClick={() => zoomBy(0.1)}><Icon.plus /></button>
								</div>
								{state.history.length > 1 && <div className="cr-menu-sep" />}
								{state.history.slice(0, state.index).reverse().slice(0, 5).map((h, i) => (
									<button key={`h-${i}`} className="cr-menu-hist" title={h} onClick={() => { navigate(h); setMenuOpen(false); }}><Icon.back /><span>{h === BROWSER_HOME ? 'New tab' : titleFor(h)}</span></button>
								))}
								<div className="cr-menu-sep" />
								<button onClick={() => { navigate(BROWSER_HOME); setMenuOpen(false); }}><Icon.home />New tab page</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Bookmarks bar (Chrome / Arc) */}
			<div className="cr-bookmarks">
				{bookmarks.map((b) => (
					<button key={b.url} className="cr-bm" title={b.url} onClick={() => navigate(b.url)}>
						<Icon.browser /><span>{b.title}</span>
					</button>
				))}
			</div>

			<div className="browser-view" style={{ zoom }}>
				{loading && <div className="cr-progress" aria-hidden />}
				{isStart && (
					<iframe key={`start-${theme}-${loadKey}`} className="frame" title="New tab" srcDoc={startPage(theme)} sandbox="allow-scripts" onLoad={() => setLoading(false)} />
				)}
				{isLocal && (
					<iframe key={`local-${loadKey}-${previewHtml.length}`} className="frame" title="Live preview" srcDoc={previewHtml} sandbox="allow-scripts allow-forms" onLoad={() => setLoading(false)} />
				)}
				{isExternal && !tryFrame && (
					<div className="cr-blocked">
						<div className="cr-blocked-mark">{titleFor(current).slice(0, 1).toUpperCase()}</div>
						<h3>{titleFor(current)}</h3>
						<p>Most sites block being shown inside another page. Open it in a real tab — or try embedding it here anyway.</p>
						<div className="cr-blocked-actions">
							<a className="cr-blocked-open" href={current} target="_blank" rel="noreferrer">Open in new tab ↗</a>
							<button className="cr-blocked-try" onClick={() => { setTryFrame(true); setLoading(true); }}>Try embedding</button>
						</div>
					</div>
				)}
				{isExternal && tryFrame && (
					<iframe
						key={`${current}-${loadKey}`}
						className="frame"
						title={titleFor(current)}
						src={current}
						sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
						referrerPolicy="no-referrer"
						onLoad={() => setLoading(false)}
					/>
				)}
			</div>
		</div>
	);
}
