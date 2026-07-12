// ---------------------------------------------------------------------------
// Collaboration seam.
//
// This is the single point where a network CRDT (Yjs via y-codemirror.next)
// will plug in. A factory receives the shared document plus the pane's view id
// and returns CodeMirror extensions that keep that view converged with peers.
//
// The default factory returns nothing: local, in-window collaboration already
// works because `TextDocument` broadcasts every change to sibling views. So the
// app is genuinely collaborative across panes today, and multi-user network
// sync is a factory swap at one seam — not a rewrite of the editor.
// ---------------------------------------------------------------------------

import type { Extension } from '@codemirror/state';
import type { TextDocument } from './document';

export type CollabExtensionFactory = (doc: TextDocument, viewId: string) => Extension;

export const noCollab: CollabExtensionFactory = () => [];
