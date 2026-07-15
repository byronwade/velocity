import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface MenuItem {
	label?: string;
	icon?: ReactNode;
	hint?: string;
	onClick?: () => void;
	danger?: boolean;
	disabled?: boolean;
	separator?: boolean;
}

/** A right-click context menu anchored at (x, y). Closes on any outside click. */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
	// Keep the menu inside the viewport.
	const [pos, setPos] = useState({ x, y });
	useEffect(() => {
		const w = 216, approxH = items.length * 32 + 10;
		setPos({ x: Math.min(x, window.innerWidth - w - 8), y: Math.min(y, window.innerHeight - approxH - 8) });
	}, [x, y, items.length]);
	useEffect(() => {
		const close = () => onClose();
		window.addEventListener('resize', close);
		window.addEventListener('blur', close);
		return () => { window.removeEventListener('resize', close); window.removeEventListener('blur', close); };
	}, [onClose]);
	return (
		<>
			<div className="vs-ctx-scrim" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
			<div className="vs-ctx" style={{ left: pos.x, top: pos.y }} role="menu" onClick={(e) => e.stopPropagation()}>
				{items.map((it, i) => it.separator ? (
					<div key={i} className="vs-ctx-sep" />
				) : (
					<button key={i} className={`vs-ctx-item${it.danger ? ' danger' : ''}`} disabled={it.disabled}
						onClick={() => { onClose(); it.onClick?.(); }} role="menuitem">
						{it.icon && <span className="vs-ctx-icon">{it.icon}</span>}
						<span className="vs-ctx-label">{it.label}</span>
						{it.hint && <kbd>{it.hint}</kbd>}
					</button>
				))}
			</div>
		</>
	);
}

/** Small helper: track right-click position + open state for a ContextMenu. */
export function useContextMenu() {
	const [at, setAt] = useState<{ x: number; y: number } | null>(null);
	const onContextMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setAt({ x: e.clientX, y: e.clientY }); };
	return { at, onContextMenu, close: () => setAt(null) };
}
