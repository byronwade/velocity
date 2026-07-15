import { Plus, Pause, Play, Command, PanelBottom, Users, Eye, Activity, MessageSquarePlus } from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';
import { STATE_TONE, STATE_LABEL } from './model';

/** The floating presence dock — always-visible coworkers + quick actions. */
export function Dock() {
	const state = useWorkspace();
	const active = state.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
	const following = active.find((c) => c.following);
	const expanded = state.layout.dockExpanded;

	return (
		<div className="vs-dock" role="toolbar" aria-label="Workspace dock">
			<button className="vs-dock-btn primary" onClick={() => runtime.openMissionSheet(true)} title="New mission (⌘⇧N)">
				<Plus size={16} />New work
			</button>

			<div className="vs-dock-sep" />

			<button className={`vs-dock-avatars${expanded ? ' open' : ''}`} onClick={() => runtime.openRight(state.layout.rightSurface === 'coworkers' ? 'none' : 'coworkers')}
				title="Coworkers" aria-label={`${active.length} coworkers`}>
				<span className="vs-avatar-stack">
					{active.slice(0, 4).map((c) => (
						<span key={c.id} className={`vs-avatar tone-${STATE_TONE[c.state]}`} style={{ background: c.color }} title={`${c.name} · ${STATE_LABEL[c.state]}`}>{c.initials}</span>
					))}
					{active.length > 4 && <span className="vs-avatar more">+{active.length - 4}</span>}
				</span>
				<Users size={14} className="vs-dock-usericon" />
			</button>

			{following && (
				<button className={`vs-dock-follow${state.layout.rightSurface === 'follow' ? ' on' : ''}`} onClick={() => runtime.openRight(state.layout.rightSurface === 'follow' ? 'none' : 'follow')} title="See what they're doing" style={{ ['--id' as string]: following.color }}>
					<Eye size={13} />Following {following.name}
				</button>
			)}

			<div className="vs-dock-sep" />

			<button className={`vs-dock-btn${state.layout.commentMode ? ' accent' : ''}`} onClick={() => runtime.toggleCommentMode()} title="Comment — click the stage to pin a note">
				<MessageSquarePlus size={15} />
			</button>
			<button className={`vs-dock-btn${state.layout.rightSurface === 'activity' ? ' on' : ''}`} onClick={() => runtime.openRight(state.layout.rightSurface === 'activity' ? 'none' : 'activity')} title="Activity feed">
				<Activity size={15} />
			</button>
			<button className={`vs-dock-btn${state.paused ? ' warn' : ''}`} onClick={() => runtime.togglePause()} title={state.paused ? 'Resume all' : 'Pause all (safe points)'}>
				{state.paused ? <Play size={15} /> : <Pause size={15} />}
			</button>
			<button className={`vs-dock-btn${state.layout.openTool ? ' on' : ''}`} onClick={() => runtime.openTool(state.layout.openTool ? null : 'explorer')} title="Developer tools">
				<PanelBottom size={15} />
			</button>
			<button className="vs-dock-btn" onClick={() => runtime.openCommand(true)} title="Command palette (⌘K)">
				<Command size={15} />
			</button>
		</div>
	);
}
