/**
 * Row outcome vocabulary shared by the runner, the UI and every report format.
 *
 * The reports in the spec sheet read like:
 *   Supplier1   Success
 *   Supplier2   Error -- Already exists
 *   Supplier3   Missing Tax Id
 * so an outcome is always a coarse `status` plus a short human `reason`.
 */

export const STATUS = {
  SUCCESS: 'Success',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
  INVALID: 'Invalid Data',
  CANCELLED: 'Cancelled',
};

/** Patterns that map an application error message onto a stable reason. */
const SIGNATURES = [
  { re: /already\s+exists|duplicate\s+(record|value|supplier)|unique\s+constraint/i, reason: 'Already exists' },
  { re: /you must enter|is required|required field|enter a value|cannot be blank/i, reason: 'Required field missing' },
  { re: /invalid|not valid|malformed/i, reason: 'Invalid value rejected by the application' },
  { re: /no data found|no results|not found/i, reason: 'Record not found' },
  { re: /not authorized|no access|insufficient privileg/i, reason: 'Insufficient privileges' },
  { re: /Timeout .*exceeded|TimeoutError|waiting for/i, reason: 'Timed out waiting for the UI' },
  { re: /net::ERR|ECONNREFUSED|ENOTFOUND|navigation failed/i, reason: 'Application not reachable' },
  { re: /Target (page|browser|context) (closed|crashed)/i, reason: 'Browser session lost' },
];

/**
 * Turn a thrown error into `{status, reason, detail}`.
 * @param {unknown} err
 * @returns {{status: string, reason: string, detail: string}}
 */
export function classifyError(err) {
  const detail = err instanceof Error ? (err.message || String(err)) : String(err);
  for (const sig of SIGNATURES) {
    if (sig.re.test(detail)) return { status: STATUS.FAILED, reason: sig.reason, detail };
  }
  // Keep the first line only: Playwright errors carry long call logs.
  const firstLine = detail.split('\n').find((l) => l.trim()) ?? detail;
  return { status: STATUS.FAILED, reason: truncate(firstLine, 160), detail };
}

/**
 * Format an outcome the way the spec sheet reads it.
 * @param {{status:string, reason?:string}} outcome
 * @returns {string}
 */
export function formatOutcome(outcome) {
  if (!outcome) return '';
  if (outcome.status === STATUS.SUCCESS) return STATUS.SUCCESS;
  return outcome.reason ? `${outcome.status} -- ${outcome.reason}` : outcome.status;
}

function truncate(text, max) {
  const t = String(text ?? '').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
