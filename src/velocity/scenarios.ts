// ---------------------------------------------------------------------------
// Deterministic seeded scenarios. Each returns a full WorkspaceState snapshot.
// No randomness — same scenario always yields the same state. Selected by the
// `?scenario=` query param, the ⌘K palette, or the dev scenario menu.
// ---------------------------------------------------------------------------

import type {
	Budget, Coworker, Collaborator, Comment, CompareSource, Decision, Checkpoint, Mission, WorkspaceEvent, WorkspaceState, Lens,
} from './model';

// Muted, cool identity colors — distinct from semantic green/amber/red.
const C = { maya: '#6f74c9', theo: '#4a8dd1', rowan: '#2f9e8f', samir: '#5b7a99', iris: '#8a6fb0' };

function budget(spent: number, total: number, unit: Budget['unit'] = '$'): Budget {
	return { spent, total, unit };
}

const project = { name: 'Aurora', repo: 'aurora/storefront', branch: 'main', environment: 'Preview' };

function baseLayout(lens: Lens = 'preview', leftCompare?: CompareSource) {
	// The app is always the left pane; the scenario's focus lens sits on the right.
	const right: Lens = lens === 'preview' ? 'code' : lens;
	const panes = {
		kind: 'split' as const, id: 's-root', dir: 'row' as const, ratio: 0.6,
		a: { kind: 'leaf' as const, id: 'p-left', view: 'preview' as Lens, compareSource: leftCompare },
		b: { kind: 'leaf' as const, id: 'p-right', view: right },
	};
	return {
		lens: 'preview' as Lens, panes, activePaneId: 'p-left',
		openTool: null, dockExpanded: false, focusMode: false, followingId: null,
		shipOpen: false, rightSurface: 'none' as const, activeCheckpointId: null,
		activeDecisionId: null, missionSheetOpen: false, commandOpen: false,
		commentMode: false, activeCommentId: null, shareOpen: false,
	};
}

// The human collaborators on a project — you (owner) plus invited teammates.
// Distinct from AI coworkers; rendered as live cursors, not avatar chips.
const CO = { you: '#6f74c9', nadia: '#c96f9a', dev: '#e0873d' };
function defaultCollaborators(): Collaborator[] {
	return [
		{ id: 'you', name: 'You', initials: 'BW', color: CO.you, email: 'byron@aurora.dev', role: 'owner', status: 'active', cursor: null },
		{ id: 'nadia', name: 'Nadia Rao', initials: 'NR', color: CO.nadia, email: 'nadia@aurora.dev', role: 'editor', status: 'active', cursor: { lens: 'preview', x: 68, y: 34 } },
		{ id: 'devon', name: 'Devon Hale', initials: 'DH', color: CO.dev, email: 'devon@aurora.dev', role: 'viewer', status: 'active', cursor: { lens: 'code', x: 40, y: 30 } },
	];
}

function baseComments(): Comment[] {
	return [
		{
			id: 'cm1', lens: 'preview', x: 40, y: 66, authorName: 'Nadia Rao', authorColor: CO.nadia,
			text: 'The passkey button should read “Continue with a passkey” — and can we soften the border?',
			createdLabel: '4m', resolved: false, assignedCoworkerId: 'theo',
			replies: [{ authorName: 'Theo', authorColor: '#4a8dd1', text: 'On it — adjusting the label and border weight now.', tsLabel: '3m', fromCoworker: true }],
		},
		{
			id: 'cm2', lens: 'preview', x: 12, y: 30, authorName: 'You', authorColor: CO.you,
			text: 'Hero headline could be one line on mobile. Worth a pass?',
			createdLabel: '2m', resolved: false, assignedCoworkerId: null, replies: [],
		},
	];
}

function coworker(partial: Partial<Coworker> & Pick<Coworker, 'id' | 'name' | 'role' | 'department' | 'initials' | 'color'>): Coworker {
	return {
		missionId: 'm1', action: 'Reviewing scope', state: 'active', scope: '', marker: null,
		branch: `cw/${partial.id}`, worktree: `aurora-${partial.id}`, candidateHealth: 'healthy',
		staffing: 'auto', model: 'Auto · frontier', fallbackModel: 'Local · qwen2.5-coder',
		autonomy: 'collaborative', approvalPolicy: 'guarded', budget: budget(1.2, 5),
		permissions: ['read', 'write', 'run', 'test'], latestCheckpointId: null, specialists: [],
		following: false, ...partial,
	};
}

function mission(over: Partial<Mission> = {}): Mission {
	return {
		id: 'm1', title: 'Rebuild checkout onboarding', outcome: 'Returning users complete checkout onboarding in under a minute with a passkey, email fallback intact.',
		acceptanceCriteria: [], includedScope: ['src/checkout/**', 'src/auth/**'], excludedScope: ['billing', 'analytics'],
		staffing: 'auto', autonomy: 'collaborative', approvalPolicy: 'guarded', budget: budget(3.4, 20),
		environment: 'Candidate', risk: 'medium', requiredEvidence: ['test', 'screenshot', 'trace'],
		criteria: [
			{ id: 'c1', label: 'Passkey path works on supported devices', state: 'verified' },
			{ id: 'c2', label: 'Email fallback preserved', state: 'verified' },
			{ id: 'c3', label: 'Cancellation is non-destructive', state: 'verified' },
			{ id: 'c4', label: 'Session policy unchanged', state: 'checking' },
			{ id: 'c5', label: 'Keyboard + screen-reader flow', state: 'pending' },
		],
		state: 'active', coworkerIds: ['maya', 'theo', 'rowan', 'iris'], ...over,
	};
}

const events = (list: Array<[WorkspaceEvent['kind'], string, string | null, string]>): WorkspaceEvent[] =>
	list.map(([kind, text, coworkerId, tsLabel], i) => ({ id: `e${i}`, kind, text, coworkerId, tsLabel }));

function checkpoint(over: Partial<Checkpoint> & Pick<Checkpoint, 'id' | 'coworkerId' | 'outcome'>): Checkpoint {
	return {
		missionId: 'm1', beforeLabel: 'Stable', afterLabel: 'Candidate',
		diff: [{ path: 'src/checkout/Onboarding.tsx', added: 62, removed: 18 }, { path: 'src/auth/passkey.ts', added: 24, removed: 6 }],
		buildOk: true, tests: { passed: 12, total: 12 },
		evidence: [
			{ kind: 'screenshot', label: 'Onboarding · after', detail: 'Passkey-first, email below' },
			{ kind: 'test', label: '12/12 checks passed', detail: 'unit + integration + a11y' },
			{ kind: 'trace', label: 'Checkout scenario recorded', detail: '4 steps · 1.2s' },
		],
		limitations: 'Revocation path not exercised end-to-end.', risk: 'low',
		blastRadius: ['checkout', 'auth'], rollbackPoint: 'Stable @ 09:41', state: 'ready',
		createdLabel: 'just now', ...over,
	};
}

function makeCoworkers(): Coworker[] {
	return [
		coworker({ id: 'maya', name: 'Maya', role: 'Design Lead', department: 'Design', initials: 'MA', color: C.maya,
			action: 'Refining onboarding layout', state: 'active', scope: 'onboarding · /checkout/new',
			marker: { lens: 'preview', x: 29, y: 55, label: 'Onboarding' }, latestCheckpointId: 'k1',
			specialists: [
				{ id: 'sp1', name: 'Responsive', role: 'Layout Specialist', state: 'active', action: 'Adapting to mobile breakpoints',
					workOrder: { objective: 'Make onboarding responsive 360–1440', scope: 'src/checkout/Onboarding.tsx', acceptanceCriteria: ['No overflow at 360px', 'Tap targets ≥ 44px'], maxCycles: 6, budget: budget(0.4, 2), allowedTools: ['editor', 'preview'], stopConditions: ['criteria met', 'budget'] } },
				{ id: 'sp2', name: 'Accessibility', role: 'A11y Specialist', state: 'verifying', action: 'Auditing focus order + labels',
					workOrder: { objective: 'WCAG AA for onboarding', scope: 'src/checkout/**', acceptanceCriteria: ['axe: 0 critical', 'Full keyboard path'], maxCycles: 5, budget: budget(0.3, 2), allowedTools: ['editor', 'verify'], stopConditions: ['criteria met'] } },
			] }),
		coworker({ id: 'theo', name: 'Theo', role: 'Frontend', department: 'Engineering', initials: 'TH', color: C.theo,
			action: 'Wiring passkey button state', state: 'active', scope: 'src/auth/PasskeyButton.tsx',
			marker: { lens: 'preview', x: 40, y: 66, label: 'Passkey' } }),
		coworker({ id: 'rowan', name: 'Rowan', role: 'Backend', department: 'Engineering', initials: 'RO', color: C.rowan,
			action: 'Waiting for the auth contract', state: 'waiting', waitingOn: 'auth contract from Theo',
			scope: 'services/session', marker: { lens: 'system', x: 62, y: 44, label: '/session' }, autonomy: 'guarded' }),
		coworker({ id: 'iris', name: 'Iris', role: 'QA', department: 'Verification', initials: 'IR', color: C.iris,
			action: 'Running the checkout scenario', state: 'verifying', scope: 'verify · checkout flow',
			marker: { lens: 'verify', x: 40, y: 50, label: 'Checkout scenario' } }),
	];
}

const baseCheckpoints = (): Checkpoint[] => [
	checkpoint({ id: 'k1', coworkerId: 'maya', outcome: 'Passkey-first onboarding, email fallback preserved' }),
];

const baseEvents = (): WorkspaceEvent[] => events([
	['reserve', 'Maya reserved onboarding components (/checkout/new).', 'maya', '2m'],
	['waiting', 'Rowan is waiting for the authentication contract.', 'rowan', '1m'],
	['conflict-avoided', 'Conflict avoided: checkout schema remains owned by Samir.', 'samir', '1m'],
	['verify-pass', 'Iris: 12/12 checks passed on the checkout scenario.', 'iris', 'now'],
]);

type BuilderState = Omit<WorkspaceState, 'collaborators' | 'comments'> & {
	collaborators?: Collaborator[];
	comments?: Comment[];
};
type Builder = () => BuilderState;

const builders: Record<string, Builder> = {
	calm: () => ({
		scenario: 'calm', scenarioLabel: 'Calm project',
		project, mission: mission({ state: 'active' }), missions: [mission()],
		coworkers: makeCoworkers().map((c) => ({ ...c, state: c.id === 'iris' ? 'verifying' : 'active' })),
		archived: [], events: baseEvents(), checkpoints: baseCheckpoints(), decisions: [],
		candidate: { health: 'healthy', checks: { passed: 12, total: 12 }, changedRegions: ['onboarding', 'passkey'] },
		paused: false, layout: baseLayout('preview'),
	}),

	empty: () => ({
		scenario: 'empty', scenarioLabel: 'Empty project',
		project: { ...project, name: 'Untitled', repo: 'you/new-project' }, mission: null, missions: [],
		coworkers: [], archived: [], events: [], checkpoints: [], decisions: [],
		candidate: { health: 'healthy', checks: { passed: 0, total: 0 }, changedRegions: [] },
		paused: false, layout: { ...baseLayout('preview'), missionSheetOpen: false },
	}),

	parallel: () => ({
		scenario: 'parallel', scenarioLabel: 'Parallel coworkers',
		project, mission: mission(), missions: [mission()], coworkers: makeCoworkers(),
		archived: [], events: baseEvents(), checkpoints: baseCheckpoints(), decisions: [],
		candidate: { health: 'building', checks: { passed: 9, total: 12 }, changedRegions: ['onboarding', 'passkey', 'session'] },
		paused: false, layout: baseLayout('preview'),
	}),

	conflict: () => {
		const decision: Decision = {
			id: 'd1', title: 'Two onboarding layouts conflict on the hero region',
			why: 'Maya and Theo both changed the checkout hero. Both pass tests, but only one can ship.',
			options: [
				{ id: 'a', label: "Use Maya's layout", consequence: 'Passkey-first, single column. +2 a11y checks.', recommended: true },
				{ id: 'b', label: "Use Theo's layout", consequence: 'Two-column, faster to email. −1 a11y check.' },
				{ id: 'combine', label: 'Combine both', consequence: 'Assign a specialist to reconcile (~3 min).' },
			],
			evidence: [{ kind: 'screenshot', label: 'A vs B · side by side' }, { kind: 'test', label: 'A 12/12 · B 11/12' }],
			risk: 'medium', blastRadius: ['checkout hero'], state: 'open', coworkerId: 'maya',
		};
		return {
			scenario: 'conflict', scenarioLabel: 'Conflict needs a decision',
			project, mission: mission({ state: 'blocked' }), missions: [mission()],
			coworkers: makeCoworkers().map((c) => (c.id === 'maya' || c.id === 'theo' ? { ...c, state: 'approval', action: 'Awaiting conflict decision' } : c)),
			archived: [], events: events([
				['conflict', 'Conflict detected: Maya and Theo both changed the checkout hero.', 'maya', 'now'],
				['reserve', 'Samir owns the checkout schema — untouched.', 'samir', '3m'],
			]),
			checkpoints: baseCheckpoints(), decisions: [decision],
			candidate: { health: 'building', checks: { passed: 11, total: 12 }, changedRegions: ['hero'] },
			paused: false, layout: { ...baseLayout('preview'), rightSurface: 'decision', activeDecisionId: 'd1' },
		};
	},

	approval: () => {
		const decision: Decision = {
			id: 'd2', title: 'Apply the session-store migration to Candidate?',
			why: 'Rowan needs to migrate the sessions table to support passkey credentials. This is destructive and requires approval.',
			options: [
				{ id: 'apply', label: 'Apply migration', consequence: 'Adds credential columns · reversible via rollback point.', recommended: true },
				{ id: 'dry', label: 'Dry-run first', consequence: 'Validates against a snapshot · no data change.' },
				{ id: 'defer', label: 'Defer', consequence: 'Rowan stays blocked on session work.' },
			],
			evidence: [{ kind: 'diff', label: 'migrations/003_passkey.sql' }, { kind: 'trace', label: 'Affects 1 table · 0 rows lost' }, { kind: 'health', label: 'Rollback point ready' }],
			risk: 'high', blastRadius: ['sessions table'], state: 'open', coworkerId: 'rowan',
		};
		return {
			scenario: 'approval', scenarioLabel: 'Protected approval',
			project, mission: mission(), missions: [mission()],
			coworkers: makeCoworkers().map((c) => (c.id === 'rowan' ? { ...c, state: 'approval', action: 'Awaiting migration approval', waitingOn: undefined } : c)),
			archived: [], events: events([['note', 'Rowan requested approval for a database migration.', 'rowan', 'now']]),
			checkpoints: baseCheckpoints(), decisions: [decision],
			candidate: { health: 'healthy', checks: { passed: 12, total: 12 }, changedRegions: ['session'] },
			paused: false, layout: { ...baseLayout('system'), rightSurface: 'decision', activeDecisionId: 'd2' },
		};
	},

	verifyFail: () => ({
		scenario: 'verifyFail', scenarioLabel: 'Verification failed → refining',
		project, mission: mission({ state: 'verifying' }), missions: [mission()],
		coworkers: makeCoworkers().map((c) => (c.id === 'iris' ? { ...c, state: 'active', action: 'Refining after a failed check' } : c)),
		archived: [], events: events([
			['verify-fail', 'Iris: cancellation left a dangling session (1/3). Refining.', 'iris', 'now'],
			['note', 'Maya reduced scope: fix cancellation cleanup only.', 'maya', '1m'],
		]),
		checkpoints: baseCheckpoints(),
		decisions: [], candidate: { health: 'unhealthy', checks: { passed: 10, total: 12 }, changedRegions: ['cancellation'] },
		paused: false, layout: baseLayout('verify'),
	}),

	checkpoint: () => ({
		scenario: 'checkpoint', scenarioLabel: 'Checkpoint ready',
		project, mission: mission({ state: 'review' }), missions: [mission()], coworkers: makeCoworkers(),
		archived: [], events: baseEvents(),
		checkpoints: [checkpoint({ id: 'k2', coworkerId: 'maya', outcome: 'Passkey-first onboarding — ready for review', createdLabel: 'just now' }), ...baseCheckpoints()],
		decisions: [], candidate: { health: 'healthy', checks: { passed: 12, total: 12 }, changedRegions: ['onboarding'] },
		paused: false, layout: { ...baseLayout('preview'), rightSurface: 'checkpoint', activeCheckpointId: 'k2' },
	}),

	compare: () => ({
		scenario: 'compare', scenarioLabel: 'Stable vs Candidate',
		project, mission: mission(), missions: [mission()], coworkers: makeCoworkers(),
		archived: [], events: baseEvents(), checkpoints: baseCheckpoints(), decisions: [],
		candidate: { health: 'healthy', checks: { passed: 12, total: 12 }, changedRegions: ['onboarding', 'passkey'] },
		paused: false, layout: baseLayout('preview', 'stable'),
	}),

	shipping: () => ({
		scenario: 'shipping', scenarioLabel: 'Ready to ship',
		project, mission: mission({ state: 'completed' }), missions: [mission({ state: 'completed' })],
		coworkers: makeCoworkers().map((c) => ({ ...c, state: 'completed', action: 'Work accepted' })),
		archived: [], events: events([['merge', 'Two healthy checkpoints merged into Candidate.', 'maya', '2m'], ['verify-pass', 'All acceptance criteria verified.', 'iris', 'now']]),
		checkpoints: baseCheckpoints(), decisions: [],
		candidate: { health: 'healthy', checks: { passed: 12, total: 12 }, changedRegions: [] },
		paused: false, layout: { ...baseLayout(), shipOpen: true },
	}),

	devtools: () => ({
		scenario: 'devtools', scenarioLabel: 'Manual developer tools',
		project, mission: mission(), missions: [mission()], coworkers: makeCoworkers(),
		archived: [], events: baseEvents(), checkpoints: baseCheckpoints(), decisions: [],
		candidate: { health: 'healthy', checks: { passed: 12, total: 12 }, changedRegions: [] },
		paused: false, layout: { ...baseLayout('code'), openTool: 'terminal', dockExpanded: true },
	}),
};

export const SCENARIOS: Array<{ key: string; label: string }> = [
	{ key: 'calm', label: 'Calm project' },
	{ key: 'parallel', label: 'Parallel coworkers' },
	{ key: 'checkpoint', label: 'Checkpoint ready' },
	{ key: 'approval', label: 'Protected approval' },
	{ key: 'conflict', label: 'Conflict decision' },
	{ key: 'verifyFail', label: 'Verification failed' },
	{ key: 'compare', label: 'Stable vs Candidate' },
	{ key: 'devtools', label: 'Developer tools' },
	{ key: 'shipping', label: 'Ready to ship' },
	{ key: 'empty', label: 'Empty project' },
];

export function buildScenario(key: string): WorkspaceState {
	const make = builders[key] ?? builders.calm;
	const s = make();
	const hasTeam = s.coworkers.length > 0;
	return {
		...s,
		collaborators: s.collaborators ?? (hasTeam ? defaultCollaborators() : [defaultCollaborators()[0]]),
		comments: s.comments ?? (hasTeam ? baseComments() : []),
	};
}
