// `when` clause evaluation — a small implementation of VS Code's context-key
// expression language, enough for real keybindings: identifiers (truthy context
// keys), `!`, `&&`, `||`, `==`, `!=`, `=~` (regex), parentheses, and literals.
//
// evaluateWhen('editorTextFocus && !inputFocus', get) → boolean.

type Get = (key: string) => unknown;

interface Token { t: 'id' | 'op' | 'lparen' | 'rparen' | 'str' | 'regex'; v: string }

function tokenize(src: string): Token[] {
	const out: Token[] = [];
	let i = 0;
	while (i < src.length) {
		const ch = src[i];
		if (/\s/.test(ch)) { i++; continue; }
		if (ch === '(') { out.push({ t: 'lparen', v: ch }); i++; continue; }
		if (ch === ')') { out.push({ t: 'rparen', v: ch }); i++; continue; }
		if (ch === '&' && src[i + 1] === '&') { out.push({ t: 'op', v: '&&' }); i += 2; continue; }
		if (ch === '|' && src[i + 1] === '|') { out.push({ t: 'op', v: '||' }); i += 2; continue; }
		if (ch === '=' && src[i + 1] === '=') { out.push({ t: 'op', v: '==' }); i += 2; continue; }
		if (ch === '!' && src[i + 1] === '=') { out.push({ t: 'op', v: '!=' }); i += 2; continue; }
		if (ch === '=' && src[i + 1] === '~') { out.push({ t: 'op', v: '=~' }); i += 2; continue; }
		if (ch === '!') { out.push({ t: 'op', v: '!' }); i++; continue; }
		if (ch === "'") {
			let j = i + 1;
			while (j < src.length && src[j] !== "'") j++;
			out.push({ t: 'str', v: src.slice(i + 1, j) });
			i = j + 1;
			continue;
		}
		if (ch === '/') {
			let j = i + 1;
			while (j < src.length && src[j] !== '/') j++;
			out.push({ t: 'regex', v: src.slice(i + 1, j) });
			i = j + 1;
			continue;
		}
		// bareword: identifier or literal value
		let j = i;
		while (j < src.length && /[A-Za-z0-9_.:\-]/.test(src[j])) j++;
		out.push({ t: 'id', v: src.slice(i, j) });
		i = Math.max(j, i + 1);
	}
	return out;
}

// Recursive-descent parser → evaluator. Precedence: || < && < unary/comparison.
function makeParser(tokens: Token[], get: Get) {
	let pos = 0;
	const peek = () => tokens[pos];
	const next = () => tokens[pos++];

	function primary(): boolean {
		const tk = peek();
		if (!tk) return false;
		if (tk.t === 'lparen') { next(); const v = orExpr(); if (peek()?.t === 'rparen') next(); return v; }
		if (tk.t === 'op' && tk.v === '!') { next(); return !primary(); }
		if (tk.t === 'id') {
			next();
			// comparison?
			const op = peek();
			if (op && op.t === 'op' && (op.v === '==' || op.v === '!=' || op.v === '=~')) {
				next();
				const rhs = next();
				const lval = get(tk.v);
				if (op.v === '=~') {
					try { return new RegExp(rhs?.v ?? '').test(String(lval ?? '')); } catch { return false; }
				}
				const rval = rhs?.t === 'id' ? literal(rhs.v) : rhs?.v;
				const eq = String(lval) === String(rval);
				return op.v === '==' ? eq : !eq;
			}
			return truthy(get(tk.v));
		}
		// bare string/regex → truthy by presence
		next();
		return Boolean(tk.v);
	}

	function andExpr(): boolean {
		let v = primary();
		while (peek()?.t === 'op' && peek()!.v === '&&') { next(); const r = primary(); v = v && r; }
		return v;
	}
	function orExpr(): boolean {
		let v = andExpr();
		while (peek()?.t === 'op' && peek()!.v === '||') { next(); const r = andExpr(); v = v || r; }
		return v;
	}
	return orExpr;
}

function literal(v: string): unknown {
	if (v === 'true') return true;
	if (v === 'false') return false;
	if (/^-?\d+$/.test(v)) return Number(v);
	return v;
}

function truthy(v: unknown): boolean {
	return v !== undefined && v !== null && v !== false && v !== '' && v !== 0;
}

export function evaluateWhen(expr: string | undefined, get: Get): boolean {
	if (!expr || !expr.trim()) return true;
	try {
		return makeParser(tokenize(expr), get)();
	} catch {
		return false;
	}
}
