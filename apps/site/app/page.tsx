const REPO = "https://github.com/byronwade/velocity";
const RELEASES = `${REPO}/releases`;

const FEATURES = [
  {
    title: "Truly native",
    body: "No browser, no DOM, no web runtime in the binary. The Native SDK engine draws every pixel into a real OS window.",
  },
  {
    title: "Tiny & fast",
    body: "A single ~4 MB binary that starts instantly. The UI is declarative markup; the logic compiles ahead-of-time to native code.",
  },
  {
    title: "AI-native",
    body: "An agent pane sits beside your editor — built into the workbench, not bolted on in a webview.",
  },
  {
    title: "Cross-platform",
    body: "macOS, Windows, and Linux from one codebase, built and packaged on every release by CI.",
  },
  {
    title: "Editor you know",
    body: "File explorer, tabs, a real text buffer, and a Cursor-style settings screen — the workbench, done natively.",
  },
  {
    title: "Open source",
    body: "The whole thing is on GitHub: the native app, the original web app, and the migration in the open.",
  },
];

const PLATFORMS = ["macOS", "Windows", "Linux"];

export default function Home() {
  return (
    <main>
      <div className="wrap">
        <nav className="nav">
          <div className="brand">Velocity</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <a href={REPO}>GitHub</a>
          </div>
        </nav>

        <section className="hero">
          <span className="eyebrow">Native · single binary · AI-first</span>
          <h1>The AI code editor that ships as a native binary.</h1>
          <p className="sub">
            Velocity is a fast, tiny, native desktop code editor built on the Native SDK — no
            browser, no Electron. Just your editor, an agent, and a window the OS drew itself.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#download">
              Download
            </a>
            <a className="btn btn-ghost" href={REPO}>
              View source
            </a>
          </div>
        </section>

        <section id="features" className="features">
          {FEATURES.map((f) => (
            <div className="card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </section>

        <section id="download" className="download">
          <h2>Download Velocity</h2>
          <p className="sub">
            Native builds for every desktop, produced by CI on each release. Grab the latest
            from GitHub Releases.
          </p>
          <div className="platforms">
            {PLATFORMS.map((p) => (
              <a className="btn btn-ghost" href={RELEASES} key={p}>
                {p}
              </a>
            ))}
          </div>
        </section>

        <footer className="footer">
          <span>© {new Date().getFullYear()} Velocity</span>
          <a href={REPO}>github.com/byronwade/velocity</a>
        </footer>
      </div>
    </main>
  );
}
