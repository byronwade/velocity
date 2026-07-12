export function EditorMode(_: { paneId: string }) {
	return (
		<div className="mode">
			<div className="code">
				<table>
					<tbody>
						<tr><td className="ln">4</td><td className="cd"><span className="kw">export function</span> <span className="fn">useSession</span>() {'{'}</td></tr>
						<tr><td className="ln">5</td><td className="cd">{'  '}<span className="kw">const</span> [s, setS] = <span className="fn">useState</span>&lt;<span className="tyt">Session</span> | <span className="kw">null</span>&gt;(<span className="kw">null</span>)</td></tr>
						<tr className="addln"><td className="ln">6</td><td className="cd">{'  '}<span className="kw">const</span> [loading, setLoading] = <span className="fn">useState</span>(<span className="kw">true</span>)</td></tr>
						<tr><td className="ln">7</td><td className="cd">{'  '}<span className="fn">useEffect</span>(() =&gt; {'{'}</td></tr>
						<tr><td className="ln">8</td><td className="cd">{'    '}supabase.auth.<span className="fn">getSession</span>().<span className="fn">then</span>(({'{'} data {'}'}) =&gt; {'{'}</td></tr>
						<tr><td className="ln">9</td><td className="cd">{'      '}<span className="fn">setS</span>(data.session)</td></tr>
						<tr className="addln"><td className="ln">10</td><td className="cd">{'      '}<span className="fn">setLoading</span>(<span className="kw">false</span>) <span className="cm">{'// resolve before redirect'}</span></td></tr>
						<tr><td className="ln">11</td><td className="cd">{'    '})</td></tr>
						<tr><td className="ln">12</td><td className="cd">{'  '}{'}'}, [])</td></tr>
						<tr><td className="ln">13</td><td className="cd">{'  '}<span className="kw">return</span> {'{'} s, loading {'}'}</td></tr>
						<tr><td className="ln">14</td><td className="cd">{'}'}</td></tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
