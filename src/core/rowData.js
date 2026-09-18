import { indexRow, normalizeKey } from './csv.js';
import { generateValue } from '../utils/dataGenerator.js';

/**
 * Resolve one raw CSV row against a flow's declared field contract.
 *
 * A field is filled, in order, from: the CSV cell -> the manifest `generated`
 * generator -> the manifest `default`. Required fields that end up empty make
 * the row *invalid* rather than failed, so the report can say "Missing Tax Id"
 * instead of burning a browser session on a row that was never going to pass.
 *
 * When a field declares a generator, `autofill` decides when it fires:
 *   "blank" (default)  generate whenever the cell is empty — use this for
 *                      values that simply must be unique per run, such as a
 *                      supplier name.
 *   "token"            generate only when the cell literally says AUTO — so a
 *                      blank cell stays blank and a required field reports as
 *                      missing, which is what makes a deliberate
 *                      negative-test row behave like one.
 *
 * @param {object} flow
 * @param {object} rawRow
 * @param {number} rowNumber - 1-based data row number (header excluded)
 * @returns {{rowNumber:number, label:string, data:object, missing:string[], unknown:string[]}}
 */
export function resolveRow(flow, rawRow, rowNumber) {
  const indexed = indexRow(rawRow);
  const data = {};
  const missing = [];

  for (const field of flow.fields || []) {
    const raw = lookup(indexed, field);
    let value = raw === undefined || raw === null ? '' : String(raw).trim();

    if (field.generated && shouldGenerate(value, field)) {
      value = generateValue(field.generated, {
        prefix: field.generatorPrefix,
        seed: field.generatorSeed,
        // The row number keeps generated identifiers distinct across a data
        // file that is resolved within the same second.
        sequence: rowNumber,
      });
    }
    if (value === '' && field.default !== undefined) {
      value = String(field.default);
    }
    if (value === '' && field.required) {
      missing.push(field.label || field.name);
    }
    data[field.name] = coerce(value, field);
  }

  return {
    rowNumber,
    label: rowLabel(flow, data, rowNumber),
    data,
    missing,
    unknown: unknownHeaders(flow, rawRow),
  };
}

/** Decide whether a field's generator should fire for this cell. */
function shouldGenerate(value, field) {
  // The AUTO token always means "generate one for me", whatever the mode.
  if (/^auto$/i.test(value)) return true;
  return (field.autofill ?? 'blank') === 'blank' && value === '';
}

/** Find a cell for a field, accepting its name, its label, or any declared alias. */
function lookup(indexed, field) {
  const candidates = [field.name, field.label, ...(field.aliases || [])];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = indexed.get(normalizeKey(candidate));
    if (value !== undefined && String(value).trim() !== '') return value;
  }
  return '';
}

/** Convert a raw cell to the field's declared type. */
function coerce(value, field) {
  switch (field.type) {
    case 'boolean':
      return /^(y|yes|true|1|x)$/i.test(String(value).trim());
    case 'number': {
      if (String(value).trim() === '') return '';
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    case 'list':
      return String(value)
        .split(field.listSeparator || '|')
        .map((v) => v.trim())
        .filter(Boolean);
    default:
      return value;
  }
}

/** The name a row goes by in logs and reports ("Supplier1", "PO-4471", …). */
function rowLabel(flow, data, rowNumber) {
  const key = flow.rowLabelField || (flow.fields || []).find((f) => f.rowLabel)?.name;
  const explicit = key ? data[key] : undefined;
  if (explicit) return String(explicit);
  const firstFilled = (flow.fields || []).map((f) => data[f.name]).find((v) => v !== '' && v !== undefined);
  return firstFilled ? String(firstFilled) : `Row ${rowNumber}`;
}

/** Header cells in the CSV that the flow does not declare — surfaced as a warning. */
function unknownHeaders(flow, rawRow) {
  const known = new Set();
  for (const field of flow.fields || []) {
    known.add(normalizeKey(field.name));
    if (field.label) known.add(normalizeKey(field.label));
    for (const alias of field.aliases || []) known.add(normalizeKey(alias));
  }
  return Object.keys(rawRow ?? {}).filter((h) => h.trim() && !known.has(normalizeKey(h)));
}
