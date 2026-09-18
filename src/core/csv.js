import Papa from 'papaparse';

/**
 * CSV helpers for the generic test-data contract.
 *
 * Every flow in the registry declares its `fields`; a data file is simply a CSV
 * whose header row uses those field names (or their human labels). One CSV row
 * == one test case iteration.
 */

/** Normalize a header cell so "Supplier Name", "supplier_name" and "supplierName" all match. */
export function normalizeKey(key) {
  return String(key ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Parse CSV text into an array of raw row objects, preserving the original
 * header spelling alongside a normalized lookup map.
 *
 * @param {string} text
 * @returns {{headers: string[], rows: object[], errors: string[]}}
 */
export function parseCsv(text) {
  const result = Papa.parse(String(text ?? '').trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => String(h ?? '').replace(/^\uFEFF/, '').trim(),
  });

  const errors = (result.errors || [])
    // A short final line is common in hand-edited files and is not fatal.
    .filter((e) => e.code !== 'TooFewFields')
    .map((e) => `Row ${Number(e.row ?? 0) + 2}: ${e.message}`);

  return {
    headers: result.meta?.fields ?? [],
    rows: (result.data || []).filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== '')),
    errors,
  };
}

/**
 * Build a normalized accessor over a raw CSV row: every field is reachable by
 * field name, label, snake_case or spaced header.
 * @param {object} rawRow
 * @returns {Map<string,string>}
 */
export function indexRow(rawRow) {
  const map = new Map();
  for (const [k, v] of Object.entries(rawRow ?? {})) {
    map.set(normalizeKey(k), typeof v === 'string' ? v.trim() : v);
  }
  return map;
}

/**
 * Serialize rows to CSV text.
 * @param {string[]} headers
 * @param {Array<object>} rows
 * @returns {string}
 */
export function toCsv(headers, rows) {
  return Papa.unparse({ fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? '')) });
}

/**
 * Produce a ready-to-fill CSV template for a flow, with one example row.
 * @param {{fields: Array<object>}} flow
 * @returns {string}
 */
export function templateFor(flow) {
  const fields = (flow.fields || []).filter((f) => !f.generated);
  const headers = fields.map((f) => f.name);
  const example = {};
  for (const f of fields) example[f.name] = f.example ?? f.default ?? '';
  return toCsv(headers, [example]);
}
