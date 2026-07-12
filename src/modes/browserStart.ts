// Start page for the Browser mode — a self-contained srcdoc document (no
// external assets, CSP-safe). The app theme is baked in so it matches the shell
// (an iframe's prefers-color-scheme doesn't follow our data-theme). Shortcut
// clicks post a message to the parent so the URL bar and history stay in sync.

import type { Theme } from '../lib/types';

const PALETTE = {
	dark: { bg: '#141518', fg: '#e8e9ec', sub: '#9a9ea6', card: '#1c1d21', cardHover: '#24262b', border: 'rgba(232,233,236,0.12)', faint: '#8b9099' },
	light: { bg: '#ffffff', fg: '#1a1c20', sub: '#666b74', card: '#fafbfc', cardHover: '#f0f1f3', border: 'rgba(26,28,32,0.12)', faint: '#9096a0' },
};

export function startPage(theme: Theme): string {
	const c = PALETTE[theme];
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: ${theme}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; height: 100vh; display: grid; place-items: center;
    font: 15px/1.5 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: ${c.bg}; color: ${c.fg};
  }
  .wrap { text-align: center; max-width: 34rem; padding: 24px; }
  .mark { width: 46px; height: 46px; border-radius: 12px; margin: 0 auto 18px;
    background: linear-gradient(135deg, #6a5bff, #d94fb0); }
  h1 { font-size: 22px; letter-spacing: -0.02em; margin: 0 0 6px; }
  p { color: ${c.sub}; margin: 0 auto 22px; max-width: 30rem; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  button {
    font: inherit; cursor: pointer; padding: 14px 10px; border-radius: 10px;
    border: 1px solid ${c.border}; background: ${c.card}; color: inherit;
    display: flex; flex-direction: column; align-items: center; gap: 7px; transition: background .15s;
  }
  button:hover { background: ${c.cardHover}; }
  .dot { width: 22px; height: 22px; border-radius: 6px; }
  small { color: ${c.faint}; display: block; margin-top: 20px; font-size: 12px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="mark"></div>
    <h1>Velocity Browser</h1>
    <p>A real embedded browser. Type an address above, or start here.</p>
    <div class="grid">
      <button onclick="go('https://example.com')"><span class="dot" style="background:#4a90d9"></span>example.com</button>
      <button onclick="go('https://en.wikipedia.org')"><span class="dot" style="background:#3fae6a"></span>Wikipedia</button>
      <button onclick="go('https://developer.mozilla.org')"><span class="dot" style="background:#e8863c"></span>MDN</button>
    </div>
    <small>Some sites (Google, GitHub, X) send headers that forbid being embedded in a frame.</small>
  </div>
  <script>
    function go(url){ parent.postMessage({ type: 'velocity-nav', url: url }, '*'); }
  </script>
</body>
</html>`;
}
