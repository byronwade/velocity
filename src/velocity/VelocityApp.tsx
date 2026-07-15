import { useEffect } from 'react';
import { useWorkspace, runtime } from './useWorkspace';
import type { Lens } from './model';
import { TabBar } from './TabBar';
import { Stage } from './Stage';
import { Dock } from './Dock';
import { MissionSheet, RightRail, ToolDrawer, CommandBar, ShareSheet, ShipSheet } from './surfaces';
import './velocity.css';

const LENS_ORDER: Lens[] = ['preview', 'code', 'browser', 'system', 'data', 'tests', 'verify'];

function Confetti() {
	const state = useWorkspace();
	if (!state.celebrate) return null;
	return (
		<div className="vs-confetti" aria-hidden>
			{Array.from({ length: 42 }).map((_, i) => (
				<span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 40}ms`, background: ['#6f74c9', '#4a8dd1', '#2f9e8f', '#e0b34d', '#c96f9a'][i % 5] }} />
			))}
		</div>
	);
}

function Toast() {
	const state = useWorkspace();
	if (!state.toast) return null;
	return <div className="vs-toast" role="status">{state.toast}</div>;
}

export function VelocityApp() {
	// Prototype-scoped keyboard. The production shell routes these through the
	// keybinding engine; here a single scoped listener keeps the demo self-contained.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			const tag = (e.target as HTMLElement)?.tagName;
			const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
			if (e.key === 'Escape') { runtime.closeTopmost(); return; }
			if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); runtime.openCommand(true); return; }
			if (mod && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); runtime.openMissionSheet(true); return; }
			if (mod && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); runtime.openShip(true); return; }
			if (typing || mod) return;
			if (e.key >= '1' && e.key <= '7') { runtime.setLens(LENS_ORDER[Number(e.key) - 1]); return; }
			if (e.key.toLowerCase() === 'c') runtime.comparePreview('stable');
			if (e.key.toLowerCase() === 'f') runtime.toggleFocus();
			if (e.key === '.') runtime.togglePause();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const focusMode = useWorkspace().layout.focusMode;
	return (
		<div className="vs-shell">
			{!focusMode && <TabBar />}
			<div className={`vs-root${focusMode ? ' focus' : ''}`}>
				<div className="vs-main">
					<Stage />
				</div>
				<ToolDrawer />
				<RightRail />
				<Dock />
				<MissionSheet />
				<ShareSheet />
				<ShipSheet />
				<CommandBar />
				<Toast />
				<Confetti />
			</div>
		</div>
	);
}
