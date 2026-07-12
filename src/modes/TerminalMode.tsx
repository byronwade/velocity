export function TerminalMode(_: { paneId: string }) {
	return (
		<div className="term">
			<div className="term-body">
				<div><span className="p">~/streamline</span> $ npm run dev</div>
				<div className="ok">▲ Next.js 15.2 — ready in 412ms</div>
				<div className="b">- Local: http://localhost:3000</div>
				<div><span className="p">~/streamline</span> $ npm test -- useSession</div>
				<div className="ok">✓ resolves loading before redirect (38ms)</div>
				<div className="ok">✓ 214 passed</div>
				<div><span className="p">~/streamline</span> $ <span style={{ opacity: 0.5 }}>▋</span></div>
			</div>
		</div>
	);
}
