import { replayActions } from '../ai/HealingStore.js';

/** Thrown when a step cannot be completed by any engine. */
export class StepFailure extends Error {
  /**
   * @param {string} message
   * @param {{stepId:string, title:string, attempts:Array<object>, screenshot?:string|null, durationMs?:number}} info
   */
  constructor(message, info) {
    super(message);
    this.name = 'StepFailure';
    this.stepId = info.stepId;
    this.stepTitle = info.title;
    this.attempts = info.attempts;
    // The failure screenshot the runner already captured, so callers do not
    // take a second one of the same screen.
    this.screenshot = info.screenshot ?? null;
    this.durationMs = info.durationMs ?? 0;
  }
}

/**
 * The hybrid engine.
 *
 * Every step is tried in cost order — deterministic code, then a previously
 * learned action sequence, then the AI agent — and the first engine that
 * completes the step wins. Whatever the AI learns is written back to the
 * registry, so a step only ever costs a model call while it is genuinely new
 * or genuinely broken.
 *
 * @param {object} args
 * @param {import('./FlowContext.js').FlowContext} args.ctx
 * @param {Array<object>} args.steps - parsed steps, already filtered by scope
 * @param {Record<string, Function>} args.impls - deterministic handlers keyed by step id
 * @param {import('../ai/HealingStore.js').HealingStore|null} args.healing
 * @param {(event:object)=>void} args.onStep
 * @param {()=>boolean} [args.isCancelled]
 * @returns {Promise<Array<object>>} one record per step
 */
export async function runSteps({ ctx, steps, impls, healing, onStep, isCancelled = () => false }) {
  const records = [];

  for (const step of steps) {
    if (isCancelled()) {
      throw new StepFailure('Run cancelled', { stepId: step.id, title: step.title, attempts: [], screenshot: null });
    }

    const startedAt = Date.now();
    const attempts = [];
    onStep({ type: 'step-start', stepId: step.id, title: step.title, scope: step.scope });
    ctx.step(`[${step.id}] ${step.title}`);

    const engines = buildEngineChain({ ctx, step, impls, healing });
    let succeeded = null;

    for (const engine of engines) {
      try {
        const detail = await engine.run();
        succeeded = { engine: engine.name, detail };
        attempts.push({ engine: engine.name, ok: true, detail: detail || '' });
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
        attempts.push({ engine: engine.name, ok: false, detail: message });
        engine.onFailure?.();
        // Only announce a fallback when there is something left to fall back to.
        const isLast = engine === engines[engines.length - 1];
        if (isLast) {
          ctx.error(`[${step.id}] ${engine.name} engine failed: ${message}`);
        } else {
          ctx.warn(`[${step.id}] ${engine.name} engine failed (${message}); falling back`);
        }
      }
    }

    const record = {
      stepId: step.id,
      title: step.title,
      scope: step.scope,
      optional: step.optional,
      engine: succeeded?.engine ?? null,
      status: succeeded ? 'passed' : 'failed',
      durationMs: Date.now() - startedAt,
      attempts,
      detail: succeeded?.detail ?? attempts[attempts.length - 1]?.detail ?? '',
      screenshot: null,
    };

    if (succeeded) {
      engines.find((e) => e.name === succeeded.engine)?.onSuccess?.();
      ctx.pass(`[${step.id}] completed via ${succeeded.engine}`);
    } else {
      record.screenshot = await ctx.screenshot(`FAILED-${step.id}`);
      if (step.optional) {
        record.status = 'skipped';
        ctx.warn(`[${step.id}] optional step skipped: ${record.detail}`);
      }
    }

    records.push(record);
    onStep({ type: 'step-end', ...record });

    if (record.status === 'failed') {
      throw new StepFailure(`Step "${step.title}" failed: ${record.detail}`, {
        stepId: step.id,
        title: step.title,
        attempts,
        screenshot: record.screenshot,
        durationMs: record.durationMs,
      });
    }
  }

  return records;
}

/**
 * Assemble the ordered engine chain for one step.
 * @returns {Array<{name:string, run:()=>Promise<string>, onSuccess?:Function, onFailure?:Function}>}
 */
function buildEngineChain({ ctx, step, impls, healing }) {
  const engines = [];
  const impl = impls?.[step.id];
  const learned = healing?.get(step.id) ?? null;

  if (typeof impl === 'function') {
    engines.push({
      name: 'code',
      run: async () => {
        await impl(ctx);
        return 'deterministic implementation';
      },
    });
  }

  if (learned) {
    engines.push({
      name: 'replay',
      run: async () => {
        await replayActions(ctx, learned.actions);
        return `replayed ${learned.actions.length} learned action(s)`;
      },
      onSuccess: () => healing.markSuccess(step.id),
      onFailure: () => healing.markFailure(step.id),
    });
  }

  if (ctx.ai) {
    const hadCode = typeof impl === 'function';
    engines.push({
      name: 'ai',
      run: async () => {
        const reason = hadCode
          ? 'The deterministic implementation of this step failed, most likely because the application UI changed. Recover from wherever the page is now and complete the step.'
          : 'This step has no deterministic implementation; perform it from the written instruction.';
        const result = await ctx.ai.runStep({ ctx, step, reason });
        if (result.status !== 'done') throw new Error(result.summary || 'the agent could not complete the step');
        // Learn the sequence so the next run does not need the model.
        healing?.record(step.id, result.actions, ctx.values);
        return `agent completed the step in ${result.iterations} iteration(s): ${result.summary}`;
      },
    });
  }

  if (!engines.length) {
    engines.push({
      name: 'none',
      run: async () => {
        throw new Error(
          `No engine available for step "${step.id}": the flow has no implementation for it and no ANTHROPIC_API_KEY is configured for the AI agent`
        );
      },
    });
  }

  return engines;
}
