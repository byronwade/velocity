// ---------------------------------------------------------------------------
// Service container — the dependency-injection seam.
//
// Services are created once and shared. A React context makes them available to
// components (and lets a test or an embedded preview inject an alternate set),
// while a module singleton lets non-React callers — keyboard handlers, the store
// — reach the SAME instances. In-memory today; a real backend is a swap here.
// ---------------------------------------------------------------------------

import { createContext, useContext, type ReactNode } from 'react';
import { InMemoryFileSystem, type IFileSystem } from './filesystem';
import { SwitchableFileSystem, ProjectService } from './projectFs';
import { localStorageStore } from './persistence';
import { SEED_FILES } from './seed';
import { EditorService } from './editorService';
import { ShellService } from './shell';
import { BrowserService } from './browser';
import { AgentService, LocalAgent } from './agent';
import { resolveBackend } from './agentSettings';
import { GraphService } from './graph';
import { ReviewService } from './review';
import { DbService } from './db';
import { ApiService } from './api';
import { PreviewService } from './preview';
import { ObservabilityService } from './observability';
import { DesignService } from './design';
import { DeployService } from './deploy';
import { MissionService } from './mission';
import { noCollab, type CollabExtensionFactory } from './collab';

export interface Services {
	fs: IFileSystem;
	editor: EditorService;
	shell: ShellService;
	browser: BrowserService;
	agent: AgentService;
	/** The shared project graph — the spine every other view reads from. */
	graph: GraphService;
	/** The working-tree diff (vs the project baseline) — the review studio. */
	review: ReviewService;
	/** The relational store (schema from .sql files) — the database studio. */
	db: DbService;
	/** In-process request router over real workspace state — the API studio. */
	api: ApiService;
	/** Runnable HTML preview of the workspace app — the browser + design canvas. */
	preview: PreviewService;
	/** Real runtime telemetry (errors, rejections, console) — the observe studio. */
	observability: ObservabilityService;
	/** Design tokens parsed from the workspace CSS — the design studio. */
	design: DesignService;
	/** Build artifacts + per-environment deploy state — the ship studio. */
	deploy: DeployService;
	/** The swarm orchestrator — objective → task graph → real operations. */
	mission: MissionService;
	/** Open real folders from disk (desktop) as the active workspace. */
	projects: ProjectService;
	/** The collaboration seam. Swap for a CRDT factory to enable network sync. */
	collab: CollabExtensionFactory;
}

export function createServices(): Services {
	// Durable workspace: edits and created files survive a reload. Falls back to
	// pure in-memory when localStorage is unavailable (tests, private mode).
	// The switchable wrapper lets the backend swap to a real folder on desktop
	// while every service keeps its stable `fs` reference.
	const memoryFs = new InMemoryFileSystem(SEED_FILES, localStorageStore());
	const fs = new SwitchableFileSystem(memoryFs);
	const editor = new EditorService(fs);
	const shell = new ShellService(fs, editor);
	// Local rule-based backend by default; resolveBackend swaps in an Ollama
	// (or other) model backend at send time based on the user's agent settings.
	const localAgent = new LocalAgent();
	const agent = new AgentService(fs, editor, shell, localAgent, () => resolveBackend(localAgent));
	const graph = new GraphService(fs);
	const review = new ReviewService(fs);
	const db = new DbService(fs);
	const api = new ApiService(fs, db);
	const preview = new PreviewService(fs);
	const observability = new ObservabilityService();
	observability.install();
	const design = new DesignService(fs);
	const deploy = new DeployService(fs);
	// The orchestrator drives the other services via a lazy getter (no self-ref).
	let services: Services;
	const mission = new MissionService(() => services);
	const projects = new ProjectService(fs, memoryFs);
	services = { fs, editor, shell, browser: new BrowserService(), agent, graph, review, db, api, preview, observability, design, deploy, mission, projects, collab: noCollab };
	return services;
}

let singleton: Services | null = null;

/** The shared service instances, for callers outside the React tree. */
export function getServices(): Services {
	if (!singleton) {
		singleton = createServices();
	}
	return singleton;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children, value }: { children: ReactNode; value?: Services }) {
	return <ServicesContext.Provider value={value ?? getServices()}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
	return useContext(ServicesContext) ?? getServices();
}
