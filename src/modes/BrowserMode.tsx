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
import { BROWSER_HOME, isLocalUrl, normalizeUrl, titleFor } from '../services/browser';
import { usePreview } from '../services/preview';
import { startPage } from './browserStart';
import { Icon } from '../lib/icons';
import { Code2, X as XIcon, Monitor, Tablet, Smartphone } from 'lucide-react';

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICES: { id: Device; icon: typeof Monitor; label: string }[] = [
	{ id: 'desktop', icon: Monitor, label: 'Desktop' },
	{ id: 'tablet', icon: Tablet, label: 'Tablet · 768' },
	{ id: 'mobile', icon: Smartphone, label: 'Mobile · 390' },
];

type LogEntry = { level: string; text: string };

// A tiny probe injected into the LIVE preview so the Console tab shows the
// page's REAL console output. The iframe is `allow-scripts` only (no
// same-origin), so it talks back via postMessage — the one channel that works.
const CONSOLE_PROBE = `<script>(function(){
	var send=function(l,a){try{parent.postMessage({type:'velocity-console',level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};
	['log','info','warn','error','debug'].forEach(function(m){var o=console[m];console[m]=function(){send(m,arguments);try{o.apply(console,arguments)}catch(e){}}});
	window.addEventListener('error',function(e){send('error',[e.message]);});
	/* eval is the feature here: this is the DevTools Console executing what the
	   user typed, and it runs INSIDE the sandboxed preview iframe (allow-scripts
	   only, opaque origin — no cookies, storage, or parent access), same as
	   Chrome DevTools evaluating in a page. */
	window.addEventListener('message',function(e){var d=e.data;if(d&&d.type==='velocity-eval'&&typeof d.code==='string'){var r;try{r=eval(d.code);}catch(err){send('error',[String(err)]);return;}send('result',[r]);}});
})();<\/script>`;

function withConsoleProbe(html: string): string {
	if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + CONSOLE_PROBE);
	return CONSOLE_PROBE + html;
}

/** One node in the Elements tree — collapsible, derived from the real DOM. */
function ElNode({ el, depth }: { el: Element; depth: number }) {
	const [open, setOpen] = useState(depth < 3);
	const tag = el.tagName.toLowerCase();
	const attrs = Array.from(el.attributes).map((a) => ` ${a.name}="${a.value.length > 32 ? a.value.slice(0, 32) + '…' : a.value}"`).join('');
	const kids = Array.from(el.childNodes).filter((n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent || '').trim()));
	const hasEl = kids.some((n) => n.nodeType === 1);
	const pad = { paddingLeft: 8 + depth * 14 };
	if (!hasEl) {
		const txt = (el.textContent || '').trim();
		return (
			<div className="cr-dt-el" style={pad}>
				<span className="cr-dt-tag">&lt;{tag}<i className="cr-dt-attr">{attrs}</i>&gt;</span>
				{txt && <span className="cr-dt-txt">{txt.slice(0, 60)}</span>}
				<span className="cr-dt-tag">&lt;/{tag}&gt;</span>
			</div>
		);
	}
	return (
		<>
			<div className="cr-dt-el row" style={pad} onClick={() => setOpen((o) => !o)}>
				<span className="cr-dt-caret">{open ? '▾' : '▸'}</span>
				<span className="cr-dt-tag">&lt;{tag}<i className="cr-dt-attr">{attrs}</i>&gt;</span>
			</div>
			{open && kids.map((n, i) => n.nodeType === 1
				? <ElNode key={i} el={n as Element} depth={depth + 1} />
				: <div key={i} className="cr-dt-el txt" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>{(n.textContent || '').trim().slice(0, 80)}</div>)}
			{open && <div className="cr-dt-el" style={pad}><span className="cr-dt-tag">&lt;/{tag}&gt;</span></div>}
		</>
	);
}

/** DevTools docked at the bottom of the browser: Elements · Console · Network.
 *  Elements + Network are parsed from the real served HTML; Console is live. */
function DevToolsPanel({ html, url, logs, onClose, onEval }: { html: string; url: string; logs: LogEntry[]; onClose: () => void; onEval?: (code: string) => void }) {
	const [tab, setTab] = useState<'elements' | 'console' | 'network'>('console');
	const [code, setCode] = useState('');
	const body = useMemo(() => (html ? new DOMParser().parseFromString(html, 'text/html') : null), [html]);
	const network = useMemo(() => {
		const rows: { name: string; type: string }[] = [{ name: url || 'document', type: 'document' }];
		if (body) {
			body.querySelectorAll('script[src]').forEach((s) => rows.push({ name: s.getAttribute('src') || '', type: 'script' }));
			body.querySelectorAll('link[href]').forEach((l) => rows.push({ name: l.getAttribute('href') || '', type: 'stylesheet' }));
			body.querySelectorAll('img[src]').forEach((i) => rows.push({ name: i.getAttribute('src') || '', type: 'img' }));
		}
		return rows;
	}, [body, url]);
	return (
		<div className="cr-devtools">
			<div className="cr-dt-tabs">
				{(['elements', 'console', 'network'] as const).map((t) => (
					<button key={t} className={`cr-dt-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}{t === 'console' && logs.length > 0 ? ` (${logs.length})` : ''}</button>
				))}
				<span className="cr-dt-sp" />
				<button className="cr-dt-close" onClick={onClose} aria-label="Close DevTools"><XIcon size={14} /></button>
			</div>
			<div className="cr-dt-body">
				{tab === 'elements' && (body ? <ElNode el={body.body} depth={0} /> : <div className="cr-dt-empty">Nothing to inspect on this page.</div>)}
				{tab === 'console' && (logs.length ? logs.map((l, i) => <div key={i} className={`cr-dt-log ${l.level}`}>{l.text}</div>) : <div className="cr-dt-empty">Console output from the live preview shows here.</div>)}
				{tab === 'network' && (
					<table className="cr-dt-net"><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
						<tbody>{network.map((r, i) => <tr key={i}><td title={r.name}>{r.name}</td><td>{r.type}</td><td className="ok">200</td></tr>)}</tbody></table>
				)}
			</div>
			{tab === 'console' && onEval && (
				<div className="cr-dt-evalrow">
					<span className="cr-dt-caret-in">›</span>
					<input value={code} placeholder="Evaluate in the page…" spellCheck={false}
						onChange={(e) => setCode(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) { onEval(code); setCode(''); } }} />
				</div>
			)}
		</div>
	);
}

export function BrowserMode({ paneId }: { paneId: string }) {
	const { browser } = useServices();
	const theme = useShell((s) => s.theme);
	const previewHtml = usePreview();
	// In-pane browser tabs (like the IDE's file tabs) — each tab owns its own
	// history via a derived pane id.
	const [tabs, setTabs] = useState<number[]>([1]);
	const [activeTab, setActiveTab] = useState(1);
	const tabPaneId = `${paneId}#t${activeTab}`;
	const state = useMemo(() => browser.for(tabPaneId), [browser, tabPaneId]);
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
	// Keep the omnibox in sync when switching tabs or after navigation.
	useEffect(() => { setUrlInput(current === BROWSER_HOME ? '' : current); }, [tabPaneId, current]);

	const newTab = () => {
		const n = Math.max(...tabs) + 1;
		setTabs((t) => [...t, n]);
		setActiveTab(n);
	};
	const closeTab = (n: number) => {
		browser.release(`${paneId}#t${n}`);
		setTabs((t) => {
			const next = t.filter((x) => x !== n);
			if (n === activeTab && next.length) setActiveTab(next[Math.max(0, next.indexOf(n) - 1)] ?? next[next.length - 1]);
			return next;
		});
	};
	// Most real sites refuse to be embedded (X-Frame-Options / CSP). Rather than
	// show the browser's ugly "refused to connect", offer a clean card; users can
	// open the page in a real tab, or try embedding anyway.
	const [tryFrame, setTryFrame] = useState(false);
	useEffect(() => { setTryFrame(false); }, [current]);
	// DevTools (Elements / Console / Network) docked at the bottom of the pane.
	const [devtools, setDevtools] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	useEffect(() => { setLogs([]); }, [current, loadKey]);
	// Responsive preview — constrain the page to a device width (v0-style).
	const [device, setDevice] = useState<Device>('desktop');

	// Show a loading bar until the frame reports load (or a short timeout).
	useEffect(() => {
		setLoading(true);
		const t = window.setTimeout(() => setLoading(false), 1600);
		return () => window.clearTimeout(t);
	}, [current, loadKey]);

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
			if (d && d.type === 'velocity-console' && typeof d.text === 'string') {
				setLogs((l) => [...l.slice(-199), { level: String(d.level || 'log'), text: d.text }]);
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
		else if (mod && e.altKey && (k === 'i' || k === 'j')) { e.preventDefault(); setDevtools((d) => !d); }
	}

	// The HTML currently framed — Elements + Network inspect this real markup.
	const frameHtml = isLocal ? previewHtml : isStart ? startPage(theme) : '';

	// Console input → eval inside the live preview (the probe answers back).
	const rootRef = useRef<HTMLDivElement>(null);
	const evalInPage = (codeStr: string) => {
		setLogs((l) => [...l.slice(-199), { level: 'input', text: `› ${codeStr}` }]);
		const frame = rootRef.current?.querySelector<HTMLIFrameElement>('iframe.frame');
		frame?.contentWindow?.postMessage({ type: 'velocity-eval', code: codeStr }, '*');
	};

	return (
		<div ref={rootRef} className="mode browser chrome" onKeyDown={onKeyDown}>
			{/* ONE bar: nav · tabs · omnibox · view tools · settings. */}
			<div className="cr-bar">
				<div className="cr-nav">
					<button className="cr-icb" title="Back" aria-label="Back" disabled={state.index === 0} onClick={back}><Icon.back /></button>
					<button className="cr-icb" title="Forward" aria-label="Forward" disabled={state.index >= state.history.length - 1} onClick={forward}><Icon.forward /></button>
					<button className="cr-icb" title="Reload (⌘R)" aria-label="Reload" onClick={() => setLoadKey((k) => k + 1)}><Icon.reload /></button>
				</div>
				<div className="cr-btabs" role="tablist">
					{tabs.map((n) => {
						const st = browser.for(`${paneId}#t${n}`);
						const cur = st.history[st.index];
						return (
							<div key={n} className={`cr-ttab${n === activeTab ? ' active' : ''}`} role="tab" aria-selected={n === activeTab} onClick={() => setActiveTab(n)}>
								<Icon.browser />
								<span className="cr-ttab-title">{cur === BROWSER_HOME ? 'New tab' : titleFor(cur)}</span>
								{tabs.length > 1 && <button className="cr-ttab-x" aria-label="Close tab" onClick={(e) => { e.stopPropagation(); closeTab(n); }}><Icon.close /></button>}
							</div>
						);
					})}
					<button className="cr-ttab-new" title="New tab" aria-label="New tab" onClick={newTab}><Icon.plus /></button>
				</div>
				<form className="cr-omni2" onSubmit={(e) => { e.preventDefault(); navigate(urlInput); }}>
					<span className="cr-omni-lead">{isStart ? <Icon.search /> : <Icon.lock />}</span>
					<input ref={inputRef} value={urlInput} spellCheck={false} placeholder="Search or type a URL" aria-label="Address and search bar" onChange={(e) => setUrlInput(e.target.value)} />
					{isLocal && <span className="cr-live" title="Live workspace preview">● Live</span>}
				</form>
				<div className="cr-actions2">
					{zoom !== 1 && (
						<button className="cr-zoom" title="Reset zoom (⌘0)" aria-label="Reset zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
					)}
					<div className="cr-devices" role="group" aria-label="Device preview">
						{DEVICES.map((d) => (
							<button key={d.id} className={`cr-dev${device === d.id ? ' on' : ''}`} title={d.label} aria-label={d.label} aria-pressed={device === d.id} onClick={() => setDevice(d.id)}><d.icon size={14} /></button>
						))}
					</div>
					<button className={`cr-icb${devtools ? ' on' : ''}`} title="DevTools (⌥⌘I)" aria-label="DevTools" aria-pressed={devtools} onClick={() => setDevtools((d) => !d)}><Code2 size={15} /></button>
					<div className="cr-menu-anchor">
						<button className={`cr-icb${menuOpen ? ' on' : ''}`} title="Browser settings" aria-label="Browser settings" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}><Icon.dots /></button>
						{menuOpen && (
							<>
								<div className="cr-menu-scrim" onClick={() => setMenuOpen(false)} />
								<div className="cr-menu2" role="menu">
									<button className="cr-menu2-item" onClick={() => { newTab(); setMenuOpen(false); }}><Icon.plus />New tab</button>
									<button className="cr-menu2-item" disabled={isStart} onClick={() => { void navigator.clipboard?.writeText(current); setMenuOpen(false); }}><Icon.share />Copy URL</button>
									{isExternal && <button className="cr-menu2-item" onClick={() => { window.open(current, '_blank', 'noopener'); setMenuOpen(false); }}><Icon.share />Open in system browser</button>}
									<button className="cr-menu2-item" onClick={() => { navigate(BROWSER_HOME); setMenuOpen(false); }}><Icon.home />Start page</button>
									<div className="cr-menu2-sep" />
									<div className="cr-menu2-zoom">
										<span>Zoom</span>
										<button title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(-0.1)}><Icon.minus /></button>
										<b>{Math.round(zoom * 100)}%</b>
										<button title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(0.1)}><Icon.plus /></button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			<div className={`browser-view dev-${device}`} style={{ zoom }}>
				{loading && <div className="cr-progress" aria-hidden />}
				{isStart && (
					<iframe key={`start-${theme}-${loadKey}`} className="frame" title="New tab" srcDoc={startPage(theme)} sandbox="allow-scripts" onLoad={() => setLoading(false)} />
				)}
				{isLocal && (
					<iframe key={`local-${loadKey}-${previewHtml.length}`} className="frame" title="Live preview" srcDoc={withConsoleProbe(previewHtml)} sandbox="allow-scripts allow-forms" onLoad={() => setLoading(false)} />
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
			{devtools && <DevToolsPanel html={frameHtml} url={isStart ? 'about:newtab' : current} logs={logs} onClose={() => setDevtools(false)} onEval={isLocal ? evalInPage : undefined} />}
		</div>
	);
}
