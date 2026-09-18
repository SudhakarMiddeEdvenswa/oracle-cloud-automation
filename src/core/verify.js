import { interpolate } from './stepsFile.js';

/**
 * Parser + executor for a flow's "Verification File".
 *
 * The verification file is a flat, readable rule list. Each line is one
 * assertion (or a navigation directive that scopes the assertions after it),
 * so a business analyst can extend coverage without touching code — and the AI
 * agent can read the same file when it has to fall back.
 *
 *   # Create Supplier — verification rules
 *   captured-not-empty: supplierNumber
 *   captured-matches:   supplierNumber = ^\d{4,}$
 *   text-visible:       {{supplierName}}
 *   field-contains:     Supplier Type = {{supplierType}}
 *   open-tab:           Addresses
 *   text-visible:       {{addressName}}
 *   ai:                 The supplier header shows the right name and number.
 */

const RULE = /^([a-z][a-z-]*)\s*:\s*(.*)$/i;

/** Rule names this module knows how to execute deterministically. */
export const KNOWN_RULES = new Set([
  'open-tab',
  'text-visible',
  'text-not-visible',
  'field-equals',
  'field-contains',
  'captured-not-empty',
  'captured-matches',
  'ai',
]);

/**
 * @param {string} text
 * @returns {Array<{type:string, arg:string, line:number}>}
 */
export function parseVerifyFile(text) {
  const rules = [];
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const m = RULE.exec(line);
    if (!m) return;
    rules.push({ type: m[1].toLowerCase(), arg: m[2].trim(), line: i + 1 });
  });
  return rules;
}

/**
 * Execute the parsed rules against a live page.
 *
 * @param {object} args
 * @param {import('@playwright/test').Page} args.page
 * @param {import('../page-helpers/OracleFusionHelper.js').OracleFusionHelper} args.oracle
 * @param {Array<{type:string,arg:string,line:number}>} args.rules
 * @param {Record<string, unknown>} args.values - row data merged with captured values
 * @param {(msg:string)=>void} args.log
 * @param {null | ((rule:object, values:object)=>Promise<{ok:boolean,message:string}>)} [args.aiCheck]
 * @param {number} [args.timeout]
 * @returns {Promise<Array<{rule:string, ok:boolean, message:string}>>}
 */
export async function runVerification({ page, oracle, rules, values, log, aiCheck = null, timeout = 30000 }) {
  const results = [];

  for (const rule of rules) {
    const arg = interpolate(rule.arg, values);
    const label = `${rule.type}: ${arg}`;
    try {
      const message = await executeRule({ page, oracle, rule, arg, values, aiCheck, timeout });
      results.push({ rule: label, ok: true, message: message || 'passed' });
      log(`[VERIFY PASS] ${label}`);
    } catch (err) {
      const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
      results.push({ rule: label, ok: false, message });
      log(`[VERIFY FAIL] ${label} -> ${message}`);
    }
  }
  return results;
}

async function executeRule({ page, oracle, rule, arg, values, aiCheck, timeout }) {
  switch (rule.type) {
    case 'open-tab': {
      const tab = page
        .getByRole('tab', { name: arg, exact: false })
        .or(page.getByRole('link', { name: new RegExp(`^${escapeRe(arg)}$`, 'i') }))
        .first();
      await tab.waitFor({ state: 'visible', timeout });
      await tab.click();
      await oracle.waitForLoading();
      return `opened tab "${arg}"`;
    }

    case 'text-visible': {
      await page.getByText(arg, { exact: false }).first().waitFor({ state: 'visible', timeout });
      return `"${arg}" is visible`;
    }

    case 'text-not-visible': {
      const locator = page.getByText(arg, { exact: false }).first();
      if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
        throw new Error(`"${arg}" should not be visible but is`);
      }
      return `"${arg}" is absent`;
    }

    case 'field-equals':
    case 'field-contains': {
      const { label, expected } = splitAssignment(arg);
      const actual = await readFieldValue(page, label, timeout);
      const a = actual.trim().toLowerCase();
      const e = expected.trim().toLowerCase();
      const ok = rule.type === 'field-equals' ? a === e : a.includes(e);
      if (!ok) throw new Error(`field "${label}" is "${actual.trim()}", expected ${rule.type === 'field-equals' ? '' : 'to contain '}"${expected}"`);
      return `field "${label}" = "${actual.trim()}"`;
    }

    case 'captured-not-empty': {
      const value = values?.[arg];
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new Error(`captured value "${arg}" is empty`);
      }
      return `${arg} = "${value}"`;
    }

    case 'captured-matches': {
      const { label, expected } = splitAssignment(arg);
      const value = String(values?.[label] ?? '');
      if (!new RegExp(expected).test(value)) {
        throw new Error(`captured "${label}" = "${value}" does not match /${expected}/`);
      }
      return `${label} = "${value}" matches /${expected}/`;
    }

    case 'ai': {
      if (!aiCheck) throw new Error('AI verification requested but the AI agent is not configured');
      const outcome = await aiCheck(rule, values);
      if (!outcome.ok) throw new Error(outcome.message || 'AI verification failed');
      return outcome.message || 'AI verification passed';
    }

    default:
      throw new Error(`unknown verification rule "${rule.type}"`);
  }
}

/** Read a labelled field's value, whether it renders as an input or as output text. */
async function readFieldValue(page, label, timeout) {
  const field = page.getByLabel(label, { exact: true }).first();
  await field.waitFor({ state: 'visible', timeout });
  const asInput = await field.inputValue().catch(() => null);
  if (asInput !== null) return asInput;
  return (await field.textContent().catch(() => '')) ?? '';
}

function splitAssignment(arg) {
  const idx = arg.indexOf('=');
  if (idx === -1) throw new Error(`expected "<name> = <value>" but got "${arg}"`);
  return { label: arg.slice(0, idx).trim(), expected: arg.slice(idx + 1).trim() };
}

function escapeRe(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
