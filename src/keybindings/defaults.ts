// Default keybindings — VS Code's default keymap, mapped onto Velocity commands.
// `mod` resolves to ⌘ on macOS and Ctrl elsewhere. `mac` overrides the binding
// on macOS when VS Code diverges. Users override any of these; see service.ts.

export interface DefaultBinding {
	key: string;
	command: string;
	when?: string;
	/** macOS-specific override of `key`. */
	mac?: string;
}

export const DEFAULT_KEYBINDINGS: DefaultBinding[] = [
	// --- Navigation / workbench ---
	{ key: 'mod+shift+p', command: 'workbench.action.showCommands' },
	{ key: 'f1', command: 'workbench.action.showCommands' },
	{ key: 'mod+p', command: 'workbench.action.quickOpen' },
	{ key: 'mod+e', command: 'workbench.action.openRecent' },
	{ key: 'mod+b', command: 'workbench.action.toggleSidebarVisibility' },
	{ key: 'mod+n', command: 'workbench.action.files.newUntitledFile' },
	{ key: 'mod+w', command: 'workbench.action.closeActiveEditor' },
	{ key: 'mod+\\', command: 'workbench.action.splitEditor' },
	{ key: 'ctrl+`', command: 'workbench.action.terminal.toggleTerminal' },
	{ key: 'mod+j', command: 'velocity.focusCommandBar' },
	{ key: 'mod+shift+m', command: 'workbench.actions.view.problems' },
	{ key: 'mod+,', command: 'workbench.action.openSettings' },
	{ key: 'mod+k mod+s', command: 'workbench.action.openGlobalKeybindings' },
	{ key: 'mod+k mod+t', command: 'workbench.action.selectTheme' },
	{ key: 'mod+enter', command: 'workbench.action.toggleMaximizeEditor' },
	{ key: 'mod+1', command: 'velocity.paneMode.editor' },
	{ key: 'mod+2', command: 'velocity.paneMode.browser' },
	{ key: 'mod+3', command: 'velocity.paneMode.terminal' },
	{ key: 'mod+4', command: 'velocity.paneMode.builder' },
	// Workstream views + new work (keyboard-first navigation).
	{ key: 'mod+alt+1', command: 'velocity.view.conversation' },
	{ key: 'mod+alt+2', command: 'velocity.view.work' },
	{ key: 'mod+alt+3', command: 'velocity.view.review' },
	{ key: 'mod+shift+n', command: 'velocity.newWork' },
	{ key: 'mod+shift+d', command: 'velocity.work.ship' },

	// --- File ---
	{ key: 'mod+s', command: 'workbench.action.files.save', when: 'editorTextFocus' },

	// --- Editing (require editor focus) ---
	{ key: 'mod+z', command: 'undo', when: 'editorTextFocus' },
	{ key: 'mod+shift+z', command: 'redo', when: 'editorTextFocus' },
	{ key: 'ctrl+y', command: 'redo', when: 'editorTextFocus && !isMac' },
	{ key: 'mod+a', command: 'editor.action.selectAll', when: 'editorTextFocus' },
	{ key: 'mod+f', command: 'actions.find', when: 'editorTextFocus' },
	{ key: 'mod+alt+f', command: 'editor.action.startFindReplaceAction', when: 'editorTextFocus' },
	{ key: 'mod+g', command: 'workbench.action.gotoLine', when: 'editorTextFocus' },
	{ key: 'shift+alt+f', command: 'editor.action.formatDocument', when: 'editorTextFocus' },
	{ key: 'mod+/', command: 'editor.action.commentLine', when: 'editorTextFocus' },
	{ key: 'mod+d', command: 'editor.action.addSelectionToNextFindMatch', when: 'editorTextFocus' },
	{ key: 'mod+shift+l', command: 'editor.action.selectHighlights', when: 'editorTextFocus' },
	{ key: 'mod+shift+k', command: 'editor.action.deleteLines', when: 'editorTextFocus' },
	{ key: 'shift+alt+down', command: 'editor.action.copyLinesDownAction', when: 'editorTextFocus' },
	{ key: 'shift+alt+up', command: 'editor.action.copyLinesUpAction', when: 'editorTextFocus' },
	{ key: 'alt+down', command: 'editor.action.moveLinesDownAction', when: 'editorTextFocus' },
	{ key: 'alt+up', command: 'editor.action.moveLinesUpAction', when: 'editorTextFocus' },
	{ key: 'mod+alt+down', command: 'editor.action.insertCursorBelow', when: 'editorTextFocus' },
	{ key: 'mod+alt+up', command: 'editor.action.insertCursorAbove', when: 'editorTextFocus' },
	{ key: 'mod+]', command: 'editor.action.indentLines', when: 'editorTextFocus' },
	{ key: 'mod+[', command: 'editor.action.outdentLines', when: 'editorTextFocus' },
	{ key: 'mod+shift+[', command: 'editor.fold', when: 'editorTextFocus' },
	{ key: 'mod+shift+]', command: 'editor.unfold', when: 'editorTextFocus' },
	{ key: 'mod+k mod+0', command: 'editor.foldAll', when: 'editorTextFocus' },
	{ key: 'mod+k mod+j', command: 'editor.unfoldAll', when: 'editorTextFocus' },
];
