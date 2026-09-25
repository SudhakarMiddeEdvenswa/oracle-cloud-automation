/**
 * Helpers for generating unique, per-execution test data.
 * The prompt requires a unique Supplier Name for every run.
 */

/**
 * Build a compact timestamp token: YYYYMMDDHHmmss.
 * @returns {string}
 */
export function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * Produce a unique identifier from a prefix by appending a compact timestamp,
 * e.g. "AUTO_TEST_REQ" -> "AUTO_TEST_REQ_20260918123045".
 * @param {string} prefix
 * @returns {string}
 */
export function uniqueName(prefix) {
  return `${prefix}_${timestamp()}`;
}

/**
 * Produce a unique supplier name from a prefix, e.g.
 * "AUTO_TEST_SUPPLIER" -> "AUTO_TEST_SUPPLIER_20260918123045".
 * @param {string} prefix
 * @returns {string}
 */
export function uniqueSupplierName(prefix) {
  return uniqueName(prefix);
}

/**
 * Produce a unique requisition description from a prefix, e.g.
 * "AUTO_TEST_REQ" -> "AUTO_TEST_REQ_20260918123045".
 * @param {string} prefix
 * @returns {string}
 */
export function uniqueRequisitionDescription(prefix) {
  return uniqueName(prefix);
}

/**
 * Produce a unique purchase-order description from a prefix, e.g.
 * "AUTO_TEST_PO" -> "AUTO_TEST_PO_20260918123045". The prompt requires a fresh
 * PO_DESCRIPTION per run so re-executions never collide on the header.
 * @param {string} prefix
 * @returns {string}
 */
export function uniquePurchaseOrderDescription(prefix) {
  return uniqueName(prefix);
}

/**
 * A valid future date (default 7 days ahead) formatted for Oracle date fields.
 * US-shaped pods accept M/D/YYYY; pass format="iso" for YYYY-MM-DD.
 * @param {number} [daysAhead=7]
 * @param {"us"|"iso"} [format="us"]
 * @returns {string}
 */
export function futureDate(daysAhead = 7, format = 'us') {
  const d = new Date();
  d.setDate(d.getDate() + Number(daysAhead || 0));
  const pad = (n) => String(n).padStart(2, '0');
  if (format === 'iso') {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * Produce a unique, GSTIN-shaped Tax Registration Number for India.
 * Oracle enforces uniqueness of the tax registration number per party/period,
 * so a fresh value is generated on every execution.
 *
 * Format (15 chars): SS LLLLL NNNN L D Z C
 *   e.g. "29ABCDE1234F1Z5" -> state(2) + 5 letters + 4 digits + "F1Z" + check.
 * @param {string} [stateCode='29'] - 2-digit state code (29 = Karnataka)
 * @param {number} [sequence=0] - distinguishes rows generated within the same
 *   second, which is the normal case when a data file is processed in one run
 * @returns {string}
 */
export function uniqueTaxRegistrationNumber(stateCode = '29', sequence = 0) {
  // 7919 is prime, so successive rows land far apart in both the letter and the
  // digit segments rather than differing by a single character.
  const secs = Math.floor(Date.now() / 1000) + Number(sequence || 0) * 7919;

  // 5 uppercase letters derived from the epoch seconds (base-26).
  let n = secs;
  let letters = '';
  for (let i = 0; i < 5; i += 1) {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26);
  }

  const digits = String(secs % 10000).padStart(4, '0');
  const check = String(secs % 10); // single trailing check character
  return `${stateCode}${letters}${digits}F1Z${check}`;
}

/**
 * Generate a value for a manifest field marked `"generated": "<kind>"`.
 *
 * Kinds are intentionally business-shaped rather than generic so a flow
 * manifest reads declaratively:
 *   unique-name   AUTO_TEST_SUPPLIER -> AUTO_TEST_SUPPLIER_20260918123045
 *   unique-gstin  a fresh India GSTIN-shaped tax registration number
 *   timestamp     20260918123045
 *   uuid          a random identifier
 *   today         2026-09-18
 *   today+7       2026-09-25   (any +N / -N day offset)
 *
 * Every row of a data file is normally resolved within the same second, so
 * `sequence` (the row number) is mixed in to keep generated identifiers unique
 * across the run — otherwise row 2 would collide with row 1 and be rejected by
 * the application as a duplicate.
 *
 * @param {string} kind
 * @param {{prefix?: string, seed?: string, sequence?: number}} [opts]
 * @returns {string}
 */
export function generateValue(kind, opts = {}) {
  const spec = String(kind ?? '').trim();
  const offset = /^today([+-]\d+)$/i.exec(spec);
  const sequence = Number.isFinite(Number(opts.sequence)) ? Number(opts.sequence) : 0;
  const rowSuffix = sequence > 0 ? `_R${sequence}` : '';

  if (offset) return isoDate(Number(offset[1]));

  switch (spec.toLowerCase()) {
    case 'unique-name':
      return `${uniqueSupplierName(opts.prefix || 'AUTO_TEST')}${rowSuffix}`;
    case 'unique-gstin':
      return uniqueTaxRegistrationNumber(opts.seed || '29', sequence);
    case 'timestamp':
      return `${opts.prefix || ''}${timestamp()}${sequence > 0 ? String(sequence).padStart(2, '0') : ''}`;
    case 'uuid':
      return `${timestamp()}${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
    case 'today':
      return isoDate(0);
    default:
      throw new Error(`Unknown generator "${spec}"`);
  }
}

/**
 * ISO date (YYYY-MM-DD) offset by a number of days from today.
 * @param {number} days
 * @returns {string}
 */
export function isoDate(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
