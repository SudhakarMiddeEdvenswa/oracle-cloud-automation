import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import dotenv from 'dotenv';

import { flowsRouter } from './routes/flows.js';
import { runsRouter } from './routes/runs.js';
import { RunStore } from './runner/RunStore.js';

dotenv.config();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..', '..');
const WEB_DIST = path.join(PROJECT_ROOT, 'platform', 'web', 'dist');
const RUNS_DIR = path.join(PROJECT_ROOT, 'runs');

const PORT = Number(process.env.PLATFORM_PORT) || 4000;
const HOST = process.env.PLATFORM_HOST || '127.0.0.1';

const app = express();
const store = new RunStore(RUNS_DIR);

// Request bodies are small JSON payloads; the data file arrives as multipart.
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    aiAvailable: !!(process.env.ANTHROPIC_API_KEY || '').trim(),
    agentModel: process.env.AGENT_MODEL || 'claude-opus-5',
    activeRun: store.active,
    defaults: {
      baseUrl: process.env.ORACLE_BASE_URL || '',
      username: process.env.ORACLE_USERNAME || '',
      // Whether a password is available from .env, never the password itself.
      hasStoredPassword: !!(process.env.ORACLE_PASSWORD || '').trim(),
      browser: process.env.BROWSER || 'chromium',
      headless: String(process.env.HEADLESS).toLowerCase() !== 'false',
    },
  });
});

app.use('/api/flows', flowsRouter());
app.use('/api/runs', runsRouter(store));

// Serve the built UI when it exists; otherwise point the user at the dev server.
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
} else {
  app.get('/', (req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        `<h1>Automation platform API is running</h1>
         <p>The UI has not been built yet. Run <code>npm run ui:build</code> and reload,
         or use <code>npm run ui:dev</code> for the development server with hot reload.</p>
         <p>API health: <a href="/api/health">/api/health</a></p>`
      );
  });
}

// Final error handler: never leak a stack trace to the browser.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[platform]', err);
  res.status(err.status || 500).json({ error: err.message || 'Unexpected server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Automation platform listening on http://${HOST}:${PORT}`);
  if (!fs.existsSync(WEB_DIST)) {
    console.log('UI bundle not found — run "npm run ui:build", or "npm run ui:dev" for hot reload.');
  }
  if (!(process.env.ANTHROPIC_API_KEY || '').trim()) {
    console.log('ANTHROPIC_API_KEY is not set: the AI agent is disabled and only coded steps can run.');
  }
});
