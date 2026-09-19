import fs from 'fs';
import path from 'path';

import express from 'express';
import multer from 'multer';

import { loadFlow } from '../../../src/core/registry.js';
import { parseCsv } from '../../../src/core/csv.js';
import { resolveRow } from '../../../src/core/rowData.js';
import { REPORT_FORMATS } from '../reporting/index.js';
import { resolveTestDataFile } from './testdata.js';

// Data files are small; keeping them in memory avoids leaving CSVs with
// business data lying around in a temp folder.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

/**
 * Run lifecycle: preview a data file, start a run, follow it, download reports.
 * @param {import('../runner/RunStore.js').RunStore} store
 * @returns {import('express').Router}
 */
export function runsRouter(store) {
  const router = express.Router();

  // Dry run over the uploaded data file: resolves every row and reports which
  // ones would be rejected, without opening a browser.
  router.post('/preview', upload.single('dataFile'), (req, res, next) => {
    try {
      const flow = loadFlow(req.body.flowId);
      const text = readDataFile(req);
      const { rows: raw, errors } = parseCsv(text);
      const resolved = raw.map((rawRow, i) => resolveRow(flow, rawRow, i + 1));

      res.json({
        flowId: flow.id,
        rowCount: resolved.length,
        parseErrors: errors,
        unknownColumns: [...new Set(resolved.flatMap((r) => r.unknown))],
        rows: resolved.map((r) => ({
          rowNumber: r.rowNumber,
          label: r.label,
          missing: r.missing,
          valid: r.missing.length === 0,
          data: r.data,
        })),
      });
    } catch (err) {
      err.status = err.status || 400;
      next(err);
    }
  });

  // Start a run.
  router.post('/', upload.single('dataFile'), (req, res, next) => {
    try {
      const flow = loadFlow(req.body.flowId);
      const text = readDataFile(req);

      const baseUrl = requireField(req.body.baseUrl, 'Application URL');
      const username = requireField(req.body.username, 'User name');
      const password = requireField(req.body.password, 'Password');

      const manager = store.start({
        flowId: flow.id,
        dataFile: {
          name: req.file?.originalname || req.body.dataFileName || 'data.csv',
          text,
        },
        instance: { baseUrl: baseUrl.trim(), username: username.trim(), password },
        settings: {
          headless: parseBool(req.body.headless, true),
          browser: (req.body.browser || 'chromium').toLowerCase(),
          defaultTimeout: Number(req.body.defaultTimeout) || 60000,
          slowMo: Number(req.body.slowMo) || 0,
          additionalInstructions: req.body.additionalInstructions || '',
          reportFormats: parseFormats(req.body.reportFormats),
          stopOnFirstFailure: parseBool(req.body.stopOnFirstFailure, false),
        },
      });

      res.status(202).json({ runId: manager.runId, status: manager.status });
    } catch (err) {
      err.status = err.status || 400;
      next(err);
    }
  });

  // Live event stream for one run. Replays everything emitted so far, so the UI
  // can attach late (or reattach after a refresh) without losing lines.
  router.get('/:runId/events', (req, res) => {
    const manager = store.get(req.params.runId);
    if (!manager) {
      res.status(404).json({ error: `Unknown or expired run "${req.params.runId}"` });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    for (const event of manager.events) send(event);

    const onEvent = (event) => send(event);
    manager.on('event', onEvent);

    // Comment frames keep proxies from closing an idle stream during a long step.
    const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      manager.off('event', onEvent);
    });
  });

  router.post('/:runId/cancel', (req, res) => {
    const manager = store.get(req.params.runId);
    if (!manager) {
      res.status(404).json({ error: 'Unknown run' });
      return;
    }
    manager.cancel();
    res.json({ runId: manager.runId, status: 'cancelling' });
  });

  router.get('/', (req, res) => {
    res.json({ runs: store.history(Number(req.query.limit) || 40), activeRun: store.active });
  });

  router.get('/:runId', (req, res) => {
    const record = store.record(req.params.runId);
    const manager = store.get(req.params.runId);
    if (!record && !manager) {
      res.status(404).json({ error: 'Unknown run' });
      return;
    }
    res.json({ status: manager?.status ?? 'finished', run: record, events: record ? [] : manager?.events ?? [] });
  });

  // Download a generated report.
  router.get('/:runId/report/:format', (req, res, next) => {
    const format = String(req.params.format).toLowerCase();
    if (!REPORT_FORMATS.includes(format)) {
      res.status(400).json({ error: `Unsupported report format "${format}"` });
      return;
    }
    const file = path.join(store.dir(req.params.runId), `report.${format}`);
    if (!fs.existsSync(file)) {
      res.status(404).json({ error: `No ${format.toUpperCase()} report was generated for this run` });
      return;
    }
    res.download(file, `${req.params.runId}-report.${format}`, (err) => {
      if (err && !res.headersSent) next(err);
    });
  });

  // Serve a run's screenshots so the HTML report's links resolve in the browser.
  router.get('/:runId/artifacts/*splat', (req, res) => {
    const relative = Array.isArray(req.params.splat) ? req.params.splat.join('/') : String(req.params.splat ?? '');
    const runDir = store.dir(req.params.runId);
    const file = path.resolve(runDir, relative);
    // Never serve outside the run folder, whatever the request path contains.
    if (!file.startsWith(path.resolve(runDir) + path.sep) || !fs.existsSync(file)) {
      res.status(404).end();
      return;
    }
    res.sendFile(file);
  });

  return router;
}

/**
 * Read the data file for a run. Precedence: an uploaded CSV, then a file
 * selected from the project's testdata folder, then inline text, then the
 * flow's template.
 */
function readDataFile(req) {
  if (req.file?.buffer?.length) return req.file.buffer.toString('utf-8');
  if (req.body.dataFileName && String(req.body.dataFileName).trim()) {
    return fs.readFileSync(resolveTestDataFile(req.body.dataFileName), 'utf-8');
  }
  if (req.body.dataText && String(req.body.dataText).trim()) return String(req.body.dataText);
  if (parseBool(req.body.useTemplate, false)) {
    const flow = loadFlow(req.body.flowId);
    if (flow.templatePath) return fs.readFileSync(flow.templatePath, 'utf-8');
  }
  const err = new Error('A data file is required: upload a CSV or select one from the testdata folder');
  err.status = 400;
  throw err;
}

function requireField(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    const err = new Error(`${label} is required`);
    err.status = 400;
    throw err;
  }
  return String(value);
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function parseFormats(raw) {
  const list = Array.isArray(raw)
    ? raw
    : String(raw ?? '')
        .split(',')
        .map((f) => f.trim());
  const valid = list.map((f) => f.toLowerCase()).filter((f) => REPORT_FORMATS.includes(f));
  return valid.length ? [...new Set(valid)] : ['html'];
}
