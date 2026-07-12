import { Icon } from '../lib/icons';

export function AgentsMode(_: { paneId: string }) {
	return (
		<div className="mode">
			<div className="mode-scroll">
				<div className="agent-thread">
					<div className="msg req"><div className="b">The login page keeps bouncing between /login and /dashboard — find and fix the loop.</div></div>
					<div className="msg res">
						<div className="role"><span className="av"><Icon.sparkle /></span>Velocity · Claude Opus 4.8</div>
						<p>The middleware treats a still-loading session as unauthenticated, so it redirects to <code>/login</code>, which bounces back. I resolved <code>loading</code> before any redirect and fixed the cookie check — <code>middleware.ts</code> and <code>useSession.ts</code>. Running the tests now.</p>
					</div>
				</div>
			</div>
			<div className="composer">
				<div className="in">
					<textarea rows={1} placeholder="Reply, or ⌘K to command…" />
					<div className="r">
						<span className="chip">Agent</span><span className="chip">Opus 4.8</span>
						<button className="send" aria-label="Send"><Icon.send /></button>
					</div>
				</div>
			</div>
		</div>
	);
}
