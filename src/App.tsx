import { useEffect, useState } from 'react';
import { ChordStatus } from './components/ChordStatus';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { QuickOpen } from './components/QuickOpen';
import { TodoIndex } from './components/TodoIndex';
import { installKeybindings } from './keybindings/service';
import { registerAppCommands } from './keybindings/registerAppCommands';
import { useShell } from './lib/store';
import { VelocityApp } from './velocity/VelocityApp';

export function App() {
	const theme = useShell((state) => state.theme);
	const [keybindingsOpen, setKeybindingsOpen] = useState(false);

	// Apply the saved theme. A query override remains useful for screenshots and
	// embedded previews without creating another settings surface.
	useEffect(() => {
		const requestedTheme = new URLSearchParams(location.search).get('theme');
		if (requestedTheme === 'light' || requestedTheme === 'dark') {
			useShell.getState().setTheme(requestedTheme);
		}
	}, []);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		document.documentElement.style.colorScheme = theme;
	}, [theme]);

	// Warm the heaviest work surface while the conversation view is idle.
	useEffect(() => {
		const warmEditor = () => { void import('./editor/CodeMirrorHost'); };
		if (window.requestIdleCallback) {
			const id = window.requestIdleCallback(warmEditor, { timeout: 2500 });
			return () => window.cancelIdleCallback?.(id);
		}
		const id = window.setTimeout(warmEditor, 900);
		return () => window.clearTimeout(id);
	}, []);

	useEffect(() => {
		registerAppCommands();
		installKeybindings();
	}, []);

	useEffect(() => {
		const open = () => setKeybindingsOpen(true);
		window.addEventListener('velocity:open-keybindings', open);
		return () => window.removeEventListener('velocity:open-keybindings', open);
	}, []);

	return (
		<div className="app velocity-app">
			<VelocityApp />
			<CommandPalette />
			<QuickOpen />
			<TodoIndex />
			<ChordStatus />
			{keybindingsOpen && <KeyboardShortcuts onClose={() => setKeybindingsOpen(false)} />}
		</div>
	);
}
