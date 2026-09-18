import fs from 'fs';
import path from 'path';

import { OracleFusionHelper } from '../page-helpers/OracleFusionHelper.js';

/**
 * Everything one step needs, in one object.
 *
 * A FlowContext is created per CSV row (sharing the run's browser page), so a
 * deterministic step implementation and the AI agent see exactly the same
 * surface: the page, the resolved row data, whatever earlier steps captured,
 * and the run's instance details.
 */
export class FlowContext {
  /**
   * @param {object} args
   * @param {import('@playwright/test').Page} args.page
   * @param {{baseUrl:string, username:string, password:string, extras?:object}} args.instance
   * @param {object} args.flow - the loaded registry flow
   * @param {{rowNumber:number,label:string,data:object}} args.row
   * @param {object} args.settings - { headless, browser, defaultTimeout, slowMo, additionalInstructions }
   * @param {(level:string, message:string)=>void} args.log
   * @param {string} args.artifactsDir
   * @param {object|null} [args.ai] - StepAgent, or null when no API key is configured
   */
  constructor({ page, instance, flow, row, settings, log, artifactsDir, ai = null }) {
    this.page = page;
    this.instance = instance;
    this.flow = flow;
    this.row = row;
    this.settings = settings;
    this.artifactsDir = artifactsDir;
    this.ai = ai;
    this.oracle = new OracleFusionHelper(page);

    /** Values produced during the run (supplier number, PO number, …). */
    this.captured = {};
    /** Non-fatal notes surfaced in the report. */
    this.warnings = [];
    /**
     * Sub-folder this context's artifacts go into, relative to the run folder.
     * The runner sets it to "session" for the sign-in and navigation steps.
     */
    this.artifactScope = `row-${row.rowNumber}`;

    this._log = log;
    this._screenshotSeq = 0;
  }

  /** Row data merged with captured values — the placeholder scope for {{…}}. */
  get values() {
    return { ...this.row.data, ...this.captured, ...this.instanceValues };
  }

  /** Instance details safe to interpolate into steps (never the password). */
  get instanceValues() {
    return { baseUrl: this.instance.baseUrl, username: this.instance.username };
  }

  /** Free-text guidance the user typed in the UI; passed to the AI agent. */
  get additionalInstructions() {
    return this.settings.additionalInstructions || '';
  }

  info(message) { this._log('info', message); }
  warn(message) { this.warnings.push(message); this._log('warn', message); }
  error(message) { this._log('error', message); }
  pass(message) { this._log('pass', message); }
  step(message) { this._log('step', message); }

  /**
   * Record a captured business value (Supplier Number, PO Number, …).
   * @param {string} name
   * @param {string} value
   */
  capture(name, value) {
    this.captured[name] = value;
    this.info(`Captured ${name} = "${value}"`);
  }

  /**
   * Save a full-page screenshot into the run's artifacts folder.
   * @param {string} name
   * @returns {Promise<string>} the path relative to the run folder, so the
   *   links in the HTML report resolve both on disk and over the artifacts API
   */
  async screenshot(name) {
    this._screenshotSeq += 1;
    const safe = `${String(this._screenshotSeq).padStart(2, '0')}-${String(name)
      .replace(/[^a-z0-9-_]+/gi, '_')
      .slice(0, 60)}.png`;
    const dir = path.join(this.artifactsDir, this.artifactScope);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, safe);
    await this.page.screenshot({ path: file, fullPage: true }).catch(() => {});
    return path.relative(this.artifactsDir, file).replace(/\\/g, '/');
  }
}
