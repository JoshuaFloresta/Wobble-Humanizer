/**
 * Throwaway config used only to server-render App once as a smoke test:
 * it catches render-time crashes that a client build cannot see.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    ssr: 'src/__ssrcheck.jsx',
    outDir: '.ssr-check',
    rollupOptions: { output: { entryFileNames: 'ssrcheck.js' } },
  },
});
