import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

import { chromium, firefox, webkit } from '@playwright/test';

import { loadFlow, loadFlowSpec } from '../../../src/core/registry.js';
import { parseCsv } from '../../../src/core/csv.js';
import { resolveRow } from '../../../src/core/rowData.js';
import { FlowContext } from '../../../src/core/FlowContext.js';
import { runSteps, StepFailure } from '../../../src/core/StepRunner.js';
import { runVerification } from '../../../src/core/verify.js';
import { STATUS, classifyError } from '../../../src/core/outcome.js';
import { HealingStore } from '../../../src/ai/HealingStore.js';
import { StepAgent } from '../../../src/ai/StepAgent.js';
import { logger } from '../../../src/utils/logger.js';
import { writeReports } from '../reporting/index.js';

const BROWSERS = { chromium, firefox, webkit };

/**
 * Executes one run: a flow, a data file, an application instance and a mode.
 *
 * Emits `event` for every log line, step and row so the UI can follow along
 * over SSE, and writes the run record plus the requested reports into
 * `runs/<runId>/` when it finishes.
 */
export class RunManager extends EventEmitter {
  /**
   * @param {object} args
   * @param {string} args.runId
   * @param {string} args.flowId
   * @param {{name:string, text:string}} args.dataFile
   * @param {{baseUrl:string, username:string, password:string}} args.instance
   * @param {object} args.settings
   * @param {string} args.runsDir
   */
  constructor({ runId, flowId, dataFile, instance, settings, runsDir }) {
    super();
    this.runId = runId;
    this.flowId = flowId;
    this.dataFile = dataFile;
    this.instance = instance;
    this.settings = {
      headless: settings.headless !== false,
      browser: (settings.browser || 'chromium').toLowerCase(),
      defaultTimeout: Number(settings.defaultTimeout) || 60000,
      slowMo: Number(settings.slowMo) || 0,
      additionalInstructions: settings.additionalInstructions || '',
      reportFormats: settings.reportFormats?.length ? settings.reportFormats : ['html'],
      stopOnFirstFailure: settings.stopOnFirstFailure === true,
    };
    this.runDir = path.join(runsDir, runId);

    this.status = 'queued';
    this.cancelled = false;
    this.events = [];
    this.run = null;

    /** Records for the steps that run once per execution (login, navigation). */
    this.sessionSteps = [];
    this.abortReason = '';
  }

  /** Broadcast and retain an event so a late SSE subscriber can catch up. */
  #emitEvent(event) {
    const enriched = { ...event, ts: new Date().toISOString() };
    // Keep the replay buffer bounded; a long run can produce thousands of lines.
    this.events.push(enriched);
    if (this.events.length > 5000) this.events.splice(0, this.events.length - 5000);
    this.emit('event', enriched);
  }

  /** Ask the run to stop after the current step. */
  cancel() {
    this.cancelled = true;
    this.#emitEvent({ type: 'log', level: 'warn', message: 'Cancellation requested; stopping after the current step.' });
  }

  /**
   * Run everything. Resolves with the finished run record; never rejects — a
   * failure is reported as run status `failed` so the UI always gets a result.
   * @returns {Promise<object>}
   */
  async execute() {
    fs.mkdirSync(this.runDir, { recursive: true });
    const startedAt = new Date();
    this.status = 'running';

    let flow = null;
    let browser = null;
    const rows = [];

    try {
      flow = loadFlow(this.flowId);
      if (flow.broken) throw new Error(`Flow "${this.flowId}" is not usable: ${flow.error}`);

      const resolved = this.#resolveRows(flow);
      const agent = StepAgent.fromEnv();
      const healing = new HealingStore(flow.dir);

      this.#emitEvent({
        type: 'run-start',
        runId: this.runId,
        flowId: flow.id,
        flowName: flow.name,
        engine: flow.engine,
        totalRows: resolved.length,
        aiAvailable: !!agent,
        mode: this.settings.headless ? 'headless' : 'headed',
      });

      if (!agent) {
        this.#log(
          'warn',
          'ANTHROPIC_API_KEY is not set, so the AI agent is unavailable. Steps without a deterministic implementation cannot run.'
        );
      }

      // Rows missing required data are reported without touching the browser.
      for (const invalid of resolved.filter((row) => row.missing.length)) {
        rows.push(this.#invalidRow(invalid));
      }
      const executable = resolved.filter((r) => !r.missing.length);

      if (executable.length) {
        browser = await this.#launchBrowser();
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          ignoreHTTPSErrors: true,
        });
        context.setDefaultTimeout(this.settings.defaultTimeout);
        context.setDefaultNavigationTimeout(this.settings.defaultTimeout);
        const page = await context.newPage();

        const sessionSteps = flow.steps.filter((s) => s.scope === 'session');
        const rowSteps = flow.steps.filter((s) => s.scope !== 'session');

        // Session steps sign in and navigate once for the whole run. If they
        // fail, the instance details or the credentials are wrong and no row
        // can succeed — so the run stops here instead of repeating a doomed
        // login for every row in the data file.
        const session = await this.#runSessionSteps({
          flow,
          page,
          referenceRow: executable[0],
          sessionSteps,
          agent,
          healing,
        });

        if (!session.ok) {
          this.abortReason = `Session setup failed at step "${session.stepTitle}": ${session.detail}`;
          this.#log('error', this.abortReason);
          for (const pending of executable) {
            rows.push(this.#unexecutedRow(pending, STATUS.SKIPPED, 'Session setup failed'));
          }
        } else {
          for (const resolvedRow of executable) {
            if (this.cancelled) {
              rows.push(this.#unexecutedRow(resolvedRow, STATUS.CANCELLED, 'Cancelled before this row started'));
              continue;
            }

            const row = await this.#executeRow({
              flow,
              page,
              resolvedRow,
              rowSteps,
              sessionSteps,
              agent,
              healing,
            });
            rows.push(row);

            if (this.abortReason) {
              this.#log('error', 'Stopping the run: the browser session could not be recovered.');
              this.cancelled = true;
            } else if (this.settings.stopOnFirstFailure && row.status !== STATUS.SUCCESS) {
              this.#log('warn', 'Stopping after the first failure, as requested.');
              this.cancelled = true;
            }
          }
        }

        await context.close().catch(() => {});
      }

      // Restore the original CSV order in the report.
      rows.sort((a, b) => a.rowNumber - b.rowNumber);
      this.run = this.#buildRunRecord({ flow, rows, startedAt, resolvedCount: resolved.length });
      this.status = this.run.summary.success === this.run.summary.total ? 'passed' : 'failed';
    } catch (err) {
      const { reason, detail } = classifyError(err);
      this.abortReason = this.abortReason || `${reason}: ${detail.split('\n')[0]}`;
      this.#log('error', `Run aborted: ${this.abortReason}`);
      rows.sort((a, b) => a.rowNumber - b.rowNumber);
      this.run = this.#buildRunRecord({ flow, rows, startedAt, resolvedCount: rows.length });
      this.status = 'failed';
    } finally {
      logger.setSink(null);
      await browser?.close().catch(() => {});
    }

    await this.#finish();
    return this.run;
  }

  /** Parse and resolve every data row up front, so bad data is reported fast. */
  #resolveRows(flow) {
    const { rows: raw, errors } = parseCsv(this.dataFile.text);
    for (const error of errors) this.#log('warn', `Data file: ${error}`);
    if (!raw.length) throw new Error('The data file has no data rows');

    const resolved = raw.map((rawRow, i) => resolveRow(flow, rawRow, i + 1));

    const unknown = [...new Set(resolved.flatMap((r) => r.unknown))];
    if (unknown.length) {
      this.#log('warn', `Data file has columns this flow does not use: ${unknown.join(', ')}`);
    }
    return resolved;
  }

  /**
   * Sign in and navigate once for the whole run.
   * @returns {Promise<{ok:boolean, stepTitle?:string, detail?:string}>}
   */
  async #runSessionSteps({ flow, page, referenceRow, sessionSteps, agent, healing }) {
    if (!sessionSteps.length) return { ok: true };

    // The session context borrows the first executable row's data so any
    // {{placeholder}} in a session step still resolves.
    const ctx = this.#makeContext({ flow, page, resolvedRow: referenceRow, agent, rowNumber: null });
    const spec = await loadFlowSpec(flow);
    const impls = spec ? spec.buildSteps(ctx) : {};

    try {
      const records = await runSteps({
        ctx,
        steps: sessionSteps,
        impls,
        healing,
        onStep: (event) => this.#emitEvent({ ...event, scope: 'session' }),
        isCancelled: () => this.cancelled,
      });
      this.sessionSteps.push(...records);
      return { ok: true };
    } catch (err) {
      if (err instanceof StepFailure) {
        this.sessionSteps.push({
          stepId: err.stepId,
          title: err.stepTitle,
          scope: 'session',
          status: 'failed',
          engine: null,
          durationMs: err.durationMs ?? 0,
          attempts: err.attempts,
          detail: err.attempts?.[err.attempts.length - 1]?.detail ?? err.message,
          screenshot: err.screenshot,
        });
        return {
          ok: false,
          stepTitle: err.stepTitle,
          detail: err.attempts?.[err.attempts.length - 1]?.detail ?? err.message,
        };
      }
      const { reason, detail } = classifyError(err);
      return { ok: false, stepTitle: 'session setup', detail: `${reason}: ${detail.split('\n')[0]}` };
    }
  }

  /** Build the per-row (or per-session) context and route page-object logs into the run. */
  #makeContext({ flow, page, resolvedRow, agent, rowNumber }) {
    const sinkRow = rowNumber === null ? null : resolvedRow.rowNumber;
    const ctx = new FlowContext({
      page,
      instance: this.instance,
      flow,
      row: resolvedRow,
      settings: this.settings,
      artifactsDir: this.runDir,
      ai: agent,
      log: (level, message) => this.#log(level, message, sinkRow),
    });
    // Session artifacts belong to the run, not to the row whose data they borrow.
    ctx.artifactScope = rowNumber === null ? 'session' : `row-${resolvedRow.rowNumber}`;
    // Page objects log through the shared logger; route those lines here too.
    logger.setSink((level, message) => this.#log(level, message, sinkRow));
    return ctx;
  }

  /** Run the row-scoped steps and the verification rules for one row. */
  async #executeRow({ flow, page, resolvedRow, rowSteps, sessionSteps, agent, healing }) {
    const startedAt = Date.now();
    this.#emitEvent({ type: 'row-start', rowNumber: resolvedRow.rowNumber, label: resolvedRow.label });

    const ctx = this.#makeContext({ flow, page, resolvedRow, agent, rowNumber: resolvedRow.rowNumber });
    const spec = await loadFlowSpec(flow);
    const impls = spec ? spec.buildSteps(ctx) : {};

    const row = {
      rowNumber: resolvedRow.rowNumber,
      label: resolvedRow.label,
      status: STATUS.SUCCESS,
      reason: '',
      detail: '',
      data: resolvedRow.data,
      captured: {},
      steps: [],
      verification: [],
      warnings: ctx.warnings,
      screenshots: [],
      durationMs: 0,
    };

    const onStep = (event) => this.#emitEvent({ ...event, rowNumber: resolvedRow.rowNumber });

    try {
      row.steps = await runSteps({
        ctx,
        steps: rowSteps,
        impls,
        healing,
        onStep,
        isCancelled: () => this.cancelled,
      });

      row.verification = await this.#verify({ ctx, flow, agent });
      const failedChecks = row.verification.filter((v) => !v.ok);
      if (failedChecks.length) {
        row.status = STATUS.FAILED;
        row.reason = `Verification failed (${failedChecks.length} of ${row.verification.length})`;
        row.detail = failedChecks.map((v) => `${v.rule} -> ${v.message}`).join('; ');
        row.screenshots.push(await ctx.screenshot('verification-failed'));
      }
    } catch (err) {
      if (err instanceof StepFailure && this.cancelled) {
        row.status = STATUS.CANCELLED;
        row.reason = 'Cancelled';
      } else {
        const classified = classifyError(err);
        row.status = classified.status;
        row.reason = classified.reason;
        row.detail = classified.detail;
      }
      // Put the browser back somewhere usable so one bad row does not poison
      // the rest of the data file.
      await this.#recoverSession({ ctx, sessionSteps, impls, healing });
    }

    row.captured = { ...ctx.captured };
    row.screenshots.push(...row.steps.map((s) => s.screenshot).filter(Boolean));
    row.durationMs = Date.now() - startedAt;

    this.#emitEvent({
      type: 'row-end',
      rowNumber: row.rowNumber,
      label: row.label,
      status: row.status,
      reason: row.reason,
      captured: row.captured,
      durationMs: row.durationMs,
    });

    return row;
  }

  /** Run the flow's verification rules against the page the flow left behind. */
  async #verify({ ctx, flow, agent }) {
    if (!flow.rules.length) return [];
    return runVerification({
      page: ctx.page,
      oracle: ctx.oracle,
      rules: flow.rules,
      values: ctx.values,
      log: (message) => this.#log('info', message, ctx.row.rowNumber),
      timeout: this.settings.defaultTimeout,
      aiCheck: agent
        ? async (rule, values) => agent.verifyClaim({ ctx, claim: interpolateClaim(rule.arg, values) })
        : null,
    });
  }

  /**
   * Return the browser to the application's entry point after a row failed,
   * re-running the session steps only if the application signed us out. A
   * failure here sets `abortReason`, which stops the run.
   */
  async #recoverSession({ ctx, sessionSteps, impls, healing }) {
    if (this.cancelled) return;
    try {
      await ctx.page.goto(this.instance.baseUrl, { waitUntil: 'domcontentloaded' });
      await ctx.oracle.waitForLoading();

      const signedOut = await ctx.page
        .getByRole('textbox', { name: /Username|User ID/i })
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (!signedOut) return;

      this.#log('warn', 'The application signed us out; re-running the session steps before the next row.');
      const records = await runSteps({
        ctx,
        steps: sessionSteps,
        impls,
        healing,
        onStep: (event) => this.#emitEvent({ ...event, scope: 'session' }),
        isCancelled: () => this.cancelled,
      });
      this.sessionSteps.push(...records);
    } catch (err) {
      const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
      this.abortReason = `Could not recover the browser session between rows: ${detail}`;
    }
  }

  async #launchBrowser() {
    const launcher = BROWSERS[this.settings.browser] || chromium;
    this.#log(
      'info',
      `Launching ${this.settings.browser} in ${this.settings.headless ? 'headless' : 'headed'} mode`
    );
    return launcher.launch({ headless: this.settings.headless, slowMo: this.settings.slowMo });
  }

  /** A row rejected before execution because required data was missing. */
  #invalidRow(resolvedRow) {
    const reason = `Missing ${resolvedRow.missing.join(', ')}`;
    this.#emitEvent({ type: 'row-start', rowNumber: resolvedRow.rowNumber, label: resolvedRow.label });
    this.#log('error', `${resolvedRow.label}: ${reason}`, resolvedRow.rowNumber);
    this.#emitEvent({
      type: 'row-end',
      rowNumber: resolvedRow.rowNumber,
      label: resolvedRow.label,
      status: STATUS.INVALID,
      reason,
      captured: {},
      durationMs: 0,
    });
    return this.#stubRow(
      resolvedRow,
      STATUS.INVALID,
      reason,
      'The row was not executed because the data file is missing required values.'
    );
  }

  /** A row that never ran: the session failed, or the run was cancelled first. */
  #unexecutedRow(resolvedRow, status, reason) {
    this.#emitEvent({
      type: 'row-end',
      rowNumber: resolvedRow.rowNumber,
      label: resolvedRow.label,
      status,
      reason,
      captured: {},
      durationMs: 0,
    });
    return this.#stubRow(resolvedRow, status, reason, '');
  }

  #stubRow(resolvedRow, status, reason, detail) {
    return {
      rowNumber: resolvedRow.rowNumber,
      label: resolvedRow.label,
      status,
      reason,
      detail,
      data: resolvedRow.data,
      captured: {},
      steps: [],
      verification: [],
      warnings: [],
      screenshots: [],
      durationMs: 0,
    };
  }

  #buildRunRecord({ flow, rows, startedAt, resolvedCount }) {
    const finishedAt = new Date();
    const count = (status) => rows.filter((r) => r.status === status).length;
    const success = count(STATUS.SUCCESS);
    const total = rows.length || resolvedCount;

    return {
      runId: this.runId,
      flowId: this.flowId,
      flowName: flow?.name || this.flowId,
      engine: flow?.engine || 'unknown',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      // The password is deliberately absent: run records are written to disk.
      instance: { baseUrl: this.instance.baseUrl, username: this.instance.username },
      settings: this.settings,
      dataFile: { name: this.dataFile.name, rowCount: total },
      abortReason: this.abortReason,
      sessionSteps: this.sessionSteps,
      summary: {
        total,
        success,
        failed: count(STATUS.FAILED),
        invalid: count(STATUS.INVALID),
        skipped: count(STATUS.SKIPPED),
        cancelled: count(STATUS.CANCELLED),
        text: `${success} Success out of ${total}`,
      },
      rows,
    };
  }

  /** Persist the run record and the requested reports. */
  async #finish() {
    const recordPath = path.join(this.runDir, 'run.json');
    fs.writeFileSync(recordPath, `${JSON.stringify(this.run, null, 2)}\n`, 'utf-8');

    let reports = [];
    try {
      reports = await writeReports(this.run, this.runDir, this.settings.reportFormats);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.#log('error', `Report generation failed: ${detail}`);
    }

    this.run.reports = reports;
    fs.writeFileSync(recordPath, `${JSON.stringify(this.run, null, 2)}\n`, 'utf-8');

    this.#emitEvent({
      type: 'run-end',
      runId: this.runId,
      status: this.status,
      summary: this.run.summary,
      reports,
      abortReason: this.run.abortReason,
    });
  }

  #log(level, message, rowNumber = null) {
    this.#emitEvent({ type: 'log', level, message, rowNumber });
  }
}

/** Resolve {{placeholders}} in an AI verification claim. */
function interpolateClaim(claim, values) {
  return String(claim ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const value = values?.[key];
    return value === undefined || value === null || value === '' ? match : String(value);
  });
}
