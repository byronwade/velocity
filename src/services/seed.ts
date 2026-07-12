// ---------------------------------------------------------------------------
// Seed project for the in-memory file system. A small but real React + TS app
// so the Live Editor opens genuine, multi-language files (tsx / ts / css / json
// / md) with correct syntax highlighting — not a screenshot of code.
// ---------------------------------------------------------------------------

export const SEED_FILES: Record<string, string> = {
	'package.json': `{
  "name": "todo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  }
}
`,

	'README.md': `# Todo

A tiny React + TypeScript app, opened live in **Velocity**.

- Edits are real — the buffer is a CodeMirror document.
- Open the same file in a second pane (Split right) and type: both
  panes stay in sync. That shared document is the collaboration seam.

## Scripts

\`\`\`sh
npm run dev     # start the dev server
npm run build   # production build
\`\`\`
`,

	'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,

	'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,

	'src/App.tsx': `import { useState } from 'react';
import { TodoList } from './components/TodoList';
import { useTodos } from './lib/store';

export function App() {
  const [draft, setDraft] = useState('');
  const add = useTodos((s) => s.add);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    add(text);
    setDraft('');
  }

  return (
    <main className="app">
      <h1>Todo</h1>
      <form onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo"
        />
        <button type="submit">Add</button>
      </form>
      <TodoList />
    </main>
  );
}
`,

	'src/components/TodoList.tsx': `import { useTodos } from '../lib/store';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const todos = useTodos((s) => s.todos);
  if (todos.length === 0) {
    return <p className="empty">Nothing yet — add your first task.</p>;
  }
  return (
    <ul className="list">
      {todos.map((t) => (
        <TodoItem key={t.id} todo={t} />
      ))}
    </ul>
  );
}
`,

	'src/components/TodoItem.tsx': `import { useTodos } from '../lib/store';
import type { Todo } from '../lib/types';

export function TodoItem({ todo }: { todo: Todo }) {
  const toggle = useTodos((s) => s.toggle);
  const remove = useTodos((s) => s.remove);
  return (
    <li className={todo.done ? 'item done' : 'item'}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
        <span>{todo.text}</span>
      </label>
      <button className="x" aria-label="Delete" onClick={() => remove(todo.id)}>
        &times;
      </button>
    </li>
  );
}
`,

	'src/lib/types.ts': `export interface Todo {
  id: string;
  text: string;
  done: boolean;
}
`,

	'src/lib/store.ts': `import { create } from 'zustand';
import type { Todo } from './types';

let seq = 0;
const uid = () => \`t\${(seq++).toString(36)}\`;

interface State {
  todos: Todo[];
  add: (text: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

export const useTodos = create<State>((set) => ({
  todos: [
    { id: uid(), text: 'Try the Velocity live editor', done: true },
    { id: uid(), text: 'Split a pane and edit the same file', done: false },
  ],
  add: (text) => set((s) => ({ todos: [...s.todos, { id: uid(), text, done: false }] })),
  toggle: (id) =>
    set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
  remove: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
}));
`,

	'src/styles/app.css': `:root {
  --bg: #0b0d10;
  --fg: #e6e9ef;
  --accent: #6ea8fe;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font: 15px/1.5 system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

.app {
  max-width: 32rem;
  margin: 4rem auto;
  padding: 0 1rem;
}

.item.done span {
  opacity: 0.5;
  text-decoration: line-through;
}
`,
};
