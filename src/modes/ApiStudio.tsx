// The API studio — a real request workbench over the workspace.
//
// Left: the routes the in-process API exposes. Right: a method + path bar, a
// JSON body composer, and a Send that runs the request against genuine
// workspace state (files + the relational store) and shows the real response,
// status, and timing. Nothing here is mocked — /api/users runs an actual query.

import { useMemo, useState } from 'react';
import { useServices } from '../services/container';
import type { ApiResponse, ApiRoute } from '../services/api';
import { Icon } from '../lib/icons';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function ApiStudio(_props: { paneId: string }) {
	const { api } = useServices();
	const routes = useMemo(() => api.list(), [api]);
	const [sel, setSel] = useState(0);
	const [method, setMethod] = useState(routes[0]?.method ?? 'GET');
	const [path, setPath] = useState(routes[0]?.path ?? '/api/health');
	const [body, setBody] = useState(routes[0]?.sample ?? '');
	const [res, setRes] = useState<ApiResponse | null>(null);
	const [sending, setSending] = useState(false);

	function choose(r: ApiRoute, i: number) {
		setSel(i);
		setMethod(r.method);
		setPath(r.path);
		setBody(r.sample ?? '');
		setRes(null);
	}

	async function send() {
		setSending(true);
		try {
			setRes(await api.request(method, path, body));
		} finally {
			setSending(false);
		}
	}

	const hasBody = method !== 'GET' && method !== 'DELETE';
	const ok = res && res.status < 400;

	return (
		<div className="apistudio">
			<aside className="api-side">
				<div className="api-side-head"><Icon.command /><span>Routes</span></div>
				{routes.map((r, i) => (
					<button key={`${r.method} ${r.path}`} className={`api-route${i === sel ? ' on' : ''}`} onClick={() => choose(r, i)}>
						<span className={`api-m m-${r.method.toLowerCase()}`}>{r.method}</span>
						<span className="api-path">{r.path}</span>
						<span className="api-sum">{r.summary}</span>
					</button>
				))}
			</aside>
			<div className="api-main">
				<div className="api-bar">
					<select className="api-method" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">
						{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
					</select>
					<input className="api-url" value={path} spellCheck={false} onChange={(e) => setPath(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void send(); } }} placeholder="/api/health" />
					<button className="api-send" onClick={() => void send()} disabled={sending}><Icon.play />{sending ? 'Sending…' : 'Send'}</button>
				</div>
				{hasBody && (
					<div className="api-body">
						<div className="api-body-head">Request body · JSON</div>
						<textarea value={body} spellCheck={false} onChange={(e) => setBody(e.target.value)} placeholder='{ "key": "value" }' />
					</div>
				)}
				<div className="api-res">
					{!res ? (
						<div className="api-res-empty"><Icon.command /><span>Send a request to see the response.</span></div>
					) : (
						<>
							<div className="api-res-head">
								<span className={`api-status ${ok ? 'ok' : 'err'}`}>{res.status} {res.statusText}</span>
								<span className="api-ms">{res.ms} ms</span>
							</div>
							<pre className="api-json">{JSON.stringify(res.body, null, 2)}</pre>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
