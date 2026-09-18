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
 * Produce a unique supplier name from a prefix, e.g.
 * "AUTO_TEST_SUPPLIER" -> "AUTO_TEST_SUPPLIER_20260918123045".
 * @param {string} prefix
 * @returns {string}
 */
export function uniqueSupplierName(prefix) {
  return `${prefix}_${timestamp()}`;
}

/**
 * Produce a unique, GSTIN-shaped Tax Registration Number for India.
 * Oracle enforces uniqueness of the tax registration number per party/period,
 * so a fresh value is generated on every execution.
 *
 * Format (15 chars): SS LLLLL NNNN L D Z C
 *   e.g. "29ABCDE1234F1Z5" -> state(2) + 5 letters + 4 digits + "F1Z" + check.
 * @param {string} [stateCode='29'] - 2-digit state code (29 = Karnataka)
 * @returns {string}
 */
export function uniqueTaxRegistrationNumber(stateCode = '29') {
  const secs = Math.floor(Date.now() / 1000);

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
