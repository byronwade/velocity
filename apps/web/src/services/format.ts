// Code formatting via Prettier's browser standalone build. The Prettier core and
// its language plugins are dynamically imported on first use, so they stay out of
// the main bundle and only load when a developer actually formats something.
//
// Powers the "Format Document" command (⇧⌥F) and optional format-on-save.

// Map a file path to the Prettier parser + the plugins that parser needs. Returns
// null for paths Prettier can't handle (so callers can no-op cleanly).
type PluginLoader = () => Promise<unknown>;

interface FormatSpec { parser: string; plugins: PluginLoader[] }

const ESTREE: PluginLoader = () => import('prettier/plugins/estree');

function specForPath(path: string): FormatSpec | null {
	const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
	switch (ext) {
		case 'ts':
		case 'tsx':
		case 'mts':
		case 'cts':
			return { parser: 'typescript', plugins: [() => import('prettier/plugins/typescript'), ESTREE] };
		case 'js':
		case 'jsx':
		case 'mjs':
		case 'cjs':
			return { parser: 'babel', plugins: [() => import('prettier/plugins/babel'), ESTREE] };
		case 'json':
			return { parser: 'json', plugins: [() => import('prettier/plugins/babel'), ESTREE] };
		case 'css':
		case 'scss':
		case 'less':
			return { parser: ext === 'css' ? 'css' : ext, plugins: [() => import('prettier/plugins/postcss')] };
		case 'html':
			return { parser: 'html', plugins: [() => import('prettier/plugins/html')] };
		case 'md':
		case 'markdown':
			return { parser: 'markdown', plugins: [() => import('prettier/plugins/markdown')] };
		case 'yml':
		case 'yaml':
			return { parser: 'yaml', plugins: [() => import('prettier/plugins/yaml')] };
		default:
			return null;
	}
}

/** True if this path is one Prettier can format — used to enable/disable UI. */
export function canFormat(path: string): boolean {
	return specForPath(path) !== null;
}

// House style — matches the repo (tabs, single quotes, wide print width).
const OPTIONS = { useTabs: true, singleQuote: true, printWidth: 100, semi: true } as const;

/**
 * Format `text` for `path`. Returns the formatted source, or the original text
 * unchanged if the file type isn't supported or Prettier throws on a syntax
 * error (formatting must never destroy the buffer).
 */
export async function formatSource(path: string, text: string): Promise<string> {
	const spec = specForPath(path);
	if (!spec) return text;
	try {
		const [{ default: prettier }, ...plugins] = await Promise.all([
			import('prettier/standalone'),
			...spec.plugins.map((p) => p()),
		]);
		return await prettier.format(text, { parser: spec.parser, plugins: plugins as never[], ...OPTIONS });
	} catch {
		// Unparseable (mid-edit) source — leave it untouched.
		return text;
	}
}
