// The "waiting for the second key of a chord" indicator, like VS Code's status
// bar hint. The keybinding service emits `velocity:chord` with the pressed
// prefix while a multi-chord sequence (e.g. ⌘K …) is pending.

import { useEffect, useState } from 'react';

export function ChordStatus() {
	const [text, setText] = useState('');

	useEffect(() => {
		const onChord = (e: Event) => setText((e as CustomEvent<{ text: string }>).detail?.text ?? '');
		window.addEventListener('velocity:chord', onChord as EventListener);
		return () => window.removeEventListener('velocity:chord', onChord as EventListener);
	}, []);

	if (!text) return null;
	return (
		<div className="chord-status" role="status">
			<kbd>{text}</kbd><span>was pressed. Waiting for the next key…</span>
		</div>
	);
}
