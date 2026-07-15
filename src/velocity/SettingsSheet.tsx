import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getWorkspaceMcp, type McpToolInfo } from '../services/mcp';
import { X, SlidersHorizontal, Palette, Bell, Users, Plug, CreditCard, Sun, Moon, Monitor } from 'lucide-react';
import { useShell } from '../lib/store';
import { useWorkspace, useProjects, runtime } from './useWorkspace';
import { AUTONOMY_LABEL } from './model';

// Small localStorage-backed preference hook.
function usePref<T>(key: string, def: T): [T, (v: T) => void] {
	const [v, setV] = useState<T>(() => {
		try { const r = localStorage.getItem(`vs.pref.${key}`); return r == null ? def : (JSON.parse(r) as T); } catch { return def; }
	});
	return [v, (nv: T) => { setV(nv); try { localStorage.setItem(`vs.pref.${key}`, JSON.stringify(nv)); } catch { /* ignore */ } }];
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
	return <button className={`vs-toggle${on ? ' on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}><span /></button>;
}

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
	return (
		<div className="vs-set-r">
			<div className="vs-set-r-txt"><b>{title}</b>{desc && <span>{desc}</span>}</div>
			<div className="vs-set-r-ctl">{children}</div>
		</div>
	);
}

/** The workspace MCP server's live toolbelt — enumerated via a real MCP
 *  client handshake over the in-process transport, never hardcoded. */
function McpTools() {
	const [tools, setTools] = useState<McpToolInfo[] | null>(null);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		let alive = true;
		getWorkspaceMcp().then((mcp) => { if (alive) setTools(mcp.tools); }).catch(() => { if (alive) setFailed(true); });
		return () => { alive = false; };
	}, []);
	return (
		<div className="vs-mcp">
			<div className="vs-mcp-head">
				<span className={`vs-mcp-dot${tools ? ' on' : ''}`} />
				<b>Workspace MCP server</b>
				<span className="vs-mcp-sub">{failed ? 'failed to start' : tools ? `${tools.length} tools · in-process` : 'starting…'}</span>
			</div>
			<p className="vs-mcp-desc">Coworkers use the workspace through these Model Context Protocol tools — the same seam external agents will plug into.</p>
			{tools?.map((t) => (
				<div key={t.name} className="vs-mcp-tool"><code>{t.name}</code><span>{t.description}</span></div>
			))}
		</div>
	);
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
	return (
		<select className="vs-set-select" value={value} onChange={(e) => onChange(e.target.value)}>
			{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
		</select>
	);
}

const NAV = [
	{ group: 'Account', items: [{ id: 'general', label: 'General', icon: SlidersHorizontal }, { id: 'appearance', label: 'Appearance', icon: Palette }, { id: 'notifications', label: 'Notifications', icon: Bell }] },
	{ group: 'Workspace', items: [{ id: 'coworkers', label: 'Coworkers', icon: Users }, { id: 'integrations', label: 'Integrations', icon: Plug }] },
	{ group: 'Billing', items: [{ id: 'billing', label: 'Plan & usage', icon: CreditCard }] },
];

export function SettingsSheet() {
	const state = useWorkspace();
	const { account } = useProjects();
	const theme = useShell((s) => s.theme);
	const setTheme = useShell((s) => s.setTheme);
	const [section, setSection] = useState('general');

	const [density, setDensity] = useState(() => document.documentElement.dataset.density ?? 'comfortable');
	const [motion, setMotion] = useState(() => document.documentElement.dataset.motion ?? 'full');
	const applyDensity = (v: string) => { setDensity(v); document.documentElement.dataset.density = v; try { localStorage.setItem('vs-density', v); } catch { /* ignore */ } };
	const applyMotion = (v: string) => { setMotion(v); document.documentElement.dataset.motion = v; try { localStorage.setItem('vs-motion', v); } catch { /* ignore */ } };
	const [tabLayout, setTabLayout] = useState(() => { try { return localStorage.getItem('vs-tablayout') ?? 'top'; } catch { return 'top'; } });
	const applyTabLayout = (v: string) => {
		setTabLayout(v);
		try { localStorage.setItem('vs-tablayout', v); } catch { /* ignore */ }
		window.dispatchEvent(new CustomEvent('velocity:tablayout', { detail: v }));
	};

	const [reviewProvider, setReviewProvider] = usePref('reviewProvider', 'github');
	const [prDest, setPrDest] = usePref('prDest', 'browser');
	const [nCritical, setNCritical] = usePref('nCritical', true);
	const [nSystem, setNSystem] = usePref('nSystem', false);
	const [nCheckpoint, setNCheckpoint] = usePref('nCheckpoint', true);
	const [nDeploy, setNDeploy] = usePref('nDeploy', true);
	const [defAutonomy, setDefAutonomy] = usePref('defAutonomy', 'collaborative');
	const [defModel, setDefModel] = usePref('defModel', 'auto');
	const [autoStaff, setAutoStaff] = usePref('autoStaff', true);
	const [deployTarget, setDeployTarget] = usePref('deployTarget', 'vercel');

	if (!state.layout.settingsOpen) return null;
	const creditsPct = Math.min(100, (account.credits.used / account.credits.total) * 100);

	return (
		<div className="vs-scrim" onClick={() => runtime.openSettings(false)}>
			<div className="vs-settings" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
				<nav className="vs-settings-nav">
					<div className="vs-settings-title">Settings</div>
					{NAV.map((g) => (
						<div key={g.group} className="vs-settings-group">
							<div className="vs-settings-grouphead">{g.group}</div>
							{g.items.map((it) => (
								<button key={it.id} className={`vs-settings-navitem${section === it.id ? ' on' : ''}`} onClick={() => setSection(it.id)}>
									<it.icon size={16} />{it.label}
								</button>
							))}
						</div>
					))}
				</nav>
				<div className="vs-settings-main">
					<header className="vs-settings-head">
						<h2>{NAV.flatMap((g) => g.items).find((i) => i.id === section)?.label}</h2>
						<button className="vs-icon" onClick={() => runtime.openSettings(false)} aria-label="Close"><X size={16} /></button>
					</header>
					<div className="vs-settings-body">
						{(section === 'general' || section === 'billing') && (
							<>
								<div className="vs-plan-card">
									<div className="vs-plan-info">
										<span className="vs-plan-badge">Current plan</span>
										<div className="vs-plan-name">{account.user.plan} · $149/mo</div>
										<p>You're on 7× more usage than the Free tier.</p>
										<button className="vs-app-ghost sm">Manage plan</button>
									</div>
									<div className="vs-plan-art" />
								</div>
								<div className="vs-set-r">
									<div className="vs-set-r-txt"><b>Credits</b><span>{account.credits.used.toLocaleString()} / {account.credits.total.toLocaleString()} · {account.usageLabel}</span></div>
									<div className="vs-set-r-ctl" style={{ minWidth: 140 }}>
										<div className="vs-pc-bar" style={{ width: 120 }}><span style={{ width: `${creditsPct}%` }} /></div>
									</div>
								</div>
								<Row title="Usage limits" desc="Cap spend per mission and per coworker."><button className="vs-app-ghost sm">Manage limits</button></Row>
							</>
						)}
						{section === 'general' && (
							<>
								<div className="vs-settings-sechead">Pull requests</div>
								<Row title="Review provider" desc="Where checkpoints open for review."><Select value={reviewProvider} onChange={setReviewProvider} options={[['github', 'GitHub'], ['gitlab', 'GitLab'], ['bitbucket', 'Bitbucket']]} /></Row>
								<Row title="PR destination" desc="Open pull-request links inside the app or a new tab."><Select value={prDest} onChange={setPrDest} options={[['browser', 'In the browser'], ['tab', 'New tab']]} /></Row>
							</>
						)}
						{section === 'appearance' && (
							<>
								<Row title="Theme" desc="Light, dark, or follow the system.">
									<div className="vs-seg">
										<button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Sun size={13} />Light</button>
										<button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Moon size={13} />Dark</button>
										<button onClick={() => setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')}><Monitor size={13} />System</button>
									</div>
								</Row>
								<Row title="Tab layout" desc="Project tabs across the top, or an Arc-style collapsible sidebar.">
									<div className="vs-seg">
										<button className={tabLayout === 'top' ? 'on' : ''} onClick={() => applyTabLayout('top')}>Top</button>
										<button className={tabLayout === 'side' ? 'on' : ''} onClick={() => applyTabLayout('side')}>Vertical</button>
									</div>
								</Row>
								<Row title="Density" desc="How compact the workspace chrome is.">
									<div className="vs-seg"><button className={density === 'comfortable' ? 'on' : ''} onClick={() => applyDensity('comfortable')}>Cozy</button><button className={density === 'compact' ? 'on' : ''} onClick={() => applyDensity('compact')}>Compact</button></div>
								</Row>
								<Row title="Motion" desc="Reduce animations across the app.">
									<div className="vs-seg"><button className={motion === 'full' ? 'on' : ''} onClick={() => applyMotion('full')}>Full</button><button className={motion === 'reduced' ? 'on' : ''} onClick={() => applyMotion('reduced')}>Reduced</button></div>
								</Row>
							</>
						)}
						{section === 'notifications' && (
							<>
								<Row title="Critical requests" desc="Notify when a coworker needs a decision."><Toggle on={nCritical} onChange={setNCritical} /></Row>
								<Row title="Checkpoint ready" desc="Notify when work is ready to review."><Toggle on={nCheckpoint} onChange={setNCheckpoint} /></Row>
								<Row title="Deploy finished" desc="Notify when a deploy goes live."><Toggle on={nDeploy} onChange={setNDeploy} /></Row>
								<Row title="System notifications" desc="Show OS notifications for routine updates."><Toggle on={nSystem} onChange={setNSystem} /></Row>
							</>
						)}
						{section === 'coworkers' && (
							<>
								<Row title="Default autonomy" desc="Starting autonomy for new coworkers."><Select value={defAutonomy} onChange={setDefAutonomy} options={Object.entries(AUTONOMY_LABEL)} /></Row>
								<Row title="Default model" desc="Which model new coworkers use."><Select value={defModel} onChange={setDefModel} options={[['auto', 'Auto · frontier'], ['opus', 'Claude Opus 4.8'], ['sonnet', 'Claude Sonnet 5'], ['local', 'Local · qwen2.5-coder']]} /></Row>
								<Row title="Auto-staff missions" desc="Assign a coworker automatically when a mission starts."><Toggle on={autoStaff} onChange={setAutoStaff} /></Row>
							</>
						)}
						{section === 'integrations' && (
							<>
								<McpTools />
								<Row title="Review provider" desc="Connect where reviews and PRs live."><Select value={reviewProvider} onChange={setReviewProvider} options={[['github', 'GitHub'], ['gitlab', 'GitLab'], ['bitbucket', 'Bitbucket']]} /></Row>
								<Row title="Default deploy target" desc="Where Ship deploys by default."><Select value={deployTarget} onChange={setDeployTarget} options={[['vercel', 'Vercel'], ['netlify', 'Netlify'], ['cloudflare', 'Cloudflare']]} /></Row>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
