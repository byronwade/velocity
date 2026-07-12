import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Velocity shell dev server. Kept minimal; the shell is a single-page app whose
// layout is a recursive split-pane tree serialized per tab.
export default defineConfig({
	plugins: [react()],
	server: { port: 5199, strictPort: true },
	build: { target: 'es2022', sourcemap: true },
});
