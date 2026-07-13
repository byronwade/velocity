// ---------------------------------------------------------------------------
// PreviewService — a REAL, running preview of the workspace app.
//
// This is what makes the Browser actually work and the Design canvas smart:
// both render the same self-contained, interactive HTML built from the real
// workspace files. A Builder-generated app (builds/<slug>/index.html) is used
// verbatim; otherwise the seed app is rendered live and styled by the project's
// own CSS custom properties — so editing a design token restyles the preview.
// Rebuilds whenever the file system changes.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { IFileSystem } from './filesystem';

/** An interactive todo app, styled by the workspace's own tokens/CSS (inlined).
 *  References --bg/--fg/--accent so token edits in the Design studio show up. */
function renderSeedApp(workspaceCss: string): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Todo — live preview</title>
<style>
:root { --bg:#ffffff; --fg:#18181b; --accent:#5b5bd6; --muted:#71717a; --line:#ececf0; }
* { box-sizing: border-box; }
body { margin:0; font:15px/1.6 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--fg); }
.app { max-width:34rem; margin:48px auto; padding:0 20px; }
h1 { font-size:30px; letter-spacing:-.02em; margin:0 0 4px; }
.sub { color:var(--muted); margin:0 0 20px; font-size:14px; }
form { display:flex; gap:8px; margin:0 0 18px; }
input[type=text] { flex:1; padding:11px 13px; border:1px solid var(--line); border-radius:10px; font:inherit; background:transparent; color:var(--fg); }
input[type=text]:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent); }
button.add { padding:11px 16px; border:0; border-radius:10px; background:var(--accent); color:#fff; font-weight:600; cursor:pointer; }
button.add:hover { filter:brightness(1.06); }
ul { list-style:none; padding:0; margin:0; }
li { display:flex; align-items:center; gap:11px; padding:12px 4px; border-bottom:1px solid var(--line); }
li.done .t { opacity:.5; text-decoration:line-through; }
li .cb { width:20px; height:20px; border-radius:6px; border:1.5px solid var(--muted); display:grid; place-items:center; cursor:pointer; flex:none; color:transparent; }
li.done .cb { background:var(--accent); border-color:var(--accent); color:#fff; }
li .t { flex:1; }
li .x { margin-left:auto; border:0; background:none; color:var(--muted); cursor:pointer; font-size:18px; line-height:1; }
.count { margin-top:16px; color:var(--muted); font-size:13px; }
</style>
<style>/* workspace tokens + rules (edits here restyle the preview live) */
${workspaceCss}</style>
</head>
<body>
<div class="app">
  <h1>Tasks</h1>
  <p class="sub">A live preview of the workspace app — add, complete, and remove items.</p>
  <form id="f"><input id="i" type="text" placeholder="What needs doing?" autocomplete="off" aria-label="New task" /><button class="add" type="submit">Add</button></form>
  <ul id="l"></ul>
  <div class="count" id="c"></div>
</div>
<script>
var todos=[{t:'Try the Velocity live preview',d:true},{t:'Edit a design token and watch this restyle',d:false},{t:'Add your own task below',d:false}];
var l=document.getElementById('l'),f=document.getElementById('f'),i=document.getElementById('i'),c=document.getElementById('c');
function render(){
  l.innerHTML='';
  todos.forEach(function(td,ix){
    var li=document.createElement('li'); if(td.d)li.className='done';
    var cb=document.createElement('button'); cb.className='cb'; cb.innerHTML='\\u2713'; cb.onclick=function(){td.d=!td.d;render()};
    var t=document.createElement('span'); t.className='t'; t.textContent=td.t;
    var x=document.createElement('button'); x.className='x'; x.textContent='\\u00d7'; x.onclick=function(){todos.splice(ix,1);render()};
    li.appendChild(cb); li.appendChild(t); li.appendChild(x); l.appendChild(li);
  });
  var left=todos.filter(function(t){return !t.d}).length;
  c.textContent=left+' of '+todos.length+' remaining';
}
f.onsubmit=function(e){e.preventDefault();var v=i.value.trim();if(v){todos.push({t:v,d:false});i.value='';render();}};
render();
</script>
</body>
</html>`;
}

/** Build a self-contained HTML doc that links + runs the transpiled modules.
 *  React/ReactDOM are vendored from the app's own origin (no CDN); zustand is a
 *  tiny inline shim. Classic JSX compiles to `React.createElement`, resolved
 *  from the global React UMD — so workspace files need no React import. */
function runtimeHtml(entry: string, registry: Record<string, string>, css: string): string {
	const json = (v: unknown) => JSON.stringify(v).replace(/<\/(script)/gi, '<\\/$1');
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html,body{margin:0}${css}</style></head>
<body><div id="root"></div>
<script src="/vendor/react.js"></script>
<script src="/vendor/react-dom.js"></script>
<script>
(function () {
  var REG = ${json(registry)};
  var entry = ${json(entry)};
  function createStore(createState) {
    var state, listeners = new Set();
    var setState = function (partial, replace) {
      var n = typeof partial === 'function' ? partial(state) : partial;
      state = replace ? n : Object.assign({}, state, n);
      listeners.forEach(function (l) { l(); });
    };
    var getState = function () { return state; };
    var subscribe = function (l) { listeners.add(l); return function () { listeners.delete(l); }; };
    var api = { setState: setState, getState: getState, getInitialState: getState, subscribe: subscribe };
    state = createState(setState, getState, api);
    var useBoundStore = function (selector) {
      var sel = selector || getState;
      return React.useSyncExternalStore(subscribe, function () { return sel(state); }, function () { return sel(state); });
    };
    Object.assign(useBoundStore, api);
    return useBoundStore;
  }
  var zustand = { create: function (cs) { return cs ? createStore(cs) : createStore; }, createStore: createStore };
  var externals = { 'react': window.React, 'react-dom': window.ReactDOM, 'react-dom/client': window.ReactDOM, 'zustand': zustand };
  var cache = {};
  function resolve(from, spec) {
    if (spec.charAt(0) !== '.') return spec;
    var base = from.split('/').slice(0, -1);
    spec.split('/').forEach(function (p) { if (p === '.' || p === '') return; else if (p === '..') base.pop(); else base.push(p); });
    var path = base.join('/');
    var cands = [path, path + '.tsx', path + '.ts', path + '.jsx', path + '.js', path + '/index.tsx', path + '/index.ts', path + '/index.jsx', path + '/index.js'];
    for (var i = 0; i < cands.length; i++) if (cands[i] in REG) return cands[i];
    return path;
  }
  function run(path) {
    if (cache[path]) return cache[path].exports;
    var code = REG[path];
    var module = { exports: {} };
    cache[path] = module;
    if (code == null) return module.exports;
    var require = function (spec) {
      var r = resolve(path, spec);
      if (externals[r]) return externals[r];
      if (r in REG) return run(r);
      return {};
    };
    try {
      new Function('require', 'module', 'exports', 'React', code)(require, module, module.exports, window.React);
    } catch (e) {
      document.body.innerHTML = '<pre style="padding:16px;font:13px ui-monospace,monospace;color:#c0392b">Runtime error in ' + path + '\\n' + (e && e.stack || e) + '</pre>';
      throw e;
    }
    return module.exports;
  }
  try { run(entry); } catch (e) { /* already surfaced */ }
})();
</script>
</body></html>`;
}

export class PreviewService {
	private html = '';
	private rev = 0;
	private dirty = true;
	private building = false;
	private listeners = new Set<() => void>();

	constructor(private fs: IFileSystem) {
		this.fs.onChange(() => { this.dirty = true; void this.rebuild(); });
		void this.rebuild();
	}

	/** The current runnable HTML (empty until the first build resolves). */
	get(): string {
		return this.html;
	}

	async rebuild(): Promise<void> {
		if (this.building) return;
		this.building = true;
		try {
			while (this.dirty) {
				this.dirty = false;
				this.html = await this.build();
				this.bump();
			}
		} finally {
			this.building = false;
		}
	}

	private async build(): Promise<string> {
		const files = await this.fs.list();
		// A Builder-generated app wins — it's already a self-contained running page.
		const built = files.filter((f) => /^builds\/.+\/index\.html$/.test(f)).sort();
		if (built.length) {
			try {
				return await this.fs.readFile(built[built.length - 1]);
			} catch { /* fall through */ }
		}

		const css = await this.collectCss(files);

		// Try to compile and RUN the real workspace React/TSX. sucrase transpiles
		// each module to CJS; a tiny in-iframe module system links them and pulls
		// React/etc. from a pinned ESM CDN via an import — the actual app runs.
		const CODE = ['.tsx', '.ts', '.jsx', '.js'];
		const entry = ['src/main.tsx', 'src/main.ts', 'src/index.tsx', 'src/main.jsx', 'src/App.tsx'].find((e) => files.includes(e));
		const codeFiles = files.filter((f) => CODE.some((e) => f.endsWith(e)));
		if (entry && codeFiles.length) {
			try {
				const { transform } = await import('sucrase');
				const registry: Record<string, string> = {};
				for (const f of codeFiles) {
					try {
						const src = await this.fs.readFile(f);
						registry[f] = transform(src, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'classic', filePath: f, production: true }).code;
					} catch { /* skip a file that fails to compile */ }
				}
				if (registry[entry]) {
					return runtimeHtml(entry, registry, css);
				}
			} catch { /* sucrase unavailable — fall through to the static render */ }
		}

		// Fallback: render the seed app statically, styled by the workspace CSS.
		return renderSeedApp(css);
	}

	private async collectCss(files: string[]): Promise<string> {
		let css = '';
		for (const f of files.filter((p) => p.endsWith('.css'))) {
			try { css += (await this.fs.readFile(f)) + '\n'; } catch { /* skip */ }
		}
		return css;
	}

	readonly subscribe = (l: () => void): (() => void) => {
		this.listeners.add(l);
		return () => this.listeners.delete(l);
	};
	readonly getSnapshot = (): number => this.rev;

	private bump(): void {
		this.rev++;
		for (const l of this.listeners) l();
	}
}

// --- React binding --------------------------------------------------------

import { useServices } from './container';

export function usePreview(): string {
	const { preview } = useServices();
	useSyncExternalStore(preview.subscribe, preview.getSnapshot);
	return preview.get();
}
