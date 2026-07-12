import { Icon } from '../lib/icons';

const TARGETS: Array<[string, string]> = [
	['Docker', '#2496ed'], ['Kubernetes', '#326ce5'], ['Fly.io', '#7b42bc'], ['Cloudflare', '#f38020'],
	['Netlify', '#32b6b4'], ['Render', '#5b5bd6'], ['Bare VPS', '#8a9099'], ['Vercel', 'var(--fg)'], ['Portable export', 'var(--good)'],
];

export function BuilderMode(_: { paneId: string }) {
	return (
		<div className="gen">
			<h1>Describe it. We build it. Deploy it anywhere.</h1>
			<p className="lede">An open-source v0 — generate a full app (front to back), edit it live, own the code, and ship to any host. No lock-in.</p>
			<div className="prompt">
				<textarea rows={2} placeholder="A marketplace for local artists with Stripe payments, auth, and an admin dashboard…" />
				<div className="r">
					<span className="chip">Next.js + Postgres</span><span className="chip">shadcn/ui</span>
					<button className="go"><Icon.sparkle />Generate</button>
				</div>
			</div>
			<div className="dh">Deploy anywhere — your infra, your choice</div>
			<div className="targets">
				{TARGETS.map(([name, color]) => (
					<span className="target" key={name}><span className="dot" style={{ background: color }} />{name}</span>
				))}
			</div>
		</div>
	);
}
