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
