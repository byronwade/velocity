// The Ship studio — a deployment control plane over real build artifacts.
//
// Builds are the folders the Builder/agent actually generated under builds/.
// Environments carry real deploy state — promote a build to Preview or
// Production, see when it went live, and roll back to the previous deploy.
// "Open" loads the build's entry file in the editor.

import { useDeploy } from '../services/deploy';
import { useServices } from '../services/container';
import { ENV_NAMES, type EnvName } from '../services/deploy';
import { openFileInActivePane } from '../lib/openFile';
import { Icon } from '../lib/icons';

export function DeploymentStudio(_props: { paneId: string }) {
	const { builds, envs } = useDeploy();
	const { deploy, editor } = useServices();

	return (
		<div className="ship">
			<div className="ship-envs">
				{ENV_NAMES.map((name: EnvName) => {
					const env = envs[name];
					return (
						<div className={`env env-${name}`} key={name}>
							<div className="env-head">
								<span className="env-name">{name}</span>
								{env.current ? <span className="env-live">live</span> : <span className="env-idle">idle</span>}
							</div>
							{env.current ? (
								<>
									<div className="env-build"><Icon.rocket /><span>{env.current}</span></div>
									<div className="env-at">deployed {env.at}</div>
								</>
							) : (
								<div className="env-empty">Nothing deployed yet</div>
							)}
							{env.history.length > 0 && (
								<button className="env-rollback" onClick={() => deploy.rollback(name)}><Icon.reload />Roll back ({env.history.length})</button>
							)}
						</div>
					);
				})}
			</div>

			<div className="ship-sec-head"><span>Builds</span><span className="ship-n">{builds.length}</span></div>
			{builds.length === 0 ? (
				<div className="ship-empty">No builds yet.<br />Generate an app in the Builder or ask the agent to build one — its artifact appears here to ship.</div>
			) : (
				<div className="build-list">
					{builds.map((b) => (
						<div className="build" key={b.slug}>
							<div className="build-info">
								<Icon.builder />
								<span className="build-slug">{b.slug}</span>
								<span className="build-files">{b.files} file{b.files === 1 ? '' : 's'}</span>
							</div>
							<span className="sp" />
							{b.entry && <button className="build-open" onClick={() => openFileInActivePane(editor, b.entry!)} title="Open entry"><Icon.editor /></button>}
							<button className="build-deploy" onClick={() => deploy.deploy('preview', b.slug)}><Icon.rocket />Preview</button>
							<button className="build-deploy prod" onClick={() => deploy.deploy('production', b.slug)}><Icon.rocket />Production</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
