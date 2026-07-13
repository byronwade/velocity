// ---------------------------------------------------------------------------
// Design tokens — parsed from the workspace's own CSS.
//
// The Design studio reads real `--custom-property: value` declarations out of
// the project's .css files. Colour-valued tokens get a live swatch; everything
// else shows its literal value. Pure and synchronous.
// ---------------------------------------------------------------------------

export interface Token {
	name: string;
	value: string;
	file: string;
	isColor: boolean;
}

/** True if a CSS value renders as a colour (hex / rgb / hsl / oklch / gradient / mix). */
export function isColorValue(v: string): boolean {
	const s = v.trim().toLowerCase();
	return (
		/^#([0-9a-f]{3,8})$/.test(s) ||
		/^(rgb|rgba|hsl|hsla|oklch|oklab|lab|color-mix)\(/.test(s) ||
		/gradient\(/.test(s) ||
		['white', 'black', 'transparent', 'currentcolor'].includes(s)
	);
}

/** Extract every custom-property declaration from a CSS string. */
export function parseTokens(css: string, file: string): Token[] {
	const out: Token[] = [];
	const re = /(--[\w-]+)\s*:\s*([^;{}]+);/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(css))) {
		const name = m[1].trim();
		const value = m[2].trim();
		out.push({ name, value, file, isColor: isColorValue(value) });
	}
	return out;
}
