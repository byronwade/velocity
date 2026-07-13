// Mode registry: metadata + the (stubbed, for Milestone 1) content component for
// each of the five modes. Modes are real surfaces in later milestones; here they
// render distinct, on-brand placeholders so the shell reads true while the
// split/tab/mode mechanics are proven.

import type { Mode } from '../lib/types';
import { Icon, type IconName } from '../lib/icons';
import { AgentsMode } from './AgentsMode';
import { EditorMode } from './EditorMode';
import { TerminalMode } from './TerminalMode';
import { BrowserMode } from './BrowserMode';
import { BuilderMode } from './BuilderMode';
import { DatabaseStudio } from './DatabaseStudio';
import { ObservabilityStudio } from './ObservabilityStudio';
import { DesignStudio } from './DesignStudio';
import { TestStudio } from './TestStudio';
import { DeploymentStudio } from './DeploymentStudio';
import { HomeDashboard } from './HomeDashboard';
import type { ComponentType } from 'react';

export interface ModeDef {
	id: Mode;
	name: string;
	blurb: string;
	icon: IconName;
	Content: ComponentType<{ paneId: string }>;
	/** Contextual action-button labels shown in the command header for this mode. */
	actions: string[];
}

export const MODE_DEFS: Record<Mode, ModeDef> = {
	agents: { id: 'agents', name: 'Agents', blurb: 'AI pair — chat, plan, edit, run', icon: 'agents', Content: AgentsMode, actions: ['New thread', 'Model', 'Tools'] },
	editor: { id: 'editor', name: 'Live Editor', blurb: 'Code + instant preview', icon: 'editor', Content: EditorMode, actions: ['Format', 'Split', 'Find'] },
	terminal: { id: 'terminal', name: 'Terminal', blurb: 'GPU-fast, multiplexed', icon: 'terminal', Content: TerminalMode, actions: ['New shell', 'Clear', 'Split'] },
	browser: { id: 'browser', name: 'Browser', blurb: 'A real browser, devtools attached', icon: 'browser', Content: BrowserMode, actions: ['Reload', 'Devtools', 'Responsive'] },
	builder: { id: 'builder', name: 'Builder', blurb: 'Describe an app → build → deploy anywhere', icon: 'builder', Content: BuilderMode, actions: ['Regenerate', 'Versions', 'Diff'] },
	database: { id: 'database', name: 'Database', blurb: 'Schema explorer + real SQL over your data', icon: 'database', Content: DatabaseStudio, actions: ['Run', 'New query', 'Export'] },
	observe: { id: 'observe', name: 'Observe', blurb: 'Live errors, rejections & logs', icon: 'activity', Content: ObservabilityStudio, actions: ['Clear', 'Filter', 'Export'] },
	design: { id: 'design', name: 'Design', blurb: 'Tokens, components & routes', icon: 'layers', Content: DesignStudio, actions: ['Tokens', 'Components', 'Sync'] },
	test: { id: 'test', name: 'Test', blurb: 'Real checks over the live workspace', icon: 'beaker', Content: TestStudio, actions: ['Run all', 'Filter'] },
	ship: { id: 'ship', name: 'Ship', blurb: 'Deploy builds to environments', icon: 'rocket', Content: DeploymentStudio, actions: ['Deploy', 'Rollback', 'Envs'] },
	home: { id: 'home', name: 'Home', blurb: 'Project overview at a glance', icon: 'home', Content: HomeDashboard, actions: [] },
};

export { Icon };
