/**
 * Parser for a flow's "Detailed Steps" text file.
 *
 * The steps file is the single source of truth for *what* a flow does. A flow's
 * optional `flow.js` supplies deterministic Playwright implementations keyed by
 * the same step ids; any step without an implementation (or whose
 * implementation fails) is executed by the AI agent straight from the prose
 * here. That is the whole hybrid engine in one sentence.
 *
 * Format:
 *
 *   # Lines starting with # are comments.
 *
 *   [login scope=session] Login to the application
 *   Open the application URL and sign in with the supplied credentials.
 *   Expected: The home page is displayed.
 *
 *   [create] Create the record
 *   Click Create and fill in {{supplierName}}.
 *   Expected: The record is created.
 *
 * `scope=session` marks a step that runs once per execution (login, navigation)
 * instead of once per CSV row. `optional` marks a step whose failure is logged
 * as a warning rather than failing the row.
 */

const HEADER = /^\[([a-z0-9][a-z0-9_-]*)((?:\s+[a-z]+(?:=[^\]\s]+)?)*)\]\s*(.*)$/i;

/**
 * @param {string} text
 * @returns {Array<{id:string,title:string,instruction:string,expected:string,scope:'session'|'row',optional:boolean}>}
 */
export function parseStepsFile(text) {
  const steps = [];
  let current = null;

  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (/^\s*#/.test(line)) continue;

    const header = HEADER.exec(line.trim());
    if (header) {
      if (current) steps.push(finish(current));
      const flags = parseFlags(header[2]);
      current = {
        id: header[1].toLowerCase(),
        title: header[3].trim(),
        lines: [],
        expectedLines: [],
        scope: flags.scope === 'session' ? 'session' : 'row',
        optional: flags.optional === true || flags.optional === 'true',
      };
      continue;
    }

    if (!current) continue;

    const expected = /^\s*Expected\s*:\s*(.*)$/i.exec(line);
    if (expected) {
      current.expectedLines.push(expected[1].trim());
      continue;
    }
    // Continuation of a multi-line Expected block.
    if (current.expectedLines.length && line.trim() && /^\s{2,}/.test(rawLine)) {
      current.expectedLines.push(line.trim());
      continue;
    }
    current.lines.push(line);
  }
  if (current) steps.push(finish(current));
  return steps;
}

function finish(s) {
  return {
    id: s.id,
    title: s.title,
    instruction: s.lines.join('\n').trim(),
    expected: s.expectedLines.join(' ').trim(),
    scope: s.scope,
    optional: s.optional,
  };
}

function parseFlags(raw) {
  const flags = {};
  for (const token of String(raw ?? '').trim().split(/\s+/).filter(Boolean)) {
    const [k, v] = token.split('=');
    flags[k.toLowerCase()] = v === undefined ? true : v;
  }
  return flags;
}

/**
 * Replace `{{placeholders}}` with values from the resolved row / captured data.
 * Unknown placeholders are left intact so the AI agent can still see the intent.
 * @param {string} text
 * @param {Record<string, unknown>} values
 * @returns {string}
 */
export function interpolate(text, values) {
  return String(text ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const value = values?.[key];
    return value === undefined || value === null || value === '' ? match : String(value);
  });
}
