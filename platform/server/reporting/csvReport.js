import Papa from 'papaparse';

import { STATUS } from '../../../src/core/outcome.js';

/**
 * Flat CSV report: one line per data row, plus the run summary as trailing
 * metadata lines so the file is still self-describing when opened on its own.
 *
 * @param {object} run
 * @returns {string}
 */
export function buildCsvReport(run) {
  const captureNames = [...new Set(run.rows.flatMap((r) => Object.keys(r.captured || {})))];

  const fields = [
    'Row',
    'Test Case',
    'Status',
    'Result',
    'Reason',
    'Detail',
    'Steps Passed',
    'Steps Total',
    'Engines Used',
    'Verification Passed',
    'Verification Total',
    'Duration (s)',
    ...captureNames,
  ];

  const data = run.rows.map((r) => {
    const steps = r.steps || [];
    const checks = r.verification || [];
    return [
      r.rowNumber,
      r.label,
      r.status,
      r.status === STATUS.SUCCESS ? STATUS.SUCCESS : `${r.status}${r.reason ? ` -- ${r.reason}` : ''}`,
      r.reason || '',
      oneLine(r.detail),
      steps.filter((s) => s.status === 'passed').length,
      steps.length,
      [...new Set(steps.map((s) => s.engine).filter(Boolean))].join('+'),
      checks.filter((c) => c.ok).length,
      checks.length,
      (r.durationMs / 1000).toFixed(1),
      ...captureNames.map((name) => r.captured?.[name] ?? ''),
    ];
  });

  const table = Papa.unparse({ fields, data });

  const meta = [
    [],
    ['Summary', run.summary.text],
    ['Flow', `${run.flowName} (${run.flowId})`],
    ['Application URL', run.instance.baseUrl],
    ['User', run.instance.username],
    ['Data file', `${run.dataFile.name} (${run.dataFile.rowCount} rows)`],
    ['Browser', `${run.settings.browser} — ${run.settings.headless ? 'headless' : 'headed'}`],
    ['Additional instructions', run.settings.additionalInstructions || ''],
    ['Started', run.startedAt],
    ['Finished', run.finishedAt],
    ['Total', run.summary.total],
    ['Success', run.summary.success],
    ['Failed', run.summary.failed],
    ['Invalid data', run.summary.invalid],
    ['Run id', run.runId],
  ];

  return `${table}\n${Papa.unparse(meta)}\n`;
}

function oneLine(text) {
  return String(text ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}
