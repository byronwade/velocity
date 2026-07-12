import { Icon } from '../lib/icons';

export function BrowserMode(_: { paneId: string }) {
	return (
		<div className="mode">
			<div className="chrome-bar">
				<button className="ib sm"><Icon.back /></button>
				<button className="ib sm"><Icon.forward /></button>
				<button className="ib sm"><Icon.reload /></button>
				<div className="url"><Icon.lock />localhost:3000/dashboard</div>
				<button className="btn ghost" style={{ padding: '4px 8px' }}>Inspect</button>
			</div>
			<div className="mode-scroll">
				<div className="web">
					<div className="hero">
						<h1>A real browser, inside your IDE</h1>
						<p>Full Chromium with devtools attached — click an element, jump straight to the component that renders it.</p>
						<div className="row"><button className="btn brand">Open devtools</button><button className="btn">Responsive</button></div>
					</div>
					<div className="cards">
						<div><h3>Element → source</h3><p>Cmd-click any node, land on the JSX.</p></div>
						<div><h3>Console + network</h3><p>Piped into the agent for debugging.</p></div>
						<div><h3>Multi-viewport</h3><p>Phone / tablet / desktop at once.</p></div>
					</div>
				</div>
			</div>
		</div>
	);
}
