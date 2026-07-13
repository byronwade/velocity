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
import { EditorService } from './editorService';
import { ShellService } from './shell';
import { BrowserService } from './browser';
import { AgentService, LocalAgent } from './agent';
import { GraphService } from './graph';
import { ReviewService } from './review';
import { DbService } from './db';
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
	/** The collaboration seam. Swap for a CRDT factory to enable network sync. */
	collab: CollabExtensionFactory;
}

export function createServices(): Services {
	const fs = new InMemoryFileSystem();
	const editor = new EditorService(fs);
	const shell = new ShellService(fs, editor);
	// Swap `new LocalAgent()` for a Claude API backend to make the agent a model.
	const agent = new AgentService(fs, editor, shell, new LocalAgent());
	const graph = new GraphService(fs);
	const review = new ReviewService(fs);
	const db = new DbService(fs);
	return { fs, editor, shell, browser: new BrowserService(), agent, graph, review, db, collab: noCollab };
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
