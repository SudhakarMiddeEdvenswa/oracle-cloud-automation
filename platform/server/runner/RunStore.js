import fs from 'fs';
import path from 'path';

import { RunManager } from './RunManager.js';

/**
 * Tracks live runs in memory and finished runs on disk.
 *
 * Only one run executes at a time: a run drives a real browser against a real
 * application instance, and two concurrent runs would fight over the same
 * session and the same business data.
 */
export class RunStore {
  /** @param {string} runsDir */
  constructor(runsDir) {
    this.runsDir = runsDir;
    this.live = new Map();
    this.active = null;
    fs.mkdirSync(runsDir, { recursive: true });
  }

  /** @returns {RunManager|null} the currently executing run, if any */
  get current() {
    return this.active ? this.live.get(this.active) ?? null : null;
  }

  /**
   * Start a run. Throws if one is already executing.
   * @param {object} args - see RunManager
   * @returns {RunManager}
   */
  start(args) {
    if (this.active) {
      throw new Error(
        `A run is already in progress (${this.active}). Wait for it to finish or cancel it before starting another.`
      );
    }

    const runId = makeRunId(args.flowId);
    const manager = new RunManager({ ...args, runId, runsDir: this.runsDir });
    this.live.set(runId, manager);
    this.active = runId;

    // Fire and forget: progress is delivered through the event stream, and the
    // finished record is written to disk by the manager itself.
    manager
      .execute()
      .catch(() => {
        // RunManager.execute never rejects; this guard is belt and braces.
      })
      .finally(() => {
        if (this.active === runId) this.active = null;
      });

    return manager;
  }

  /** @param {string} runId */
  get(runId) {
    return this.live.get(runId) ?? null;
  }

  /**
   * Read a finished run record from disk.
   * @param {string} runId
   * @returns {object|null}
   */
  record(runId) {
    const file = path.join(this.runsDir, safeId(runId), 'run.json');
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      return null;
    }
  }

  /** @param {string} runId */
  dir(runId) {
    return path.join(this.runsDir, safeId(runId));
  }

  /**
   * Run history, newest first.
   * @param {number} [limit=40]
   * @returns {Array<object>}
   */
  history(limit = 40) {
    if (!fs.existsSync(this.runsDir)) return [];
    return fs
      .readdirSync(this.runsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse()
      .slice(0, limit)
      .map((id) => {
        const live = this.live.get(id);
        const record = this.record(id);
        if (!record) {
          return live
            ? { runId: id, flowId: live.flowId, status: live.status, startedAt: null, summary: null, reports: [] }
            : null;
        }
        return {
          runId: record.runId,
          flowId: record.flowId,
          flowName: record.flowName,
          status: live?.status ?? (record.summary.failed + record.summary.invalid === 0 ? 'passed' : 'failed'),
          startedAt: record.startedAt,
          finishedAt: record.finishedAt,
          durationMs: record.durationMs,
          summary: record.summary,
          reports: record.reports ?? [],
        };
      })
      .filter(Boolean);
  }
}

/** Sortable, readable run id: 20260918-231045-create-supplier-4f2a. */
function makeRunId(flowId) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${stamp}-${safeId(flowId)}-${suffix}`;
}

function safeId(id) {
  return String(id ?? '').replace(/[^a-z0-9_-]/gi, '');
}
