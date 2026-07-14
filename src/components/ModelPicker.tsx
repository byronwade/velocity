// The composer's model selector: choose the built-in local agent or any model
// installed in a local Ollama server. Lists installed models live from the
// Ollama API and lets you set the endpoint; the choice persists (agentSettings).

import { useEffect, useRef, useState } from 'react';
import { useAgentSettings, setAgentSettings, providerLabel } from '../services/agentSettings';
import { listOllamaModels } from '../services/ollama';
import { Icon } from '../lib/icons';

export function ModelPicker() {
	const settings = useAgentSettings();
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState(settings.ollamaUrl);
	const [models, setModels] = useState<string[]>([]);
	const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'down'>('idle');
	const wrapRef = useRef<HTMLDivElement>(null);

	async function refresh(u: string) {
		setStatus('checking');
		const ms = await listOllamaModels(u);
		setModels(ms);
		setStatus(ms.length ? 'ok' : 'down');
	}

	useEffect(() => {
		if (open) void refresh(url);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
		const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		document.addEventListener('mousedown', close);
		document.addEventListener('keydown', esc);
		return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
	}, [open]);

	function pickLocal() { setAgentSettings({ provider: 'local' }); setOpen(false); }
	function pickOllama(model: string) { setAgentSettings({ provider: 'ollama', ollamaUrl: url, ollamaModel: model }); setOpen(false); }

	return (
		<div className="mpick" ref={wrapRef}>
			<button type="button" className="ac-model" title="Model" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
				<Icon.sparkle /><span>{providerLabel(settings)}</span><Icon.chevron />
			</button>
			{open && (
				<div className="mpick-pop" role="menu">
					<button className={`mp-item${settings.provider === 'local' ? ' on' : ''}`} onClick={pickLocal}>
						<Icon.sparkle />
						<span className="mp-main"><span className="mp-name">Velocity · Local</span><span className="mp-sub">Built-in, no server</span></span>
						{settings.provider === 'local' && <Icon.check />}
					</button>

					<div className="mp-group">
						<span>Ollama · local models</span>
						<span className={`mp-status s-${status}`}>{status === 'checking' ? 'checking…' : status === 'ok' ? `${models.length} models` : status === 'down' ? 'offline' : ''}</span>
					</div>
					<div className="mp-url">
						<Icon.terminal />
						<input
							value={url}
							spellCheck={false}
							aria-label="Ollama endpoint"
							onChange={(e) => setUrl(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') void refresh(url); }}
						/>
						<button className="mp-refresh" title="Refresh" onClick={() => void refresh(url)}><Icon.reload /></button>
					</div>
					{status === 'ok' && models.map((m) => (
						<button key={m} className={`mp-item${settings.provider === 'ollama' && settings.ollamaModel === m ? ' on' : ''}`} onClick={() => pickOllama(m)}>
							<Icon.agents />
							<span className="mp-main"><span className="mp-name">{m}</span></span>
							{settings.provider === 'ollama' && settings.ollamaModel === m && <Icon.check />}
						</button>
					))}
					{status === 'down' && (
						<div className="mp-hint">
							No Ollama server reached. The desktop app connects directly. For this browser preview, run:<br />
							<code>OLLAMA_ORIGINS='http://localhost:5199' ollama serve</code>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
