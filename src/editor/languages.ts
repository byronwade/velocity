// ---------------------------------------------------------------------------
// Language selection by file extension. Returns the CodeMirror language support
// for a path, or an empty extension for unknown types (plain text still edits).
// ---------------------------------------------------------------------------

import type { Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

const LANG_NAME: Record<string, string> = {
	ts: 'TypeScript', tsx: 'TypeScript JSX', jsx: 'JavaScript JSX', js: 'JavaScript',
	mjs: 'JavaScript', cjs: 'JavaScript', css: 'CSS', html: 'HTML', htm: 'HTML',
	json: 'JSON', md: 'Markdown', markdown: 'Markdown', sql: 'SQL', txt: 'Plain Text',
};

/** Human-readable language name for the editor status bar. */
export function languageName(path: string): string {
	const dot = path.lastIndexOf('.');
	const ext = dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
	return LANG_NAME[ext] ?? (ext ? ext.toUpperCase() : 'Plain Text');
}

export function languageForPath(path: string): Extension {
	const dot = path.lastIndexOf('.');
	const ext = dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
	switch (ext) {
		case 'ts':
			return javascript({ typescript: true });
		case 'tsx':
			return javascript({ typescript: true, jsx: true });
		case 'jsx':
			return javascript({ jsx: true });
		case 'js':
		case 'mjs':
		case 'cjs':
			return javascript();
		case 'css':
			return css();
		case 'html':
		case 'htm':
			return html();
		case 'json':
			return json();
		case 'md':
		case 'markdown':
			return markdown();
		default:
			return [];
	}
}
