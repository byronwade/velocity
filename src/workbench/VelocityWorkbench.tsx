import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
	AlertCircle,
	ArrowUp,
	Bell,
	Bot,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Circle,
	CircleDollarSign,
	Clock3,
	Code2,
	Command,
	ExternalLink,
	FileCode2,
	FileText,
	FlaskConical,
	FolderGit2,
	GitBranch,
	Globe2,
	Info,
	Layers3,
	ListChecks,
	LoaderCircle,
	Menu,
	MessageSquare,
	Moon,
	MoreHorizontal,
	PanelLeftClose,
	PanelRightClose,
	PanelRightOpen,
	Paperclip,
	Pause,
	Play,
	Plus,
	RotateCcw,
	Search,
	Settings2,
	ShieldCheck,
	Sparkles,
	Sun,
	Terminal,
	X,
	Activity,
	Database,
	LayoutDashboard,
	Library,
	PanelLeft,
	Rocket,
	Wand2,
	Waypoints,
	Webhook,
} from 'lucide-react';
import { AgentThread } from '../modes/AgentsMode';
import { EditorMode } from '../modes/EditorMode';
import { TerminalMode } from '../modes/TerminalMode';
import { BrowserMode } from '../modes/BrowserMode';
import { DesignStudio } from '../modes/DesignStudio';
import { BuilderMode } from '../modes/BuilderMode';
import { DatabaseStudio } from '../modes/DatabaseStudio';
import { ApiStudio } from '../modes/ApiStudio';
import { ObservabilityStudio } from '../modes/ObservabilityStudio';
import { TestStudio } from '../modes/TestStudio';
import { DeploymentStudio } from '../modes/DeploymentStudio';
import { HomeDashboard } from '../modes/HomeDashboard';
import { MissionControl } from '../modes/MissionControl';
import { LibraryMode } from '../modes/LibraryMode';
import { WorkFiles } from './WorkFiles';
import { ModelPicker } from '../components/ModelPicker';
import { useAgentThread } from '../services/agent';
import { useServices } from '../services/container';
import { listOllamaModels, pingOllama } from '../services/ollama';
import { providerLabel, setAgentSettings, useAgentSettings } from '../services/agentSettings';
import { useShell } from '../lib/store';
import {
	CORE_ARTIFACTS,
	CRITERION_LABEL,
	INITIAL_WORKSTREAMS,
	isStudio,
	STATUS_LABEL,
	type Criterion,
	type CriterionState,
	type StudioKind,
	type ToolKind,
	type WorkbenchLayout,
	type Workstream,
	type WorkstreamStatus,
} from './model';

/** Label + icon + real component for every surface the Work canvas can host.
 *  Studios are the existing mode components, reused verbatim — mounted on demand. */
const SURFACES: Record<ToolKind, { label: string; icon: ReactNode; Content: ComponentType<{ paneId: string }> }> = {
	editor: { label: 'Code', icon: <Code2 />, Content: EditorMode },
	terminal: { label: 'Terminal', icon: <Terminal />, Content: TerminalMode },
	browser: { label: 'Preview', icon: <Globe2 />, Content: BrowserMode },
	design: { label: 'Design', icon: <Layers3 />, Content: DesignStudio },
	builder: { label: 'Builder', icon: <Wand2 />, Content: BuilderMode },
	database: { label: 'Database', icon: <Database />, Content: DatabaseStudio },
	api: { label: 'API', icon: <Webhook />, Content: ApiStudio },
	observe: { label: 'Observe', icon: <Activity />, Content: ObservabilityStudio },
	test: { label: 'Test', icon: <FlaskConical />, Content: TestStudio },
	ship: { label: 'Ship', icon: <Rocket />, Content: DeploymentStudio },
	home: { label: 'Home', icon: <LayoutDashboard />, Content: HomeDashboard },
	mission: { label: 'Mission', icon: <Waypoints />, Content: MissionControl },
	library: { label: 'Library', icon: <Library />, Content: LibraryMode },
};

const STATUS_ORDER: WorkstreamStatus[] = ['needs-input', 'review-ready', 'blocked', 'running', 'draft', 'done'];

function statusTone(status: WorkstreamStatus): string {
	if (status === 'review-ready' || status === 'done') return 'good';
	if (status === 'needs-input') return 'warn';
	if (status === 'blocked') return 'danger';
	if (status === 'running') return 'working';
	return 'neutral';
}

function criterionIcon(state: CriterionState) {
	if (state === 'verified') return <CheckCircle2 />;
	if (state === 'partial') return <AlertCircle />;
	if (state === 'failed') return <X />;
	return <Circle />;
}

function formatMoney(value: number): string {
	return `$${value.toFixed(2)}`;
}

interface WorkstreamRowProps {
	workstream: Workstream;
	active: boolean;
	onSelect: () => void;
}

function WorkstreamRow({ workstream, active, onSelect }: WorkstreamRowProps) {
	return (
		<button className={`vw-work-row${active ? ' active' : ''}`} onClick={onSelect}>
			<span className={`vw-status-dot ${statusTone(workstream.status)}`} />
			<span className="vw-work-copy">
				<span className="vw-work-title">{workstream.title}</span>
				<span className="vw-work-meta">{workstream.lastEvent}</span>
			</span>
			<span className="vw-work-time">{workstream.updated}</span>
			{workstream.unread && <span className="vw-unread" aria-label="Unread update" />}
		</button>
	);
}

interface SidebarProps {
	open: boolean;
	search: string;
	onSearch: (value: string) => void;
	workstreams: Workstream[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onNew: () => void;
	onClose: () => void;
	onSettings: () => void;
	provider: string;
	ollamaHealthy: boolean | null;
}

function WorkstreamSidebar({ open, search, onSearch, workstreams, activeId, onSelect, onNew, onClose, onSettings, provider, ollamaHealthy }: SidebarProps) {
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return workstreams;
		return workstreams.filter((work) => `${work.title} ${work.objective} ${work.repo}`.toLowerCase().includes(q));
	}, [search, workstreams]);
	const attention = filtered.filter((work) => work.status === 'needs-input' || work.status === 'review-ready' || work.status === 'blocked');
	const active = filtered.filter((work) => work.status === 'running' || work.status === 'draft');
	const recent = filtered.filter((work) => work.status === 'done');

	return (
		<aside className={`vw-sidebar${open ? ' open' : ''}`} aria-hidden={!open}>
			<div className="vw-sidebar-top" data-tauri-drag-region>
				<div className="vw-brand">
					<span className="vw-brand-mark"><Sparkles /></span>
					<span>Velocity</span>
				</div>
				<button className="vw-icon-btn" onClick={onClose} title="Close sidebar" aria-label="Close sidebar"><PanelLeftClose /></button>
			</div>
			<button className="vw-new-work" onClick={onNew}><Plus />New work</button>
			<label className="vw-search">
				<Search />
				<input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search work" />
				<span>⌘K</span>
			</label>

			<div className="vw-sidebar-scroll">
				{attention.length > 0 && (
					<section className="vw-work-group">
						<div className="vw-group-label"><span>Needs your attention</span><b>{attention.length}</b></div>
						{attention.map((work) => <WorkstreamRow key={work.id} workstream={work} active={work.id === activeId} onSelect={() => onSelect(work.id)} />)}
					</section>
				)}
				{active.length > 0 && (
					<section className="vw-work-group">
						<div className="vw-group-label"><span>In progress</span></div>
						{active.map((work) => <WorkstreamRow key={work.id} workstream={work} active={work.id === activeId} onSelect={() => onSelect(work.id)} />)}
					</section>
				)}
				{recent.length > 0 && (
					<section className="vw-work-group">
						<div className="vw-group-label"><span>Recent</span></div>
						{recent.map((work) => <WorkstreamRow key={work.id} workstream={work} active={work.id === activeId} onSelect={() => onSelect(work.id)} />)}
					</section>
				)}
				{filtered.length === 0 && <div className="vw-sidebar-empty">No matching workstreams</div>}
			</div>

			<div className="vw-sidebar-footer">
				<button className="vw-provider-row" onClick={onSettings}>
					<span className={`vw-provider-icon${ollamaHealthy ? ' connected' : ''}`}><Bot /></span>
					<span><b>{provider}</b><small>{ollamaHealthy === true ? 'Local model connected' : ollamaHealthy === false ? 'Ollama is offline' : 'Model and runtime settings'}</small></span>
					<Settings2 />
				</button>
				<button className="vw-account-row" onClick={onSettings}>
					<span className="vw-avatar">B</span>
					<span><b>Byron</b><small>Local workspace</small></span>
					<MoreHorizontal />
				</button>
			</div>
		</aside>
	);
}

interface HeaderProps {
	active: Workstream | null;
	layout: WorkbenchLayout;
	sidebarOpen: boolean;
	onOpenSidebar: () => void;
	onLayout: (layout: WorkbenchLayout) => void;
	onAttention: () => void;
	onActivity: () => void;
	onSettings: () => void;
	attentionCount: number;
}

function WorkstreamHeader({ active, layout, sidebarOpen, onOpenSidebar, onLayout, onAttention, onActivity, onSettings, attentionCount }: HeaderProps) {
	const verified = active?.criteria.filter((criterion) => criterion.state === 'verified').length ?? 0;
	return (
		<header className="vw-header" data-tauri-drag-region>
			<div className="vw-header-left">
				{!sidebarOpen && <button className="vw-icon-btn" onClick={onOpenSidebar} title="Open sidebar" aria-label="Open sidebar"><Menu /></button>}
				<div className="vw-title-block">
					<span className="vw-breadcrumb">{active ? active.repo : 'Velocity'}</span>
					<div className="vw-title-line">
						<h1>{active?.title ?? 'New work'}</h1>
						{active && <span className={`vw-status-pill ${statusTone(active.status)}`}>{active.status === 'running' && <LoaderCircle className="vw-rotate" />}{STATUS_LABEL[active.status]}</span>}
					</div>
				</div>
			</div>

			{active && (
				<nav className="vw-layout-switch" aria-label="Workstream view">
					<button className={layout === 'conversation' ? 'active' : ''} onClick={() => onLayout('conversation')}><MessageSquare />Conversation</button>
					<button className={layout === 'artifact' ? 'active' : ''} onClick={() => onLayout('artifact')}><Code2 />Work</button>
					<button className={layout === 'review' ? 'active' : ''} onClick={() => onLayout('review')}><ListChecks />Review <span>{verified}/{active.criteria.length}</span></button>
				</nav>
			)}

			<div className="vw-header-actions">
				{active && <button className="vw-context-chip" onClick={onActivity} title="Workstream details"><GitBranch />{active.branch}<ChevronDown /></button>}
				<button className="vw-icon-btn vw-attention-btn" onClick={onAttention} title="Attention inbox" aria-label="Attention inbox"><Bell />{attentionCount > 0 && <span>{attentionCount}</span>}</button>
				<button className="vw-icon-btn" onClick={onSettings} title="Settings" aria-label="Settings"><Settings2 /></button>
			</div>
		</header>
	);
}

function EmptyConversation({ onCreate }: { onCreate: (prompt: string) => void }) {
	const [prompt, setPrompt] = useState('');
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const suggestions = [
		{ icon: <Code2 />, title: 'Build a feature', prompt: 'Add a keyboard-first command menu to this project' },
		{ icon: <FlaskConical />, title: 'Investigate a problem', prompt: 'Find why the editor takes so long to become interactive' },
		{ icon: <ShieldCheck />, title: 'Review a change', prompt: 'Review the current diff for regressions and missing proof' },
		{ icon: <FileText />, title: 'Plan a change', prompt: 'Plan a safe migration from browser storage to a local database' },
	];
	function submit() {
		const value = prompt.trim();
		if (!value) return;
		onCreate(value);
	}
	return (
		<div className="vw-empty-state">
			<div className="vw-empty-inner">
				<span className="vw-empty-mark"><Sparkles /></span>
				<p className="vw-eyebrow">A calmer way to build software</p>
				<h2>What do you want to accomplish?</h2>
				<p className="vw-empty-copy">Start with the outcome. Velocity will keep the brief, work, context, and proof together.</p>
				<div className="vw-empty-composer" onClick={() => inputRef.current?.focus()}>
					<textarea
						ref={inputRef}
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }}
						placeholder="Describe an outcome, bug, or decision…"
						rows={2}
					/>
					<div className="vw-composer-tools">
						<button title="Attach context"><Paperclip /></button>
						<span className="vw-scope-chip"><FolderGit2 />velocity</span>
						<span className="vw-spacer" />
						<ModelPicker />
						<button className="vw-send" onClick={submit} disabled={!prompt.trim()}><ArrowUp /></button>
					</div>
				</div>
				<div className="vw-suggestions">
					{suggestions.map((suggestion) => (
						<button key={suggestion.title} onClick={() => { setPrompt(suggestion.prompt); inputRef.current?.focus(); }}>
							<span>{suggestion.icon}</span><b>{suggestion.title}</b><small>{suggestion.prompt}</small>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

function SinceYouLeft({ workstream, onDismiss }: { workstream: Workstream; onDismiss: () => void }) {
	return (
		<div className="vw-resume-card">
			<div className="vw-resume-icon"><Clock3 /></div>
			<div className="vw-resume-copy">
				<div className="vw-card-kicker">Since you left</div>
				<h3>{workstream.lastEvent}</h3>
				<p>{workstream.events[0]?.detail}</p>
				<div className="vw-resume-facts">
					<span><CheckCircle2 />{workstream.criteria.filter((criterion) => criterion.state === 'verified').length} verified</span>
					<span><AlertCircle />{workstream.criteria.filter((criterion) => criterion.state !== 'verified').length} need review</span>
					<span><CircleDollarSign />{formatMoney(workstream.spent)} spent</span>
				</div>
			</div>
			<button className="vw-icon-btn" onClick={onDismiss} aria-label="Dismiss summary"><X /></button>
		</div>
	);
}

function WorkBrief({ workstream, onOpenReview }: { workstream: Workstream; onOpenReview: () => void }) {
	const [expanded, setExpanded] = useState(false);
	const verified = workstream.criteria.filter((criterion) => criterion.state === 'verified').length;
	return (
		<section className={`vw-brief${expanded ? ' expanded' : ''}`}>
			<button className="vw-brief-summary" onClick={() => setExpanded((value) => !value)}>
				<span className="vw-brief-icon"><FileText /></span>
				<span className="vw-brief-copy"><b>Work brief</b><small>{workstream.objective}</small></span>
				<span className="vw-brief-progress"><span style={{ width: `${Math.round((verified / workstream.criteria.length) * 100)}%` }} /></span>
				<span className="vw-brief-count">{verified}/{workstream.criteria.length}</span>
				<ChevronDown />
			</button>
			{expanded && (
				<div className="vw-brief-details">
					<div><span>Outcome</span><p>{workstream.objective}</p></div>
					<div><span>Boundaries</span><p>Only change the scoped feature and its tests. Keep existing behavior available. Ask before adding dependencies or external side effects.</p></div>
					<div className="vw-brief-criteria">
						<span>Definition of done</span>
						{workstream.criteria.map((criterion) => <button key={criterion.id} onClick={onOpenReview} className={criterion.state}>{criterionIcon(criterion.state)}{criterion.title}</button>)}
					</div>
				</div>
			)}
		</section>
	);
}

interface ComposerProps {
	brainKey: string;
	workstream: Workstream;
	onOpenArtifact: () => void;
}

function WorkstreamComposer({ brainKey, workstream, onOpenArtifact }: ComposerProps) {
	const { agent } = useServices();
	const { busy } = useAgentThread(brainKey);
	const settings = useAgentSettings();
	const [input, setInput] = useState('');
	const textRef = useRef<HTMLTextAreaElement>(null);
	function send() {
		const value = input.trim();
		if (!value || busy) return;
		setInput('');
		void agent.send(brainKey, value);
	}
	return (
		<div className="vw-composer-wrap">
			<div className="vw-composer-scope">
				<span><FolderGit2 />{workstream.repo}</span>
				<span><GitBranch />{workstream.branch}</span>
			</div>
			<div className="vw-composer" onClick={() => textRef.current?.focus()}>
				<textarea
					ref={textRef}
					value={input}
					onChange={(event) => setInput(event.target.value)}
					onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }}
					placeholder={busy ? 'Velocity is working…' : 'Ask a follow-up, change scope, or request proof…'}
					rows={1}
				/>
				<div className="vw-composer-tools">
					<button title="Attach files or context"><Paperclip /></button>
					<button title="Open workspace" onClick={onOpenArtifact}><Code2 /></button>
					<span className="vw-spacer" />
					<ModelPicker />
					<button className={`vw-send${busy ? ' stop' : ''}`} onClick={busy ? undefined : send} disabled={!busy && !input.trim()} title={busy ? 'Agent is working' : 'Send'}>
						{busy ? <Pause /> : <ArrowUp />}
					</button>
				</div>
			</div>
			<div className="vw-composer-foot"><span>{providerLabel(settings)}</span><span className="vw-spacer" /><span>{formatMoney(workstream.spent)} / {formatMoney(workstream.budget)}</span></div>
		</div>
	);
}

function ConversationView({ workstream, onReview, onArtifact }: { workstream: Workstream; onReview: () => void; onArtifact: () => void }) {
	const [resumeVisible, setResumeVisible] = useState(Boolean(workstream.unread || workstream.status === 'review-ready'));
	const brainKey = `work:${workstream.id}`;
	useEffect(() => { setResumeVisible(Boolean(workstream.unread || workstream.status === 'review-ready')); }, [workstream.id, workstream.status, workstream.unread]);
	return (
		<div className="vw-conversation">
			<div className="vw-conversation-scroll">
				<div className="vw-thread-column">
					{resumeVisible && <SinceYouLeft workstream={workstream} onDismiss={() => setResumeVisible(false)} />}
					<WorkBrief workstream={workstream} onOpenReview={onReview} />
					<AgentThread brainKey={brainKey} />
				</div>
			</div>
			<WorkstreamComposer brainKey={brainKey} workstream={workstream} onOpenArtifact={onArtifact} />
		</div>
	);
}

interface ArtifactViewProps {
	workstream: Workstream;
	artifact: ToolKind;
	openStudios: StudioKind[];
	onSelect: (kind: ToolKind) => void;
	onCloseStudio: (kind: StudioKind) => void;
}

function ArtifactView({ workstream, artifact, openStudios, onSelect, onCloseStudio }: ArtifactViewProps) {
	const [threadOpen, setThreadOpen] = useState(true);
	const [filesOpen, setFilesOpen] = useState(true);
	const brainKey = `work:${workstream.id}`;
	const editorPaneId = `work:${workstream.id}:editor`;
	const isEditor = artifact === 'editor';
	const Surface = SURFACES[artifact].Content;
	return (
		<div className={`vw-artifact-layout${threadOpen ? ' thread-open' : ''}`}>
			{threadOpen && (
				<aside className="vw-artifact-thread">
					<div className="vw-artifact-thread-head"><div><span>Conversation</span><small>{workstream.lastEvent}</small></div><button className="vw-icon-btn" onClick={() => setThreadOpen(false)}><PanelRightClose /></button></div>
					<AgentThread brainKey={brainKey} />
					<WorkstreamComposer brainKey={brainKey} workstream={workstream} onOpenArtifact={() => undefined} />
				</aside>
			)}
			<section className="vw-artifact-main">
				<div className="vw-artifact-bar">
					{!threadOpen && <button className="vw-icon-btn" onClick={() => setThreadOpen(true)} title="Open conversation"><PanelRightOpen /></button>}
					<div className="vw-artifact-tabs">
						{CORE_ARTIFACTS.map((id) => (
							<button key={id} className={artifact === id ? 'active' : ''} onClick={() => onSelect(id)}>{SURFACES[id].icon}{SURFACES[id].label}</button>
						))}
						{openStudios.length > 0 && <span className="vw-tab-divider" aria-hidden />}
						{openStudios.map((id) => (
							<button key={id} className={`vw-studio-tab${artifact === id ? ' active' : ''}`} onClick={() => onSelect(id)}>
								{SURFACES[id].icon}{SURFACES[id].label}
								<span className="vw-tab-close" role="button" tabIndex={0} aria-label={`Close ${SURFACES[id].label}`} onClick={(event) => { event.stopPropagation(); onCloseStudio(id); }}><X /></span>
							</button>
						))}
					</div>
					{isEditor && (
						<button className={`vw-icon-btn${filesOpen ? ' on' : ''}`} title={filesOpen ? 'Hide files' : 'Show files'} aria-pressed={filesOpen} onClick={() => setFilesOpen((value) => !value)}><PanelLeft /></button>
					)}
					<span className="vw-spacer" />
					<span className="vw-saved"><Check />Saved</span>
					<button className="vw-icon-btn" title="Run in Preview" aria-label="Run in Preview" onClick={() => onSelect('browser')}><Play /></button>
					<button className="vw-icon-btn" title="More actions" aria-label="More actions" onClick={() => window.dispatchEvent(new Event('velocity:command-palette'))}><MoreHorizontal /></button>
				</div>
				<div className="vw-artifact-canvas">
					{isEditor ? (
						<div className={`vw-code-surface${filesOpen ? ' files-open' : ''}`}>
							{filesOpen && <WorkFiles paneId={editorPaneId} />}
							<div className="vw-code-editor"><EditorMode paneId={editorPaneId} /></div>
						</div>
					) : (
						<Surface paneId={`work:${workstream.id}:${artifact}`} />
					)}
				</div>
			</section>
		</div>
	);
}

function PrototypePreview() {
	return (
		<div className="vw-preview-stage">
			<div className="vw-preview-window">
				<div className="vw-preview-chrome"><i /><i /><i /><span>localhost:3000/sign-in</span></div>
				<div className="vw-auth-preview">
					<div className="vw-auth-brand"><span className="vw-brand-mark"><Sparkles /></span>Velocity</div>
					<div className="vw-auth-card">
						<h3>Welcome back</h3>
						<p>Choose how you want to sign in.</p>
						<button className="vw-passkey-button"><ShieldCheck />Continue with a passkey</button>
						<div className="vw-auth-divider"><span>or</span></div>
						<label>Email address<input value="byron@example.com" readOnly /></label>
						<button className="vw-email-button">Continue with email</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function DiffPreview({ criterion }: { criterion: Criterion }) {
	return (
		<div className="vw-diff-view">
			<div className="vw-diff-file"><FileCode2 /><span>{criterion.files[0] ?? 'src/auth/SignIn.tsx'}</span><span className="vw-spacer" /><b className="add">+24</b><b className="del">−6</b></div>
			<pre>
				<span className="ctx">  const canUsePasskey = usePasskeyAvailability();</span>
				<span className="add">+ const onPasskey = async () =&gt; {'{'}</span>
				<span className="add">+   const result = await authenticateWithPasskey();</span>
				<span className="add">+   if (result.kind === 'cancelled') return;</span>
				<span className="add">+   await completeSession(result.session);</span>
				<span className="add">+ {'}'};</span>
				<span className="ctx"> </span>
				<span className="ctx">  return (</span>
				<span className="add">+   {'{'}canUsePasskey &amp;&amp (</span>
				<span className="add">+     &lt;PasskeyButton onSelect={'{'}onPasskey{'}'} /&gt;</span>
				<span className="add">+   ){'}'}</span>
				<span className="ctx">    &lt;EmailSignIn onComplete={'{'}completeSession{'}'} /&gt;</span>
				<span className="ctx">  );</span>
			</pre>
		</div>
	);
}

interface ReviewProps {
	workstream: Workstream;
	onAccept: () => void;
	onSendBack: () => void;
}

function ReviewView({ workstream, onAccept, onSendBack }: ReviewProps) {
	const [criterionId, setCriterionId] = useState(workstream.criteria[0]?.id ?? '');
	const [mode, setMode] = useState<'preview' | 'diff'>('preview');
	const criterion = workstream.criteria.find((item) => item.id === criterionId) ?? workstream.criteria[0];
	if (!criterion) return null;
	return (
		<div className="vw-review-layout">
			<aside className="vw-criteria-panel">
				<div className="vw-review-panel-head"><span>Definition of done</span><b>{workstream.criteria.filter((item) => item.state === 'verified').length}/{workstream.criteria.length}</b></div>
				<div className="vw-criteria-list">
					{workstream.criteria.map((item, index) => (
						<button key={item.id} className={`${item.id === criterion.id ? 'active ' : ''}${item.state}`} onClick={() => setCriterionId(item.id)}>
							<span className="vw-criterion-number">{index + 1}</span>
							<span className="vw-criterion-copy"><b>{item.title}</b><small>{CRITERION_LABEL[item.state]}</small></span>
							{criterionIcon(item.state)}
						</button>
					))}
				</div>
				<div className="vw-review-actions">
					<button className="vw-secondary-action" onClick={onSendBack}><RotateCcw />Send back</button>
					<button className="vw-primary-action" onClick={onAccept}><Check />Accept work</button>
				</div>
			</aside>
			<section className="vw-review-main">
				<div className="vw-review-toolbar">
					<div><span className="vw-card-kicker">Criterion</span><h2>{criterion.title}</h2></div>
					<div className="vw-preview-switch"><button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}><Globe2 />Behavior</button><button className={mode === 'diff' ? 'active' : ''} onClick={() => setMode('diff')}><Code2 />Diff</button></div>
				</div>
				<div className="vw-review-canvas">{mode === 'preview' ? <PrototypePreview /> : <DiffPreview criterion={criterion} />}</div>
			</section>
			<aside className="vw-evidence-panel">
				<div className="vw-review-panel-head"><span>Evidence</span><ShieldCheck /></div>
				<div className={`vw-evidence-state ${criterion.state}`}>{criterionIcon(criterion.state)}<div><b>{CRITERION_LABEL[criterion.state]}</b><span>{criterion.description}</span></div></div>
				<section><h3>Proof collected</h3>{criterion.evidence.length ? criterion.evidence.map((item) => <button key={item}><CheckCircle2 /><span>{item}</span><ExternalLink /></button>) : <p className="vw-empty-evidence">No independent evidence has been collected yet.</p>}</section>
				<section><h3>Affected files</h3>{criterion.files.map((file) => <button key={file}><FileCode2 /><span>{file}</span><ChevronRight /></button>)}</section>
				<section className="vw-risk-box"><h3><Info />Known limitation</h3><p>{criterion.state === 'verified' ? 'No unresolved risk was recorded for this criterion.' : 'The implementing agent has not independently exercised the complete revocation path.'}</p></section>
			</aside>
		</div>
	);
}

function ActivityDrawer({ workstream, onClose }: { workstream: Workstream; onClose: () => void }) {
	return (
		<div className="vw-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="vw-activity-drawer">
				<header><div><span className="vw-card-kicker">Workstream details</span><h2>{workstream.title}</h2></div><button className="vw-icon-btn" onClick={onClose}><X /></button></header>
				<div className="vw-detail-grid">
					<div><span>Repository</span><b>{workstream.repo}</b></div><div><span>Branch</span><b>{workstream.branch}</b></div><div><span>Worktree</span><b>{workstream.worktree}</b></div><div><span>Spend</span><b>{formatMoney(workstream.spent)} / {formatMoney(workstream.budget)}</b></div>
				</div>
				<div className="vw-event-list"><h3>Meaningful activity</h3>{workstream.events.map((event) => <div className="vw-event" key={event.id}><span className={`vw-event-dot ${event.tone}`} /><div><b>{event.title}</b><p>{event.detail}</p></div><time>{event.time}</time></div>)}</div>
			</section>
		</div>
	);
}

function AttentionSheet({ workstreams, onOpen, onClose }: { workstreams: Workstream[]; onOpen: (id: string) => void; onClose: () => void }) {
	const items = workstreams.filter((work) => work.status === 'needs-input' || work.status === 'review-ready' || work.status === 'blocked');
	return (
		<div className="vw-sheet-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="vw-sheet">
				<header><div><span className="vw-card-kicker">Attention inbox</span><h2>What needs you</h2></div><button className="vw-icon-btn" onClick={onClose}><X /></button></header>
				<p className="vw-sheet-intro">Only decisions, blockers, and review-ready work appear here.</p>
				<div className="vw-attention-list">{items.map((work) => <button key={work.id} onClick={() => onOpen(work.id)}><span className={`vw-attention-icon ${statusTone(work.status)}`}>{work.status === 'review-ready' ? <CheckCircle2 /> : work.status === 'blocked' ? <X /> : <AlertCircle />}</span><span><b>{work.title}</b><small>{work.lastEvent}</small></span><span className="vw-attention-action">{work.status === 'review-ready' ? 'Review' : 'Open'}<ChevronRight /></span></button>)}</div>
				{items.length === 0 && <div className="vw-all-clear"><CheckCircle2 /><b>You're all caught up</b><span>Velocity will collect consequential updates here.</span></div>}
			</section>
		</div>
	);
}

function OllamaSettings() {
	const settings = useAgentSettings();
	const [url, setUrl] = useState(settings.ollamaUrl);
	const [models, setModels] = useState<string[]>([]);
	const [status, setStatus] = useState<'idle' | 'checking' | 'connected' | 'offline'>('idle');
	async function testConnection() {
		setStatus('checking');
		const available = await listOllamaModels(url);
		setModels(available);
		setStatus(available.length ? 'connected' : 'offline');
		setAgentSettings({ ollamaUrl: url });
	}
	useEffect(() => { void testConnection(); /* only once for the persisted endpoint */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
	return (
		<section className="vw-settings-section">
			<div className="vw-settings-heading"><span className="vw-provider-icon"><Bot /></span><div><h3>Ollama</h3><p>Run local models through the desktop bridge.</p></div><span className={`vw-connection-state ${status}`}>{status === 'checking' ? 'Checking…' : status === 'connected' ? 'Connected' : status === 'offline' ? 'Offline' : 'Not checked'}</span></div>
			<label className="vw-settings-field"><span>Endpoint</span><div><input value={url} onChange={(event) => setUrl(event.target.value)} spellCheck={false} /><button onClick={() => void testConnection()}>Test</button></div></label>
			{status === 'connected' && (
				<label className="vw-settings-field"><span>Model</span><select value={settings.provider === 'ollama' ? settings.ollamaModel : ''} onChange={(event) => setAgentSettings({ provider: 'ollama', ollamaUrl: url, ollamaModel: event.target.value })}><option value="">Choose a model</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
			)}
			{status === 'offline' && <div className="vw-ollama-help"><AlertCircle /><p>Start Ollama locally, then retry. Tauri uses its native HTTP transport, so the desktop app needs no browser CORS configuration.</p></div>}
			<div className="vw-provider-choice"><button className={settings.provider === 'local' ? 'active' : ''} onClick={() => setAgentSettings({ provider: 'local' })}><Sparkles /><span><b>Velocity Local</b><small>Built-in demo agent</small></span>{settings.provider === 'local' && <Check />}</button><button className={settings.provider === 'ollama' ? 'active' : ''} disabled={!settings.ollamaModel} onClick={() => setAgentSettings({ provider: 'ollama' })}><Bot /><span><b>Ollama</b><small>{settings.ollamaModel || 'Choose a model first'}</small></span>{settings.provider === 'ollama' && <Check />}</button></div>
		</section>
	);
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
	const theme = useShell((state) => state.theme);
	const setTheme = useShell((state) => state.setTheme);
	return (
		<div className="vw-sheet-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="vw-sheet vw-settings-sheet">
				<header><div><span className="vw-card-kicker">Velocity</span><h2>Settings</h2></div><button className="vw-icon-btn" onClick={onClose}><X /></button></header>
				<section className="vw-settings-section"><div className="vw-settings-heading"><span className="vw-provider-icon"><Sun /></span><div><h3>Appearance</h3><p>Keep the workspace comfortable for long sessions.</p></div></div><div className="vw-theme-choice"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun />Light</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon />Dark</button></div></section>
				<OllamaSettings />
				<section className="vw-settings-section"><div className="vw-settings-heading"><span className="vw-provider-icon"><Command /></span><div><h3>Keyboard</h3><p>Velocity keeps the familiar shortcuts from the existing editor.</p></div></div><button className="vw-settings-link" onClick={() => window.dispatchEvent(new CustomEvent('velocity:open-keybindings'))}>Open keyboard shortcuts <ChevronRight /></button></section>
			</section>
		</div>
	);
}

export function VelocityWorkbench() {
	const services = useServices();
	const settings = useAgentSettings();
	const [workstreams, setWorkstreams] = useState<Workstream[]>(INITIAL_WORKSTREAMS);
	const [activeId, setActiveId] = useState<string | null>('auth-passkeys');
	const [layout, setLayout] = useState<WorkbenchLayout>('conversation');
	const [artifact, setArtifact] = useState<ToolKind>('editor');
	const [openStudios, setOpenStudios] = useState<StudioKind[]>([]);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [search, setSearch] = useState('');
	const [attentionOpen, setAttentionOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activityOpen, setActivityOpen] = useState(false);
	const [ollamaHealthy, setOllamaHealthy] = useState<boolean | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const active = workstreams.find((work) => work.id === activeId) ?? null;
	const attentionCount = workstreams.filter((work) => work.status === 'needs-input' || work.status === 'review-ready' || work.status === 'blocked').length;

	useEffect(() => {
		let cancelled = false;
		void pingOllama(settings.ollamaUrl).then((healthy) => { if (!cancelled) setOllamaHealthy(healthy); });
		return () => { cancelled = true; };
	}, [settings.ollamaUrl, settings.provider, settings.ollamaModel]);

	useEffect(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(null), 2600);
		return () => window.clearTimeout(timer);
	}, [toast]);

	// Surface any tool on the Work canvas. The 4 core surfaces are always present;
	// a studio is appended as a dismissible tab the first time it's opened. Fired
	// by ⌘K commands today and, later, by the agent when its work touches a tool.
	function openTool(tool: ToolKind) {
		setArtifact(tool);
		if (isStudio(tool)) setOpenStudios((list) => (list.includes(tool) ? list : [...list, tool]));
		setLayout('artifact');
	}
	function closeStudio(tool: StudioKind) {
		setOpenStudios((list) => list.filter((item) => item !== tool));
		setArtifact((current) => (current === tool ? 'editor' : current));
	}
	useEffect(() => {
		function onOpenTool(event: Event) {
			const tool = (event as CustomEvent<{ tool?: ToolKind }>).detail?.tool;
			if (tool && tool in SURFACES) openTool(tool);
		}
		window.addEventListener('velocity:open-tool', onOpenTool);
		return () => window.removeEventListener('velocity:open-tool', onOpenTool);
		// openTool only calls stable state setters, so binding once is correct.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Keyboard-first navigation: switch the active workstream's view, or start
	// new work, from commands (⌘K) and their keybindings.
	useEffect(() => {
		function onSetView(event: Event) {
			const view = (event as CustomEvent<{ view?: WorkbenchLayout }>).detail?.view;
			if (view === 'conversation' || view === 'artifact' || view === 'review') setLayout(view);
		}
		function onNewWork() {
			setActiveId(null);
			setLayout('conversation');
			if (window.innerWidth < 920) setSidebarOpen(false);
		}
		window.addEventListener('velocity:set-view', onSetView);
		window.addEventListener('velocity:new-work', onNewWork);
		return () => {
			window.removeEventListener('velocity:set-view', onSetView);
			window.removeEventListener('velocity:new-work', onNewWork);
		};
	}, []);

	function selectWorkstream(id: string, preferredLayout?: WorkbenchLayout) {
		setActiveId(id);
		setLayout(preferredLayout ?? 'conversation');
		setWorkstreams((items) => items.map((item) => item.id === id ? { ...item, unread: false } : item));
		setAttentionOpen(false);
		if (window.innerWidth < 920) setSidebarOpen(false);
	}

	function createWorkstream(prompt: string) {
		const id = `work-${Date.now()}`;
		const title = prompt.length > 48 ? `${prompt.slice(0, 48).trim()}…` : prompt;
		const next: Workstream = {
			id,
			title,
			objective: prompt,
			project: 'Velocity',
			repo: 'byronwade/velocity',
			status: 'draft',
			phase: 'brief',
			branch: `work/${id.slice(-6)}`,
			worktree: `velocity-${id.slice(-6)}`,
			risk: 'low',
			budget: 3,
			spent: 0,
			updated: 'now',
			lastEvent: 'Draft brief created',
			criteria: [
				{ id: `${id}-outcome`, title: 'Desired behavior is demonstrated', description: 'The requested outcome works in the target environment.', state: 'not-proven', evidence: [], files: [] },
				{ id: `${id}-existing`, title: 'Existing behavior remains intact', description: 'Related workflows continue to pass their checks.', state: 'not-proven', evidence: [], files: [] },
				{ id: `${id}-review`, title: 'Change is small and reviewable', description: 'The implementation remains inside the agreed scope.', state: 'not-proven', evidence: [], files: [] },
			],
			events: [{ id: `${id}-event`, title: 'Draft created', detail: 'Velocity captured the initial outcome and prepared a scoped conversation.', time: 'now', tone: 'neutral' }],
		};
		setWorkstreams((items) => [next, ...items]);
		setActiveId(id);
		setLayout('conversation');
		setSidebarOpen(window.innerWidth >= 920);
		void services.agent.send(`work:${id}`, prompt);
	}

	function acceptWork() {
		if (!active) return;
		setWorkstreams((items) => items.map((item) => item.id === active.id ? { ...item, status: 'done', updated: 'now', lastEvent: 'Accepted and marked done', unread: false } : item));
		setToast('Work accepted. The change capsule is ready to keep with the project.');
	}

	function sendBack() {
		if (!active) return;
		setWorkstreams((items) => items.map((item) => item.id === active.id ? { ...item, status: 'running', phase: 'implement', updated: 'now', lastEvent: 'Review feedback requested' } : item));
		setLayout('conversation');
		setToast('Review context carried back into the conversation.');
	}

	return (
		<div className={`velocity-workbench${sidebarOpen ? ' sidebar-visible' : ''}`}>
			<WorkstreamSidebar
				open={sidebarOpen}
				search={search}
				onSearch={setSearch}
				workstreams={[...workstreams].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))}
				activeId={activeId}
				onSelect={selectWorkstream}
				onNew={() => { setActiveId(null); setLayout('conversation'); if (window.innerWidth < 920) setSidebarOpen(false); }}
				onClose={() => setSidebarOpen(false)}
				onSettings={() => setSettingsOpen(true)}
				provider={providerLabel(settings)}
				ollamaHealthy={ollamaHealthy}
			/>
			{sidebarOpen && <button className="vw-sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}
			<main className="vw-main">
				<WorkstreamHeader
					active={active}
					layout={layout}
					sidebarOpen={sidebarOpen}
					onOpenSidebar={() => setSidebarOpen(true)}
					onLayout={setLayout}
					onAttention={() => setAttentionOpen(true)}
					onActivity={() => setActivityOpen(true)}
					onSettings={() => setSettingsOpen(true)}
					attentionCount={attentionCount}
				/>
				<div className="vw-body">
					{!active && <EmptyConversation onCreate={createWorkstream} />}
					{active && layout === 'conversation' && <ConversationView workstream={active} onReview={() => setLayout('review')} onArtifact={() => setLayout('artifact')} />}
					{active && layout === 'artifact' && <ArtifactView workstream={active} artifact={artifact} openStudios={openStudios} onSelect={openTool} onCloseStudio={closeStudio} />}
					{active && layout === 'review' && <ReviewView workstream={active} onAccept={acceptWork} onSendBack={sendBack} />}
				</div>
			</main>
			{attentionOpen && <AttentionSheet workstreams={workstreams} onOpen={(id) => selectWorkstream(id, workstreams.find((work) => work.id === id)?.status === 'review-ready' ? 'review' : 'conversation')} onClose={() => setAttentionOpen(false)} />}
			{settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
			{activityOpen && active && <ActivityDrawer workstream={active} onClose={() => setActivityOpen(false)} />}
			{toast && <div className="vw-toast"><CheckCircle2 />{toast}</div>}
		</div>
	);
}
