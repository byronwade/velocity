import { useState } from 'react';
import {
	Plus, Pause, Play, Command, PanelBottom, Eye, Activity, Maximize2,
	Flag, ShieldQuestion, Rocket, MoreHorizontal, RotateCcw, MessageSquare,
} from 'lucide-react';
import { useWorkspace, runtime } from './useWorkspace';
import { STATE_TONE, STATE_LABEL, WORK_INTENTS } from './model';

/** Open work items (unresolved comments) — one place to see and jump to them. */
function WorkItems() {
	const state = useWorkspace();
	const [open, setOpen] = useState(false);
	const items = state.comments.filter((c) => !c.resolved);
	if (!items.length) return null;
	const go = (id: string, lens: typeof items[number]['lens']) => {
		setOpen(false);
		runtime.setLens(lens);
		runtime.openComment(id);
	};
	return (
		<div className="vs-dock-more">
			<button className={`vs-dock-btn work${open ? ' on' : ''}`} onClick={() => setOpen((v) => !v)} title="Open work items">
				<MessageSquare size={14} />{items.length}
			</button>
			{open && (
				<>
					<div className="vs-dock-scrim" onClick={() => setOpen(false)} />
					<div className="vs-dockmenu wide" onClick={(e) => e.stopPropagation()}>
						<div className="vs-dockmenu-head">Work items<span>{items.length}</span></div>
						{items.map((c) => {
							const cw = state.coworkers.find((w) => w.id === c.assignedCoworkerId);
							return (
								<button key={c.id} className="vs-workitem" onClick={() => go(c.id, c.lens)}>
									<span className="vs-avatar xs neutral">{cw ? cw.initials : '—'}</span>
									<span className="vs-workitem-text">{c.text}</span>
									{c.intent && <span className="vs-workitem-tag">{WORK_INTENTS[c.intent].label}</span>}
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}

/** Overflow menu that pops up above the dock so it stays compact. */
function DockOverflow() {
	const state = useWorkspace();
	const [open, setOpen] = useState(false);
	const item = (icon: React.ReactNode, label: string, on: boolean, run: () => void) => (
		<button className={`vs-dockmenu-item${on ? ' on' : ''}`} onClick={() => { setOpen(false); run(); }}>{icon}<span>{label}</span></button>
	);
	return (
		<div className="vs-dock-more">
			<button className={`vs-dock-btn${open ? ' on' : ''}`} onClick={() => setOpen((v) => !v)} title="More"><MoreHorizontal size={16} /></button>
			{open && (
				<>
					<div className="vs-dock-scrim" onClick={() => setOpen(false)} />
					<div className="vs-dockmenu" onClick={(e) => e.stopPropagation()}>
						{item(<Activity size={15} />, 'Activity feed', state.layout.rightSurface === 'activity', () => runtime.openRight('activity'))}
						{item(state.paused ? <Play size={15} /> : <Pause size={15} />, state.paused ? 'Resume all' : 'Pause all', state.paused, () => runtime.togglePause())}
						{item(<PanelBottom size={15} />, 'Developer tools', !!state.layout.openTool, () => runtime.openTool(state.layout.openTool ? null : 'explorer'))}
						{item(<Maximize2 size={15} />, 'Focus mode', state.layout.focusMode, () => runtime.toggleFocus())}
						{item(<RotateCcw size={15} />, 'Reset layout', false, () => runtime.resetLayout())}
						{item(<Command size={15} />, 'Command palette', false, () => runtime.openCommand(true))}
					</div>
				</>
			)}
		</div>
	);
}

/** The floating dock — one place for people, work, and quick actions. */
export function Dock() {
	const state = useWorkspace();
	const coworkers = state.coworkers.filter((c) => c.state !== 'archived' && c.state !== 'dismissed');
	const humans = state.collaborators.filter((c) => c.id !== 'you' && c.status === 'active');
	const following = coworkers.find((c) => c.following);
	const pendingReview = state.checkpoints.some((k) => k.state === 'ready');
	const openDecision = state.decisions.some((d) => d.state === 'open');
	const workersOpen = state.layout.rightSurface === 'coworkers';
	const totalWorkers = coworkers.length + humans.length;

	return (
		<div className="vs-dock" role="toolbar" aria-label="Workspace dock">
			<button className={`vs-dock-btn primary${state.layout.commentMode ? ' active' : ''}`} onClick={() => runtime.armWork(!state.layout.commentMode)} title="New work — click your app to place it (⌘⇧N)">
				<Plus size={16} />New work
			</button>

			<div className="vs-dock-sep" />

			<button className={`vs-dock-avatars${workersOpen ? ' open' : ''}`} onClick={() => runtime.openRight(workersOpen ? 'none' : 'coworkers')}
				title="Workers — coworkers + people" aria-label={`${totalWorkers} workers`}>
				<span className="vs-avatar-stack">
					{coworkers.slice(0, 3).map((c) => (
						<span key={c.id} className={`vs-avatar tone-${STATE_TONE[c.state]}`} style={{ background: c.color }} title={`${c.name} · ${STATE_LABEL[c.state]}`}>{c.initials}</span>
					))}
					{humans.slice(0, 2).map((c) => (
						<span key={c.id} className="vs-avatar human" style={{ background: c.color }} title={`${c.name} · person`}>{c.initials}</span>
					))}
					{totalWorkers > 5 && <span className="vs-avatar more">+{totalWorkers - 5}</span>}
				</span>
			</button>

			{following && (
				<button className={`vs-dock-follow${state.layout.rightSurface === 'follow' ? ' on' : ''}`} onClick={() => runtime.openRight(state.layout.rightSurface === 'follow' ? 'none' : 'follow')} title="See what they're doing" style={{ ['--id' as string]: following.color }}>
					<Eye size={13} />Following {following.name}
				</button>
			)}

			{(openDecision || pendingReview) && (
				<>
					<div className="vs-dock-sep" />
					{openDecision && <button className="vs-dock-alert decision" onClick={() => runtime.openRight('decision')} title="A decision needs you"><ShieldQuestion size={14} />Decision</button>}
					{pendingReview && <button className="vs-dock-alert" onClick={() => runtime.openRight('checkpoint')} title="A checkpoint is ready to review"><Flag size={14} />Review</button>}
				</>
			)}

			<div className="vs-dock-sep" />

			<WorkItems />
			<button className="vs-dock-btn" onClick={() => runtime.openShip(true)} title="Ship — deploy (⌘⇧D)">
				<Rocket size={15} />
			</button>
			<DockOverflow />
		</div>
	);
}
