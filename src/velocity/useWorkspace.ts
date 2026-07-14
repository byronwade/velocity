import { useSyncExternalStore } from 'react';
import { manager, runtime } from './workspace';
import type { ManagerSnapshot } from './workspace';
import type { WorkspaceState } from './model';

const activeSnapshot = () => manager.getActiveState();

/** Subscribe a component to the ACTIVE project's deterministic runtime. */
export function useWorkspace(): WorkspaceState {
	return useSyncExternalStore(manager.subscribe, activeSnapshot, activeSnapshot);
}

/** Subscribe a component to the multi-project tab bar + account state. */
export function useProjects(): ManagerSnapshot {
	return useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
}

export { runtime, manager };
