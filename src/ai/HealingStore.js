import fs from 'fs';
import path from 'path';

import { REPLAYABLE, createToolExecutor } from './browserTools.js';
import { interpolate } from '../core/stepsFile.js';

/**
 * Persistence for what the AI agent learned.
 *
 * When the agent completes a step that had no working deterministic
 * implementation, the action sequence it used is written next to the flow in
 * the registry. On later runs that sequence is replayed directly — no model
 * call, no cost, no latency — and the agent is only woken again if the replay
 * itself breaks. That is how an AI-driven flow settles into a fast, repeatable
 * one without anyone hand-writing selectors.
 *
 * Recorded values are templated back to `{{field}}` placeholders wherever they
 * came from the row's test data, so a sequence learned on row 1 still works on
 * row 50 with completely different data.
 */
export class HealingStore {
  /** @param {string} flowDir - the flow's registry folder */
  constructor(flowDir) {
    this.file = path.join(flowDir, 'healed-steps.json');
    this.data = this.#read();
  }

  /**
   * The learned sequence for a step, if it is still trusted.
   * @param {string} stepId
   * @returns {null | {actions: Array<object>, recordedAt: string, successes: number, failures: number}}
   */
  get(stepId) {
    const entry = this.data[stepId];
    if (!entry || !Array.isArray(entry.actions) || !entry.actions.length) return null;
    // Three consecutive replay failures means the UI moved for good; stop
    // replaying and let the agent relearn the step.
    if ((entry.failures ?? 0) >= 3) return null;
    return entry;
  }

  /**
   * Record a successful agent action sequence.
   * @param {string} stepId
   * @param {Array<{tool:string, input:object}>} actions
   * @param {Record<string, unknown>} values - row data used to templatize literals
   */
  record(stepId, actions, values) {
    const replayable = (actions || []).filter((a) => REPLAYABLE.has(a.tool));
    if (!replayable.length) return;
    this.data[stepId] = {
      recordedAt: new Date().toISOString(),
      actions: replayable.map((a) => ({ tool: a.tool, input: templatize(a.input, values) })),
      successes: 0,
      failures: 0,
    };
    this.#write();
  }

  /** @param {string} stepId */
  markSuccess(stepId) {
    const entry = this.data[stepId];
    if (!entry) return;
    entry.successes = (entry.successes ?? 0) + 1;
    entry.failures = 0;
    this.#write();
  }

  /** @param {string} stepId */
  markFailure(stepId) {
    const entry = this.data[stepId];
    if (!entry) return;
    entry.failures = (entry.failures ?? 0) + 1;
    this.#write();
  }

  #read() {
    if (!fs.existsSync(this.file)) return {};
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf-8'));
    } catch {
      return {};
    }
  }

  #write() {
    fs.writeFileSync(this.file, `${JSON.stringify(this.data, null, 2)}\n`, 'utf-8');
  }
}

/**
 * Replay a learned action sequence against the live page.
 * @param {import('../core/FlowContext.js').FlowContext} ctx
 * @param {Array<{tool:string, input:object}>} actions
 * @returns {Promise<void>} resolves when every action succeeded; throws on the first failure
 */
export async function replayActions(ctx, actions) {
  const executor = createToolExecutor(ctx);
  for (const action of actions) {
    const input = resolveTemplates(action.input, ctx.values);
    ctx.info(`[replay] ${action.tool} ${JSON.stringify(input)}`);
    await executor.execute(action.tool, input);
  }
}

/** Replace literals that came from the row data with `{{field}}` placeholders. */
function templatize(input, values) {
  const pairs = Object.entries(values ?? {})
    .filter(([, v]) => typeof v === 'string' && v.trim().length >= 3)
    .sort((a, b) => String(b[1]).length - String(a[1]).length);

  const walk = (value) => {
    if (typeof value !== 'string') return value;
    for (const [key, literal] of pairs) {
      if (value === literal) return `{{${key}}}`;
    }
    return value;
  };

  const out = {};
  for (const [k, v] of Object.entries(input ?? {})) out[k] = walk(v);
  return out;
}

/** Fill `{{field}}` placeholders back in from the current row. */
function resolveTemplates(input, values) {
  const out = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    out[k] = typeof v === 'string' ? interpolate(v, values) : v;
  }
  return out;
}
