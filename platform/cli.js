#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import { listFlows } from '../src/core/registry.js';
import { RunManager } from './server/runner/RunManager.js';
import { STATUS } from '../src/core/outcome.js';

dotenv.config();

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS_DIR = path.join(PROJECT_ROOT, 'runs');

const USAGE = `Run a registry flow against a data file, without the UI.

  npm run run -- --flow <flow-id> --data <file.csv> [options]

Required
  --flow <id>          Flow id from the registry (see --list)
  --data <file.csv>    Data file; one row per test case

Instance (falls back to .env: ORACLE_BASE_URL / ORACLE_USERNAME / ORACLE_PASSWORD)
  --url <url>          Application URL
  --user <name>        User name
  --password <secret>  Password

Options
  --headed             Show the browser (default: headless)
  --browser <name>     chromium | firefox | webkit        (default: chromium)
  --timeout <ms>       Action and navigation timeout      (default: 60000)
  --report <list>      Comma-separated: html,csv,xlsx     (default: html)
  --instructions <s>   Additional instructions for the AI agent
  --stop-on-failure    Stop after the first failed row
  --list               List the flows in the registry and exit
  --help               Show this help

Exit code is 0 when every row succeeded, 1 otherwise.
`;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (args.list) {
  for (const flow of listFlows()) {
    const engine = flow.broken ? 'BROKEN' : flow.engine;
    process.stdout.write(
      `${flow.id.padEnd(24)} ${String(flow.name).padEnd(26)} ${engine.padEnd(7)} ${flow.module}\n`
    );
  }
  process.exit(0);
}

const flowId = args.flow;
const dataPath = args.data;
if (!flowId || !dataPath) {
  process.stderr.write('Both --flow and --data are required.\n\n');
  process.stderr.write(USAGE);
  process.exit(2);
}
if (!fs.existsSync(dataPath)) {
  process.stderr.write(`Data file not found: ${dataPath}\n`);
  process.exit(2);
}

const instance = {
  baseUrl: args.url || process.env.ORACLE_BASE_URL || '',
  username: args.user || process.env.ORACLE_USERNAME || '',
  password: args.password || process.env.ORACLE_PASSWORD || '',
};
for (const [key, label] of [
  ['baseUrl', '--url (or ORACLE_BASE_URL)'],
  ['username', '--user (or ORACLE_USERNAME)'],
  ['password', '--password (or ORACLE_PASSWORD)'],
]) {
  if (!String(instance[key]).trim()) {
    process.stderr.write(`Missing ${label}.\n`);
    process.exit(2);
  }
}

const manager = new RunManager({
  runId: `cli-${timestamp()}-${flowId}`,
  flowId,
  dataFile: { name: path.basename(dataPath), text: fs.readFileSync(dataPath, 'utf-8') },
  instance,
  settings: {
    headless: !args.headed,
    browser: args.browser || process.env.BROWSER || 'chromium',
    defaultTimeout: Number(args.timeout) || Number(process.env.DEFAULT_TIMEOUT) || 60000,
    additionalInstructions: args.instructions || '',
    reportFormats: String(args.report || 'html')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean),
    stopOnFirstFailure: !!args['stop-on-failure'],
  },
  runsDir: RUNS_DIR,
});

// The UI streams these events over SSE; on the command line they are just lines.
manager.on('event', (event) => {
  if (event.type === 'log') {
    process.stdout.write(`[${event.level.toUpperCase().padEnd(5)}] ${event.message}\n`);
  } else if (event.type === 'row-end') {
    const outcome = event.status === STATUS.SUCCESS ? STATUS.SUCCESS : `${event.status} -- ${event.reason}`;
    process.stdout.write(`\n  ${event.label}: ${outcome}\n\n`);
  }
});

const run = await manager.execute();

process.stdout.write(`\n${run.summary.text}\n`);
for (const report of run.reports ?? []) {
  process.stdout.write(`  ${report.format.toUpperCase()}: ${path.join(manager.runDir, report.file)}\n`);
}
process.exit(run.summary.failed + run.summary.invalid === 0 ? 0 : 1);

/** Minimal `--flag value` / `--flag` parser; no dependency needed for this. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}
