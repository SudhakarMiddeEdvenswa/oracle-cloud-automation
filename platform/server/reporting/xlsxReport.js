import ExcelJS from 'exceljs';

import { STATUS } from '../../../src/core/outcome.js';

const GREEN = 'FFE8F6EE';
const RED = 'FFFDECEA';
const AMBER = 'FFFFF4E0';
const HEADER = 'FFEDF1F7';

/**
 * Workbook report: Summary, Results, Steps, Verification and Test Data sheets.
 *
 * The Results sheet mirrors the Execute block of the spec sheet — one line per
 * test case with its outcome — while the other sheets carry the evidence behind
 * each line.
 *
 * @param {object} run
 * @param {string} file - destination path
 */
export async function buildXlsxReport(run, file) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oracle Cloud Automation Platform';
  wb.created = new Date(run.startedAt || Date.now());

  buildSummarySheet(wb, run);
  buildResultsSheet(wb, run);
  buildStepsSheet(wb, run);
  buildVerificationSheet(wb, run);
  buildTestDataSheet(wb, run);

  await wb.xlsx.writeFile(file);
}

function buildSummarySheet(wb, run) {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 28 }, { width: 76 }];

  const title = ws.addRow([`${run.flowName} — Execution Report`]);
  title.font = { bold: true, size: 14 };
  ws.addRow([]);

  const headline = ws.addRow(['Execute', run.summary.text]);
  headline.font = { bold: true, size: 12 };
  fill(headline.getCell(2), run.summary.failed + run.summary.invalid === 0 ? GREEN : AMBER);
  ws.addRow([]);

  for (const [key, value] of [
    ['Flow', `${run.flowName} (${run.flowId})`],
    ['Engine', run.engine],
    ['Application URL', run.instance.baseUrl],
    ['User', run.instance.username],
    ['Data file', `${run.dataFile.name} (${run.dataFile.rowCount} rows)`],
    ['Browser', `${run.settings.browser} — ${run.settings.headless ? 'headless' : 'headed'}`],
    ['Additional instructions', run.settings.additionalInstructions || '(none)'],
    ['Started', formatDate(run.startedAt)],
    ['Finished', formatDate(run.finishedAt)],
    ['Duration', formatDuration(run.durationMs)],
    ['Run id', run.runId],
  ]) {
    const row = ws.addRow([key, value]);
    row.getCell(1).font = { bold: true };
  }

  ws.addRow([]);
  const countsHeader = ws.addRow(['Outcome', 'Count']);
  styleHeader(countsHeader);
  for (const [label, count, color] of [
    ['Total rows', run.summary.total, null],
    ['Success', run.summary.success, GREEN],
    ['Failed', run.summary.failed, RED],
    ['Invalid data', run.summary.invalid, AMBER],
    ['Skipped', run.summary.skipped, AMBER],
  ]) {
    const row = ws.addRow([label, count]);
    if (color) fill(row.getCell(1), color);
  }
}

function buildResultsSheet(wb, run) {
  const ws = wb.addWorksheet('Results');
  const captureNames = [...new Set(run.rows.flatMap((r) => Object.keys(r.captured || {})))];

  const header = ws.addRow([
    'Row',
    'Test Case',
    'Result',
    'Reason',
    'Steps Passed',
    'Steps Total',
    'Engines',
    'Checks Passed',
    'Checks Total',
    'Duration (s)',
    ...captureNames,
    'Detail',
  ]);
  styleHeader(header);

  for (const r of run.rows) {
    const steps = r.steps || [];
    const checks = r.verification || [];
    const row = ws.addRow([
      r.rowNumber,
      r.label,
      r.status === STATUS.SUCCESS ? STATUS.SUCCESS : `${r.status}${r.reason ? ` -- ${r.reason}` : ''}`,
      r.reason || '',
      steps.filter((s) => s.status === 'passed').length,
      steps.length,
      [...new Set(steps.map((s) => s.engine).filter(Boolean))].join('+'),
      checks.filter((c) => c.ok).length,
      checks.length,
      Number((r.durationMs / 1000).toFixed(1)),
      ...captureNames.map((name) => r.captured?.[name] ?? ''),
      oneLine(r.detail),
    ]);
    fill(row.getCell(3), r.status === STATUS.SUCCESS ? GREEN : r.status === STATUS.SKIPPED ? AMBER : RED);
  }

  autoSize(ws, [6, 34, 30, 30, 13, 11, 14, 14, 12, 12, ...captureNames.map(() => 20), 70]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.cellCount } };
}

function buildStepsSheet(wb, run) {
  const ws = wb.addWorksheet('Steps');
  const header = ws.addRow(['Row', 'Test Case', 'Step Id', 'Step Title', 'Status', 'Engine', 'Duration (s)', 'Detail']);
  styleHeader(header);

  // Session steps ran once for the whole execution, so they carry row 0.
  for (const s of run.sessionSteps || []) {
    const row = ws.addRow([
      0,
      '(session)',
      s.stepId,
      s.title,
      s.status,
      s.engine || '',
      Number((s.durationMs / 1000).toFixed(1)),
      oneLine(s.detail),
    ]);
    fill(row.getCell(5), s.status === 'passed' ? GREEN : s.status === 'skipped' ? AMBER : RED);
  }

  for (const r of run.rows) {
    for (const s of r.steps || []) {
      const row = ws.addRow([
        r.rowNumber,
        r.label,
        s.stepId,
        s.title,
        s.status,
        s.engine || '',
        Number((s.durationMs / 1000).toFixed(1)),
        oneLine(s.detail),
      ]);
      fill(row.getCell(5), s.status === 'passed' ? GREEN : s.status === 'skipped' ? AMBER : RED);
    }
  }

  autoSize(ws, [6, 30, 24, 40, 12, 10, 12, 80]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildVerificationSheet(wb, run) {
  const ws = wb.addWorksheet('Verification');
  const header = ws.addRow(['Row', 'Test Case', 'Result', 'Rule', 'Evidence']);
  styleHeader(header);

  for (const r of run.rows) {
    for (const v of r.verification || []) {
      const row = ws.addRow([r.rowNumber, r.label, v.ok ? 'passed' : 'failed', v.rule, oneLine(v.message)]);
      fill(row.getCell(3), v.ok ? GREEN : RED);
    }
  }

  autoSize(ws, [6, 30, 12, 52, 80]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildTestDataSheet(wb, run) {
  const ws = wb.addWorksheet('Test Data');
  const fieldNames = [...new Set(run.rows.flatMap((r) => Object.keys(r.data || {})))];

  const header = ws.addRow(['Row', 'Test Case', ...fieldNames]);
  styleHeader(header);

  for (const r of run.rows) {
    ws.addRow([
      r.rowNumber,
      r.label,
      ...fieldNames.map((name) => {
        const value = r.data?.[name];
        return Array.isArray(value) ? value.join(' | ') : value ?? '';
      }),
    ]);
  }

  autoSize(ws, [6, 30, ...fieldNames.map(() => 22)]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function styleHeader(row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    fill(cell, HEADER);
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD0D7E2' } } };
  });
}

function fill(cell, argb) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/**
 * Apply column widths after the rows exist.
 * Assigning `ws.columns` at this point would redefine the columns and clobber
 * the header row, so each width is set on its column individually.
 */
function autoSize(ws, widths) {
  widths.forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });
}

function oneLine(text) {
  return String(text ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .trim()
    .slice(0, 1000);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '—';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.round(seconds - m * 60)}s`;
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}
