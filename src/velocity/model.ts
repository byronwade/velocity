// ---------------------------------------------------------------------------
// Velocity prototype — typed domain model.
//
// This is the visual-product state described in VELOCITY_PRODUCT_VISION.md. It
// is deliberately SEPARATE from future production orchestration: the shape here
// is what the UI renders; a `CoworkerRuntime` (see runtime.ts) produces and
// mutates it deterministically. Nothing here talks to a provider or the network.
// ---------------------------------------------------------------------------

/** The views a pane can show. */
export type Lens = 'preview' | 'code' | 'browser' | 'system' | 'data' | 'tests' | 'verify';

/** What a Preview pane compares the Candidate against. */
export type CompareSource = 'none' | 'stable' | 'live' | 'preview' | 'branch';

export const COMPARE_LABEL: Record<CompareSource, string> = {
	none: 'Candidate', stable: 'vs Stable', live: 'vs Live', preview: 'vs Preview', branch: 'vs Branch',
};

/** Secondary, on-demand developer surfaces (drawers). */
export type ToolId = 'explorer' | 'terminal' | 'logs' | 'problems' | 'scm' | 'checkpoints';

export type Autonomy = 'autopilot' | 'collaborative' | 'guarded' | 'review-first' | 'observe';
export type ApprovalPolicy = 'auto-safe' | 'guarded' | 'review-all';
export type Risk = 'low' | 'medium' | 'high';
export type Health = 'healthy' | 'building' | 'unhealthy';

export type CoworkerState =
	| 'idle' | 'planning' | 'active' | 'verifying' | 'waiting' | 'blocked'
	| 'approval' | 'paused' | 'completed' | 'dismissed' | 'archived';

export type MissionState = 'draft' | 'active' | 'verifying' | 'blocked' | 'review' | 'completed' | 'paused';
export type CriterionState = 'pending' | 'checking' | 'verified' | 'failed';
export type CheckpointState = 'ready' | 'accepted' | 'rejected' | 'revising';
export type DecisionState = 'open' | 'accepted' | 'rejected';
export type EvidenceKind = 'test' | 'screenshot' | 'trace' | 'diff' | 'health' | 'recording';

export interface Budget {
	spent: number;
	total: number;
	unit: '$' | 'tokens' | 'min';
}

export interface Criterion {
	id: string;
	label: string;
	state: CriterionState;
}

/** Where on the stage a coworker's work is happening (a spatial marker). */
export interface Marker {
	lens: Lens;
	/** Position on the stage as 0–100 percentages. */
	x: number;
	y: number;
	label: string;
}

export interface WorkOrder {
	objective: string;
	scope: string;
	acceptanceCriteria: string[];
	maxCycles: number;
	budget: Budget;
	allowedTools: string[];
	stopConditions: string[];
}

export interface Specialist {
	id: string;
	name: string;
	role: string;
	state: CoworkerState;
	action: string;
	workOrder: WorkOrder;
}

export interface Coworker {
	id: string;
	name: string;
	role: string;
	department: string;
	/** Two-letter identity mark. */
	initials: string;
	/** Muted identity color (CSS color). */
	color: string;
	missionId: string | null;
	/** One-line, present-tense description of what they are doing. */
	action: string;
	state: CoworkerState;
	/** Human-readable owned scope, e.g. "onboarding components /users/new". */
	scope: string;
	marker: Marker | null;
	branch: string;
	worktree: string;
	candidateHealth: Health;
	/** The visible model is infrastructure BENEATH the coworker identity. */
	staffing: 'auto' | 'manual';
	model: string;
	fallbackModel: string;
	autonomy: Autonomy;
	approvalPolicy: ApprovalPolicy;
	budget: Budget;
	permissions: string[];
	latestCheckpointId: string | null;
	specialists: Specialist[];
	following: boolean;
	/** True while this coworker is waiting on a dependency (see `waitingOn`). */
	waitingOn?: string;
}

export interface MissionInput {
	title: string;
	outcome: string;
	acceptanceCriteria: string[];
	includedScope: string[];
	excludedScope: string[];
	staffing: 'auto' | 'manual';
	autonomy: Autonomy;
	approvalPolicy: ApprovalPolicy;
	budget: Budget;
	environment: string;
	risk: Risk;
	requiredEvidence: EvidenceKind[];
}

export interface Mission extends MissionInput {
	id: string;
	criteria: Criterion[];
	state: MissionState;
	coworkerIds: string[];
}

export interface Evidence {
	kind: EvidenceKind;
	label: string;
	detail?: string;
}

export interface DiffFile {
	path: string;
	added: number;
	removed: number;
}

export interface Checkpoint {
	id: string;
	coworkerId: string;
	missionId: string | null;
	outcome: string;
	beforeLabel: string;
	afterLabel: string;
	diff: DiffFile[];
	buildOk: boolean;
	tests: { passed: number; total: number };
	evidence: Evidence[];
	limitations: string;
	risk: Risk;
	blastRadius: string[];
	rollbackPoint: string;
	state: CheckpointState;
	createdLabel: string;
}

export interface DecisionOption {
	id: string;
	label: string;
	consequence: string;
	recommended?: boolean;
}

export interface Decision {
	id: string;
	title: string;
	why: string;
	options: DecisionOption[];
	evidence: Evidence[];
	risk: Risk;
	blastRadius: string[];
	state: DecisionState;
	coworkerId: string | null;
}

export type EventKind =
	| 'reserve' | 'waiting' | 'conflict-avoided' | 'conflict' | 'reassign'
	| 'checkpoint' | 'merge' | 'verify-fail' | 'verify-pass' | 'note';

/** Structured coordination feed — the substitute for raw agent chatter. */
export interface WorkspaceEvent {
	id: string;
	tsLabel: string;
	kind: EventKind;
	text: string;
	coworkerId: string | null;
}

export interface ProjectInfo {
	name: string;
	repo: string;
	branch: string;
	environment: string;
}

// --- Human collaboration (real people, distinct from AI coworkers) ---------
export type CollabRole = 'owner' | 'editor' | 'viewer';
export type CollabStatus = 'active' | 'invited' | 'offline';

export interface Collaborator {
	id: string;
	name: string;
	initials: string;
	color: string;
	email: string;
	role: CollabRole;
	status: CollabStatus;
	/** Live cursor position on the stage, or null when not viewing. */
	cursor: { lens: Lens; x: number; y: number } | null;
}

export interface CommentReply {
	authorName: string;
	authorColor: string;
	text: string;
	tsLabel: string;
	fromCoworker?: boolean;
}

/** A comment pinned to a spot on a lens; can be handed to a coworker to fix. */
export interface Comment {
	id: string;
	lens: Lens;
	x: number;
	y: number;
	authorName: string;
	authorColor: string;
	text: string;
	createdLabel: string;
	resolved: boolean;
	assignedCoworkerId: string | null;
	replies: CommentReply[];
}

export interface CandidateEnv {
	health: Health;
	checks: { passed: number; total: number };
	changedRegions: string[];
}

// --- Split workspace: a binary tree of panes, each showing one view ---------
export type SplitDir = 'row' | 'col';
export interface PaneLeaf { kind: 'leaf'; id: string; view: Lens; compareSource?: CompareSource; }
export interface PaneSplit { kind: 'split'; id: string; dir: SplitDir; ratio: number; a: PaneNode; b: PaneNode; }
export type PaneNode = PaneLeaf | PaneSplit;

export interface LayoutState {
	/** The ACTIVE pane's view — kept in sync for commands / keyboard. */
	lens: Lens;
	/** The split-pane tree filling the workspace. */
	panes: PaneNode;
	activePaneId: string;
	openTool: ToolId | null;
	dockExpanded: boolean;
	focusMode: boolean;
	followingId: string | null;
	shipOpen: boolean;
	rightSurface: 'none' | 'checkpoint' | 'coworkers' | 'decision' | 'inspector' | 'activity' | 'follow';
	activeCheckpointId: string | null;
	activeDecisionId: string | null;
	missionSheetOpen: boolean;
	commandOpen: boolean;
	/** True while the stage is armed to drop a comment on the next click. */
	commentMode: boolean;
	activeCommentId: string | null;
	shareOpen: boolean;
}

/** The whole prototype workspace at one moment — one deterministic snapshot. */
export interface WorkspaceState {
	scenario: string;
	scenarioLabel: string;
	project: ProjectInfo;
	mission: Mission | null;
	missions: Mission[];
	coworkers: Coworker[];
	archived: Coworker[];
	collaborators: Collaborator[];
	comments: Comment[];
	events: WorkspaceEvent[];
	checkpoints: Checkpoint[];
	decisions: Decision[];
	candidate: CandidateEnv;
	paused: boolean;
	layout: LayoutState;
	/** Ephemeral, cleared on a timer — a brief confirmation line. */
	toast?: string | null;
	/** Ephemeral — fire the ship celebration once. */
	celebrate?: boolean;
	/** Current deployment, if the project has been shipped to a host. */
	deployment?: Deployment | null;
}

export type DeployTarget = 'vercel' | 'netlify' | 'cloudflare';

export interface Deployment {
	provider: DeployTarget;
	status: 'deploying' | 'live';
	url: string;
	env: string;
	startedLabel: string;
}

export const DEPLOY_TARGETS: { id: DeployTarget; label: string; domain: string }[] = [
	{ id: 'vercel', label: 'Vercel', domain: 'aurora.vercel.app' },
	{ id: 'netlify', label: 'Netlify', domain: 'aurora.netlify.app' },
	{ id: 'cloudflare', label: 'Cloudflare', domain: 'aurora.pages.dev' },
];

export const LENS_META: Record<Lens, { label: string; hint: string }> = {
	preview: { label: 'Preview', hint: 'The running application' },
	code: { label: 'IDE', hint: 'Editor, files + diff' },
	browser: { label: 'Browser', hint: 'Live app in a browser' },
	system: { label: 'System', hint: 'Services, endpoints, request flow' },
	data: { label: 'Data', hint: 'Schema + records' },
	tests: { label: 'Tests', hint: 'Unit + integration runner' },
	verify: { label: 'Verify', hint: 'Acceptance scenarios + evidence' },
};

export const AUTONOMY_LABEL: Record<Autonomy, string> = {
	autopilot: 'Autopilot',
	collaborative: 'Collaborative',
	guarded: 'Guarded',
	'review-first': 'Review First',
	observe: 'Observe Only',
};

export const STATE_TONE: Record<CoworkerState, 'neutral' | 'good' | 'work' | 'warn' | 'danger'> = {
	idle: 'neutral', planning: 'work', active: 'work', verifying: 'work',
	waiting: 'warn', blocked: 'danger', approval: 'warn', paused: 'neutral',
	completed: 'good', dismissed: 'neutral', archived: 'neutral',
};

export const STATE_LABEL: Record<CoworkerState, string> = {
	idle: 'Idle', planning: 'Planning', active: 'Working', verifying: 'Verifying',
	waiting: 'Waiting', blocked: 'Blocked', approval: 'Needs approval', paused: 'Paused',
	completed: 'Done', dismissed: 'Dismissed', archived: 'Archived',
};

export const EVENT_TONE: Record<EventKind, 'neutral' | 'good' | 'work' | 'warn' | 'danger'> = {
	reserve: 'work', waiting: 'warn', 'conflict-avoided': 'good', conflict: 'danger',
	reassign: 'work', checkpoint: 'work', merge: 'good', 'verify-fail': 'danger',
	'verify-pass': 'good', note: 'neutral',
};
