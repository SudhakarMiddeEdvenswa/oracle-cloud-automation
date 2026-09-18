import Anthropic from '@anthropic-ai/sdk';

import { BROWSER_TOOLS, REPLAYABLE, createToolExecutor, observePage } from './browserTools.js';

/** Model default for the agent. Overridable with AGENT_MODEL. */
const DEFAULT_MODEL = 'claude-opus-5';

const SYSTEM_PROMPT = `You are the execution agent of a generic enterprise UI test platform. You drive a real browser, against a real application, on behalf of a QA engineer.

You are given ONE step of a business flow, written in plain English by a functional analyst, together with the test data for the current row. Your job is to carry out exactly that step in the live application and then call finish_step.

How to work:
- Start with observe_page to see where you are. Never guess the page state.
- Identify controls the way a human tester does: by their visible label, name or text. Element ids in enterprise applications are generated and change between sessions, so never rely on them.
- Take the smallest number of actions that completes the step. Do not do work belonging to later steps, and do not "improve" the flow.
- After an action that submits, saves or navigates, observe_page again and confirm the expected result before moving on.
- Use the test data values exactly as given. Do not invent, reformat or substitute business data. If a value the step needs is not in the data, say so in finish_step rather than making one up.
- When a generated identifier appears (a supplier number, requisition number, PO number, receipt number, invoice or payment id), read it with read_value and store it with capture_value under the capture name the step names.
- Field labels vary between application versions and localisations. If an exact label fails, observe_page and pick the closest real label on the page (for example "City or Town" for City, "Pin Code" for Postal Code, "Ordering" for a Purchasing address purpose). Prefer a real label over a failed exact match.
- Dropdowns, choice lists and lists-of-values all go through select_option. Checkboxes always go through set_checkbox.

How to finish:
- Call finish_step with status "done" only when the step's Expected result is actually true on screen.
- Call finish_step with status "failed" when the application refuses the step. This includes validation errors, duplicate-record errors, missing mandatory data and permission errors. Quote the application's own message verbatim in the summary — the platform classifies the failure from your wording, and a business rejection like "already exists" is a legitimate, useful test result, not your mistake.
- Never call finish_step with status "done" to get out of a difficult step. A wrong pass is far more damaging than an honest failure.
- Do not retry the same failing action more than twice. Try one different reading of the step, then finish.`;

/**
 * Runs a single flow step by driving the browser through Claude.
 *
 * This is the "AI fallback" half of the hybrid engine: it handles steps that
 * have no deterministic implementation, and steps whose implementation broke
 * because the application's UI moved.
 */
export class StepAgent {
  /**
   * @param {object} args
   * @param {string} args.apiKey
   * @param {string} [args.model]
   * @param {'low'|'medium'|'high'|'xhigh'|'max'} [args.effort]
   * @param {number} [args.maxIterations]
   */
  constructor({ apiKey, model = DEFAULT_MODEL, effort = 'high', maxIterations = 40 }) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.effort = effort;
    this.maxIterations = maxIterations;
  }

  /**
   * Build an agent from the environment, or return null when no key is set so
   * the platform can run code-only and say so in the UI.
   * @returns {StepAgent|null}
   */
  static fromEnv() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !apiKey.trim()) return null;
    return new StepAgent({
      apiKey: apiKey.trim(),
      model: process.env.AGENT_MODEL || DEFAULT_MODEL,
      effort: process.env.AGENT_EFFORT || 'high',
      maxIterations: Number(process.env.AGENT_MAX_ITERATIONS) || 40,
    });
  }

  /**
   * Execute one step.
   *
   * @param {object} args
   * @param {import('../core/FlowContext.js').FlowContext} args.ctx
   * @param {{id:string,title:string,instruction:string,expected:string}} args.step
   * @param {string} [args.reason] - why the agent was invoked (no implementation, or a code failure)
   * @returns {Promise<{status:'done'|'failed', summary:string, actions:Array<object>, iterations:number}>}
   */
  async runStep({ ctx, step, reason = '' }) {
    const executor = createToolExecutor(ctx);
    const actions = [];
    const messages = [{ role: 'user', content: await this.#buildTaskPrompt(ctx, step, reason) }];

    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      const message = await this.#send(messages, BROWSER_TOOLS);

      if (message.stop_reason === 'refusal') {
        return { status: 'failed', summary: 'The agent declined to continue this step.', actions, iterations: iteration };
      }
      if (message.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: message.content });
        continue;
      }

      const toolUses = message.content.filter((b) => b.type === 'tool_use');
      if (!toolUses.length) {
        // The model answered in prose instead of finishing; nudge it once per turn.
        messages.push({ role: 'assistant', content: message.content });
        messages.push({
          role: 'user',
          content: 'Continue by calling a tool. When the step is complete or cannot be completed, call finish_step.',
        });
        continue;
      }

      messages.push({ role: 'assistant', content: message.content });

      const results = [];
      let finished = null;
      for (const toolUse of toolUses) {
        const outcome = await this.#executeTool(executor, toolUse, ctx, actions);
        results.push(outcome.result);
        if (outcome.finished) finished = outcome.finished;
      }
      messages.push({ role: 'user', content: results });

      if (finished) {
        return { status: finished.status, summary: finished.summary, actions, iterations: iteration };
      }
    }

    return {
      status: 'failed',
      summary: `The agent did not complete the step within ${this.maxIterations} iterations.`,
      actions,
      iterations: this.maxIterations,
    };
  }

  /**
   * Judge a free-text verification claim from the verification file
   * (`ai: <claim>`) against the live page.
   *
   * @param {object} args
   * @param {import('../core/FlowContext.js').FlowContext} args.ctx
   * @param {string} args.claim
   * @returns {Promise<{ok:boolean, message:string}>}
   */
  async verifyClaim({ ctx, claim }) {
    const readOnly = BROWSER_TOOLS.filter((t) =>
      ['observe_page', 'take_screenshot', 'read_value', 'finish_step'].includes(t.name)
    );
    const executor = createToolExecutor(ctx);
    const messages = [
      {
        role: 'user',
        content: `Verify this claim about the page that is currently open. Do not change anything — only look.

CLAIM: ${claim}

TEST DATA AND CAPTURED VALUES:
${formatValues(ctx.values)}

Inspect the page, then call finish_step with status "done" if the claim is true and "failed" if it is not. Put the evidence you relied on in the summary.`,
      },
    ];

    for (let iteration = 1; iteration <= 12; iteration += 1) {
      const message = await this.#send(messages, readOnly);
      if (message.stop_reason === 'refusal') return { ok: false, message: 'The agent declined to verify this claim.' };
      if (message.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: message.content });
        continue;
      }

      const toolUses = message.content.filter((b) => b.type === 'tool_use');
      if (!toolUses.length) {
        const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
        return { ok: false, message: text || 'The agent gave no verdict.' };
      }

      messages.push({ role: 'assistant', content: message.content });
      const results = [];
      let finished = null;
      for (const toolUse of toolUses) {
        const outcome = await this.#executeTool(executor, toolUse, ctx, []);
        results.push(outcome.result);
        if (outcome.finished) finished = outcome.finished;
      }
      messages.push({ role: 'user', content: results });

      if (finished) return { ok: finished.status === 'done', message: finished.summary };
    }
    return { ok: false, message: 'The agent did not reach a verdict.' };
  }

  /** One streamed request. Streaming keeps long observations from hitting HTTP timeouts. */
  async #send(messages, tools) {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: { effort: this.effort },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
    });
    return stream.finalMessage();
  }

  /** Run one tool call and shape it into a tool_result block. */
  async #executeTool(executor, toolUse, ctx, actions) {
    try {
      const outcome = await executor.execute(toolUse.name, toolUse.input || {});
      if (REPLAYABLE.has(toolUse.name)) {
        actions.push({ tool: toolUse.name, input: toolUse.input || {} });
      }
      ctx.info(`[agent] ${toolUse.name} ${summarizeInput(toolUse.input)}`);
      return {
        result: { type: 'tool_result', tool_use_id: toolUse.id, content: outcome.content },
        finished: outcome.finished ?? null,
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
      ctx.info(`[agent] ${toolUse.name} failed: ${detail}`);
      return {
        result: { type: 'tool_result', tool_use_id: toolUse.id, is_error: true, content: detail },
        finished: null,
      };
    }
  }

  /** The per-step task prompt: the step prose, the row data, and what is on screen now. */
  async #buildTaskPrompt(ctx, step, reason) {
    const observation = await observePage(ctx.page).catch(() => '(the page could not be observed)');
    const captures = (ctx.flow.captures || []).map((c) => `  - ${c.name}: ${c.description || ''}`).join('\n');

    return `APPLICATION: ${ctx.instance.baseUrl}
FLOW: ${ctx.flow.name}
TEST CASE ROW: ${ctx.row.label} (row ${ctx.row.rowNumber} of the data file)
${reason ? `WHY YOU WERE CALLED: ${reason}\n` : ''}
STEP TO PERFORM — [${step.id}] ${step.title}
${step.instruction}
${step.expected ? `\nEXPECTED RESULT: ${step.expected}` : ''}

TEST DATA FOR THIS ROW:
${formatValues(ctx.values)}
${captures ? `\nVALUES THIS FLOW EXPECTS TO CAPTURE:\n${captures}` : ''}
${ctx.additionalInstructions ? `\nADDITIONAL INSTRUCTIONS FROM THE USER (these override the step wording where they conflict):\n${ctx.additionalInstructions}` : ''}

CURRENT PAGE:
${observation}`;
  }
}

/** Render row/captured values for the prompt, never including secrets. */
function formatValues(values) {
  const entries = Object.entries(values ?? {}).filter(([k]) => !/password|pwd|secret|token/i.test(k));
  if (!entries.length) return '  (none)';
  return entries
    .map(([k, v]) => `  - ${k}: ${Array.isArray(v) ? v.join(', ') : String(v ?? '')}`)
    .join('\n');
}

function summarizeInput(input) {
  if (!input || typeof input !== 'object') return '';
  const parts = Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v.slice(0, 60)}"` : v}`);
  return parts.join(' ');
}
