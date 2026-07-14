// ---------------------------------------------------------------------------
// Builder — describe an app, generate it, preview it live, deploy anywhere.
//
// A prompt runs the generator (services/generator.ts), which writes REAL,
// self-contained files into the workspace FileSystem. They render immediately
// in the preview iframe, show up in the Explorer, and open in the editor. The
// generator is the LLM seam; deploy targets are the "anywhere" seam. Nothing is
// faked: what you preview is the file that was written.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useServices } from '../services/container';
import { generate, type Generated } from '../services/generator';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';

const EXAMPLES = ['A SaaS landing page for a time-tracking app', 'A todo app with a clean UI', 'An analytics dashboard with KPIs'];
const TARGETS: Array<[string, string]> = [
	['Static export', 'var(--good)'],
	['Docker', '#2496ed'],
	['Cloudflare', '#f38020'],
	['Netlify', '#32b6b4'],
	['Fly.io', '#7b42bc'],
	['Vercel', 'var(--fg)'],
];
const STEPS = ['Understanding the prompt', 'Scaffolding files', 'Writing styles', 'Wiring interactions'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BuilderMode(_: { paneId: string }) {
	const { fs, editor } = useServices();
	const [prompt, setPrompt] = useState('');
	const [busy, setBusy] = useState(false);
	const [step, setStep] = useState(0);
	const [versions, setVersions] = useState<Generated[]>([]);
	const [active, setActive] = useState(-1);
	const [showDeploy, setShowDeploy] = useState(false);
	const [deployed, setDeployed] = useState<string | null>(null);

	const current = active >= 0 ? versions[active] : null;

	async function run() {
		const p = prompt.trim();
		if (!p || busy) {
			return;
		}
		setBusy(true);
		setDeployed(null);
		setShowDeploy(false);
		for (let i = 0; i < STEPS.length; i++) {
			setStep(i);
			await sleep(230);
		}
		const g = generate(p);
		await Promise.all(Object.entries(g.files).map(([path, content]) => fs.writeFile(path, content)));
		setVersions((v) => {
			setActive(v.length);
			return [...v, g];
		});
		setBusy(false);
		setStep(0);
		setPrompt('');
	}

	function onKey(e: React.KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			void run();
		}
	}

	return (
		<div className="builder">
			{(current || busy) && (
				<div className="build-top">
					<span className="glyph"><Icon.sparkle /></span>
					<b>{current ? current.name : 'Generating'}</b>
					{current && <span className="kindchip">{current.kind}</span>}
					{versions.length > 1 && (
						<div className="vers">
							{versions.map((v, i) => (
								<button key={i} className={`vpill${i === active ? ' on' : ''}`} title={v.name} onClick={() => setActive(i)}>
									v{i + 1}
								</button>
							))}
						</div>
					)}
					<span className="sp" />
					{current && (
						<>
							<button className="btn ghost sm" onClick={() => openFileInActivePane(editor, `builds/${current.slug}/index.html`)}>
								<Icon.editor />Open code
							</button>
							<button className="btn sm" onClick={() => setShowDeploy((s) => !s)} aria-expanded={showDeploy}>
								<Icon.rocket />Deploy
							</button>
						</>
					)}
				</div>
			)}

			{showDeploy && current && (
				<div className="deploy-row">
					{TARGETS.map(([name, color]) => (
						<button className="target" key={name} onClick={() => { setDeployed(name); setShowDeploy(false); }}>
							<span className="dot" style={{ background: color }} />
							{name}
						</button>
					))}
				</div>
			)}
			{deployed && (
				<div className="deploy-note">
					<Icon.check /> Static build for <b>{current?.name}</b> is ready — connect a <b>{deployed}</b> token to ship. Files live in <code>builds/{current?.slug}/</code>.
				</div>
			)}

			<div className="build-canvas">
				{busy ? (
					<div className="build-steps">
						{STEPS.map((s, i) => (
							<div key={s} className={`bstep${i < step ? ' done' : ''}${i === step ? ' active' : ''}`}>
								<span className="bdot">{i < step ? <Icon.check /> : null}</span>
								{s}
							</div>
						))}
					</div>
				) : current ? (
					<iframe key={`${current.slug}-${active}`} className="frame" title={current.name} srcDoc={current.entry} sandbox="allow-scripts" />
				) : (
					<div className="build-hero">
						<span className="pill"><Icon.sparkle /> open-source app builder</span>
						<h1>Describe it. Build it. Deploy anywhere.</h1>
						<p>Generate a real, self-contained app — preview it live, edit the files, own the code, ship to any host.</p>
					</div>
				)}
			</div>

			<form
				className="build-prompt"
				onSubmit={(e) => {
					e.preventDefault();
					void run();
				}}
			>
				<textarea
					rows={2}
					value={prompt}
					disabled={busy}
					placeholder="A marketplace for local artists with auth and an admin dashboard…"
					onChange={(e) => setPrompt(e.target.value)}
					onKeyDown={onKey}
				/>
				<div className="r">
					{!current &&
						EXAMPLES.map((ex) => (
							<button type="button" key={ex} className="chip" onClick={() => setPrompt(ex)}>
								{ex}
							</button>
						))}
					<button className="go" type="submit" disabled={busy || !prompt.trim()}>
						<Icon.sparkle />
						{busy ? 'Generating…' : current ? 'Regenerate' : 'Generate'}
					</button>
				</div>
			</form>
		</div>
	);
}
