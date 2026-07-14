export type WorkstreamStatus = 'draft' | 'running' | 'needs-input' | 'review-ready' | 'blocked' | 'done';
export type WorkstreamPhase = 'brief' | 'plan' | 'implement' | 'verify';
export type CriterionState = 'verified' | 'partial' | 'failed' | 'not-proven';
export type WorkbenchLayout = 'conversation' | 'artifact' | 'review';

/** The four surfaces always present in the Work view. */
export type ArtifactKind = 'editor' | 'terminal' | 'browser' | 'design';

/** Specialized studios that appear on demand — summoned from ⌘K or by the agent
 *  when its work touches that tool — rather than living as permanent tabs. */
export type StudioKind = 'builder' | 'database' | 'api' | 'observe' | 'test' | 'ship' | 'home' | 'mission' | 'library';

/** Anything that can occupy the Work canvas. */
export type ToolKind = ArtifactKind | StudioKind;

export const CORE_ARTIFACTS: ArtifactKind[] = ['editor', 'terminal', 'browser', 'design'];
export const STUDIO_KINDS: StudioKind[] = ['builder', 'database', 'api', 'observe', 'test', 'ship', 'home', 'mission', 'library'];

export function isStudio(kind: ToolKind): kind is StudioKind {
	return (STUDIO_KINDS as string[]).includes(kind);
}

export interface Criterion {
	id: string;
	title: string;
	description: string;
	state: CriterionState;
	evidence: string[];
	files: string[];
}

export interface WorkEvent {
	id: string;
	title: string;
	detail: string;
	time: string;
	tone: 'neutral' | 'good' | 'warn' | 'danger';
}

export interface Workstream {
	id: string;
	title: string;
	objective: string;
	project: string;
	repo: string;
	status: WorkstreamStatus;
	phase: WorkstreamPhase;
	branch: string;
	worktree: string;
	risk: 'low' | 'medium' | 'high';
	budget: number;
	spent: number;
	updated: string;
	lastEvent: string;
	unread?: boolean;
	criteria: Criterion[];
	events: WorkEvent[];
}

export const INITIAL_WORKSTREAMS: Workstream[] = [
	{
		id: 'auth-passkeys',
		title: 'Add passkey sign-in',
		objective: 'Let returning users sign in with a passkey while preserving the existing email fallback and session rules.',
		project: 'Velocity',
		repo: 'byronwade/velocity',
		status: 'review-ready',
		phase: 'verify',
		branch: 'feat/passkey-sign-in',
		worktree: 'velocity-passkeys',
		risk: 'medium',
		budget: 4,
		spent: 1.84,
		updated: '8m',
		lastEvent: 'Four of five criteria are verified',
		unread: true,
		criteria: [
			{
				id: 'passkey-available',
				title: 'Passkey appears on supported devices',
				description: 'Show the passkey action only when WebAuthn and a platform authenticator are available.',
				state: 'verified',
				evidence: ['Playwright: Chromium desktop', 'WebAuthn capability unit test'],
				files: ['src/auth/PasskeyButton.tsx', 'src/auth/webauthn.ts'],
			},
			{
				id: 'email-fallback',
				title: 'Email sign-in remains available',
				description: 'Existing users must be able to choose email without being forced through passkey enrollment.',
				state: 'verified',
				evidence: ['Existing auth suite: 18 passed', 'Browser recording: fallback flow'],
				files: ['src/auth/SignIn.tsx'],
			},
			{
				id: 'cancel-safe',
				title: 'Cancellation is non-destructive',
				description: 'Dismissing the operating-system prompt returns the user to sign-in without an error state.',
				state: 'verified',
				evidence: ['AbortError integration test', 'Manual Safari check'],
				files: ['src/auth/usePasskey.ts'],
			},
			{
				id: 'session-policy',
				title: 'Session policy is unchanged',
				description: 'Passkey sessions use the same expiry, refresh, and revocation behavior as passwordless email sessions.',
				state: 'partial',
				evidence: ['Session expiry unit test', 'Revocation path not exercised end-to-end'],
				files: ['src/server/auth/session.ts', 'src/server/auth/passkey.ts'],
			},
			{
				id: 'accessible',
				title: 'Keyboard and screen-reader flow works',
				description: 'The complete sign-in choice is keyboard reachable and announces failures without moving focus unexpectedly.',
				state: 'verified',
				evidence: ['axe: zero critical violations', 'Keyboard traversal recording'],
				files: ['src/auth/PasskeyButton.tsx', 'src/auth/SignIn.tsx'],
			},
		],
		events: [
			{ id: 'a1', title: 'Verification complete', detail: 'Unit, integration, and browser suites passed. One revocation path remains unproven.', time: '8m ago', tone: 'good' },
			{ id: 'a2', title: 'Scope held', detail: 'No files outside auth, session, and test surfaces were changed.', time: '19m ago', tone: 'neutral' },
			{ id: 'a3', title: 'Decision recorded', detail: 'Kept email as a first-class fallback instead of hiding it behind More options.', time: '31m ago', tone: 'neutral' },
		],
	},
	{
		id: 'editor-startup',
		title: 'Reduce editor cold start',
		objective: 'Open the first editable file in under 700ms on a representative mid-sized project without changing editor behavior.',
		project: 'Velocity',
		repo: 'byronwade/velocity',
		status: 'running',
		phase: 'implement',
		branch: 'perf/editor-startup',
		worktree: 'velocity-editor-perf',
		risk: 'low',
		budget: 3,
		spent: 0.92,
		updated: 'now',
		lastEvent: 'Measuring grammar-loading changes',
		criteria: [
			{ id: 'cold-start', title: 'Median cold start under 700ms', description: 'Measured over ten clean launches.', state: 'not-proven', evidence: ['Baseline: 1.14s'], files: ['src/editor/CodeMirrorHost.tsx'] },
			{ id: 'languages', title: 'Language support remains lazy and correct', description: 'Existing grammars and completions remain available.', state: 'partial', evidence: ['TypeScript and CSS checked'], files: ['src/editor/languages.ts'] },
			{ id: 'behavior', title: 'Editing behavior is unchanged', description: 'Save, search, multi-cursor, and formatting continue to work.', state: 'not-proven', evidence: [], files: ['src/editor/richEditing.ts'] },
		],
		events: [
			{ id: 'p1', title: 'Benchmark running', detail: 'Comparing eager grammar registration with on-demand loading.', time: 'now', tone: 'neutral' },
			{ id: 'p2', title: 'Baseline captured', detail: 'Median first-editable time: 1.14s over ten runs.', time: '12m ago', tone: 'neutral' },
		],
	},
	{
		id: 'empty-state',
		title: 'Refresh the new-project empty state',
		objective: 'Help a developer move from an empty project to a useful first work item without exposing the full workbench at once.',
		project: 'Velocity',
		repo: 'byronwade/velocity',
		status: 'needs-input',
		phase: 'plan',
		branch: 'design/empty-state',
		worktree: 'velocity-empty-state',
		risk: 'low',
		budget: 2,
		spent: 0.38,
		updated: '24m',
		lastEvent: 'Needs a product direction',
		unread: true,
		criteria: [
			{ id: 'first-task', title: 'A first task takes under one minute', description: 'A new user can describe an outcome and start a draft without configuring tools.', state: 'not-proven', evidence: [], files: ['src/workbench/VelocityWorkbench.tsx'] },
			{ id: 'disclosure', title: 'Advanced surfaces stay hidden initially', description: 'Editor, terminal, and evidence surfaces appear only when useful.', state: 'not-proven', evidence: [], files: ['src/styles/workbench.css'] },
		],
		events: [
			{ id: 'e1', title: 'Direction needed', detail: 'Choose whether starters should describe outcomes or select from templates first.', time: '24m ago', tone: 'warn' },
			{ id: 'e2', title: 'Three concepts prepared', detail: 'Conversation-first, template-first, and recent-project-first variants are ready.', time: '39m ago', tone: 'neutral' },
		],
	},
	{
		id: 'ollama-bridge',
		title: 'Move Ollama behind the desktop bridge',
		objective: 'Use local Ollama models from the Tauri app without asking developers to weaken browser CORS settings.',
		project: 'Velocity',
		repo: 'byronwade/velocity',
		status: 'done',
		phase: 'verify',
		branch: 'desktop/ollama-bridge',
		worktree: 'velocity-tauri',
		risk: 'medium',
		budget: 3,
		spent: 1.12,
		updated: '1d',
		lastEvent: 'Desktop transport verified',
		criteria: [
			{ id: 'discover', title: 'Installed models are discoverable', description: 'The model picker lists models from the configured local endpoint.', state: 'verified', evidence: ['Ollama /api/tags response'], files: ['src/services/ollama.ts'] },
			{ id: 'cors', title: 'No CORS override is required in Tauri', description: 'Desktop traffic is proxied by a Rust command.', state: 'verified', evidence: ['Tauri command transport'], files: ['src-tauri/src/lib.rs'] },
		],
		events: [
			{ id: 'o1', title: 'Desktop bridge ready', detail: 'Browser builds retain direct HTTP fallback; Tauri uses native requests.', time: '1d ago', tone: 'good' },
		],
	},
];

export const STATUS_LABEL: Record<WorkstreamStatus, string> = {
	draft: 'Draft',
	running: 'Running',
	'needs-input': 'Needs you',
	'review-ready': 'Ready to review',
	blocked: 'Blocked',
	done: 'Done',
};

export const CRITERION_LABEL: Record<CriterionState, string> = {
	verified: 'Verified',
	partial: 'Partial',
	failed: 'Failed',
	'not-proven': 'Not proven',
};
