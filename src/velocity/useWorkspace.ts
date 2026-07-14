import { useSyncExternalStore } from 'react';
import { runtime } from './runtime';
import type { WorkspaceState } from './model';

const subscribe = (cb: () => void) => runtime.subscribe(cb);
const snapshot = () => runtime.getState();

/** Subscribe the component tree to the deterministic prototype runtime. */
export function useWorkspace(): WorkspaceState {
	return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export { runtime };
