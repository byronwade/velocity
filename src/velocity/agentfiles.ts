// ---------------------------------------------------------------------------
// Agents as files — every coworker is a versionable definition file.
//
// `.velocity/coworkers/<id>.md` holds the coworker's identity (name, role,
// model, autonomy, scope, budget) as simple `key: value` frontmatter. The
// workspace writes these for its live coworkers, and editing one in the IDE
// applies live — the same pattern Cursor rules / Claude Code subagents /
// Continue.dev agents use, so coworkers can be committed, diffed, and shared.
// ---------------------------------------------------------------------------

import type { Coworker } from './model';
import { AUTONOMY_LABEL } from './model';
import type { Autonomy } from './model';

export const AGENT_DIR = '.velocity/coworkers';

export const agentPath = (id: string): string => `${AGENT_DIR}/${id}.md`;

/** The fields a definition file owns. Everything else (state, progress,
 *  checkpoints) is runtime, not identity, and never round-trips. */
export interface AgentFilePatch {
	name?: string;
	role?: string;
	department?: string;
	model?: string;
	autonomy?: Autonomy;
	scope?: string;
}

export function coworkerToFile(c: Coworker): string {
	return [
		'---',
		`name: ${c.name}`,
		`role: ${c.role}`,
		`department: ${c.department}`,
		`model: ${c.model}`,
		`autonomy: ${c.autonomy}`,
		`scope: ${c.scope}`,
		`budget: ${c.budget.unit}${c.budget.total}`,
		'---',
		'',
		`${c.name} works ${c.role.toLowerCase().startsWith('design') ? 'on design' : `as ${c.role}`} for this project.`,
		'Edit the fields above and save — the workspace applies them live.',
		'',
	].join('\n');
}

/** Parse the frontmatter back into a patch. Unknown keys and an invalid
 *  autonomy are ignored rather than errored — a definition file should never
 *  be able to wedge the workspace. */
export function parseAgentFile(text: string): AgentFilePatch {
	const patch: AgentFilePatch = {};
	const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	if (!m) return patch;
	for (const line of m[1].split(/\r?\n/)) {
		const i = line.indexOf(':');
		if (i === -1) continue;
		const key = line.slice(0, i).trim();
		const value = line.slice(i + 1).trim();
		if (!value) continue;
		if (key === 'name') patch.name = value;
		else if (key === 'role') patch.role = value;
		else if (key === 'department') patch.department = value;
		else if (key === 'model') patch.model = value;
		else if (key === 'scope') patch.scope = value;
		else if (key === 'autonomy' && value in AUTONOMY_LABEL) patch.autonomy = value as Autonomy;
	}
	return patch;
}

/** The slice of a coworker a file governs — used to detect real changes so
 *  the heartbeat's constant state churn never triggers file writes. */
export function identitySignature(c: Coworker): string {
	return [c.id, c.name, c.role, c.department, c.model, c.autonomy, c.scope, `${c.budget.unit}${c.budget.total}`].join('|');
}
