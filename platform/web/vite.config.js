import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The project is ESM, so __dirname is not defined here.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_TARGET = process.env.PLATFORM_API || 'http://127.0.0.1:4000';

/**
 * Vite config for the platform UI.
 *
 * `npm run ui:dev` serves this with hot reload and proxies /api to the Express
 * server; `npm run ui:build` emits ./dist, which the Express server serves
 * itself so the whole platform runs on one port.
 */
export default defineConfig({
  root: HERE,
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 4100,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
