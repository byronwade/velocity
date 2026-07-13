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
			} catch { /* fall through to seed */ }
		}
		// Otherwise render the seed app, styled by the workspace's own CSS.
		let css = '';
		for (const f of files.filter((p) => p.endsWith('.css'))) {
			try { css += (await this.fs.readFile(f)) + '\n'; } catch { /* skip */ }
		}
		return renderSeedApp(css);
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
