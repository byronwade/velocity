// Editor settings — font size, tab width, word wrap, and format-on-save. Changes
// apply live to every open editor (services/editorPrefs drives a reconfigurable
// CodeMirror compartment). Opened from the account menu.

import { useEditorPrefs, setEditorPrefs } from '../services/editorPrefs';
import { Icon } from '../lib/icons';

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18];
const TAB_SIZES = [2, 4, 8];

export function EditorSettings({ onClose }: { onClose: () => void }) {
	const prefs = useEditorPrefs();

	return (
		<div className="modal-scrim" onMouseDown={onClose}>
			<div className="esettings" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Editor settings">
				<div className="mem-head">
					<span><Icon.settings />Editor settings</span>
					<button className="mem-close" onClick={onClose} aria-label="Close"><Icon.close /></button>
				</div>

				<div className="eset-row">
					<div className="eset-label"><b>Font size</b><span>Editor text size</span></div>
					<div className="eset-seg">
						{FONT_SIZES.map((n) => (
							<button key={n} className={prefs.fontSize === n ? 'on' : ''} onClick={() => setEditorPrefs({ fontSize: n })}>{n}</button>
						))}
					</div>
				</div>

				<div className="eset-row">
					<div className="eset-label"><b>Tab width</b><span>Spaces a tab occupies</span></div>
					<div className="eset-seg">
						{TAB_SIZES.map((n) => (
							<button key={n} className={prefs.tabSize === n ? 'on' : ''} onClick={() => setEditorPrefs({ tabSize: n })}>{n}</button>
						))}
					</div>
				</div>

				<div className="eset-row">
					<div className="eset-label"><b>Word wrap</b><span>Wrap long lines to the viewport</span></div>
					<button className={`eset-toggle${prefs.wordWrap ? ' on' : ''}`} role="switch" aria-checked={prefs.wordWrap} onClick={() => setEditorPrefs({ wordWrap: !prefs.wordWrap })}><span /></button>
				</div>

				<div className="eset-row">
					<div className="eset-label"><b>Format on save</b><span>Run Prettier when you press ⌘S</span></div>
					<button className={`eset-toggle${prefs.formatOnSave ? ' on' : ''}`} role="switch" aria-checked={prefs.formatOnSave} onClick={() => setEditorPrefs({ formatOnSave: !prefs.formatOnSave })}><span /></button>
				</div>
			</div>
		</div>
	);
}
