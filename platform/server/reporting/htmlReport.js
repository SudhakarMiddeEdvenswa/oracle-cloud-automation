import { STATUS } from '../../../src/core/outcome.js';

/**
 * Self-contained HTML report for one run.
 *
 * No external assets: the file can be attached to an email or committed as a
 * build artifact and still render the same everywhere.
 *
 * @param {object} run
 * @returns {string}
 */
export function buildHtmlReport(run) {
  const s = run.summary;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(run.flowName)} — Execution Report</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f6f7f9; --card: #fff; --ink: #14171f; --muted: #5b6474;
    --line: #e2e5ea; --ok: #1a7f4b; --okbg: #e8f6ee; --bad: #b3261e; --badbg: #fdecea;
    --warn: #8a5a00; --warnbg: #fff4e0; --accent: #1f4b99;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         background: var(--bg); color: var(--ink); }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 32px 0 12px; }
  .sub { color: var(--muted); margin: 0 0 24px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 8px; }
  .tile { padding: 14px 16px; }
  .tile .n { font-size: 26px; font-weight: 650; letter-spacing: -0.02em; }
  .tile .k { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  .headline { padding: 16px; font-size: 17px; font-weight: 600; margin: 12px 0 4px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 24px; padding: 16px; }
  .meta div { padding: 5px 0; border-bottom: 1px solid var(--line); }
  .meta span { color: var(--muted); display: inline-block; min-width: 150px; }
  table { width: 100%; border-collapse: collapse; }
  .scroll { overflow-x: auto; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { background: #fafbfc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); white-space: nowrap; }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .pill.ok { background: var(--okbg); color: var(--ok); }
  .pill.bad { background: var(--badbg); color: var(--bad); }
  .pill.warn { background: var(--warnbg); color: var(--warn); }
  details { border-top: 1px solid var(--line); }
  details:first-of-type { border-top: 0; }
  summary { padding: 12px 16px; cursor: pointer; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  summary::-webkit-details-marker { display: none; }
  summary .name { font-weight: 600; }
  summary .why { color: var(--muted); }
  .body { padding: 0 16px 18px; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12.5px; }
  pre { background: #fafbfc; border: 1px solid var(--line); border-radius: 6px; padding: 10px; overflow-x: auto; }
  .eng { font-size: 11px; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 1px 6px; }
  footer { color: var(--muted); font-size: 12px; margin-top: 32px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>${esc(run.flowName)} — Execution Report</h1>
  <p class="sub">${esc(run.instance.baseUrl)} &middot; run <code>${esc(run.runId)}</code> &middot; ${esc(
    formatDate(run.startedAt)
  )}</p>

  <div class="tiles">
    ${tile('Total rows', s.total)}
    ${tile('Success', s.success)}
    ${tile('Failed', s.failed)}
    ${tile('Invalid data', s.invalid)}
    ${tile('Duration', formatDuration(run.durationMs))}
  </div>

  <div class="card headline">${esc(s.text)}</div>

  <h2>Run details</h2>
  <div class="card meta">
    <div><span>Flow</span>${esc(run.flowName)} <code>${esc(run.flowId)}</code></div>
    <div><span>Engine</span>${esc(run.engine)}</div>
    <div><span>Application URL</span>${esc(run.instance.baseUrl)}</div>
    <div><span>User</span>${esc(run.instance.username)}</div>
    <div><span>Data file</span>${esc(run.dataFile.name)} (${run.dataFile.rowCount} rows)</div>
    <div><span>Browser</span>${esc(run.settings.browser)} — ${run.settings.headless ? 'headless' : 'headed'}</div>
    <div><span>Started</span>${esc(formatDate(run.startedAt))}</div>
    <div><span>Finished</span>${esc(formatDate(run.finishedAt))}</div>
    ${
      run.settings.additionalInstructions
        ? `<div style="grid-column:1/-1"><span>Additional instructions</span>${esc(
            run.settings.additionalInstructions
          )}</div>`
        : ''
    }
  </div>

  ${
    (run.sessionSteps || []).length
      ? `<h2>Session setup</h2>
  <p class="sub">Steps that ran once for the whole execution — sign-in and navigation.</p>
  <div class="card scroll">
    <table>
      <thead><tr><th>Step</th><th>Title</th><th>Status</th><th>Engine</th><th>Duration</th><th>Detail</th><th>Evidence</th></tr></thead>
      <tbody>
        ${run.sessionSteps
          .map(
            (s) => `<tr>
          <td>${esc(s.stepId)}</td>
          <td>${esc(s.title)}</td>
          <td>${statusPill(s.status)}</td>
          <td>${s.engine ? `<span class="eng">${esc(s.engine)}</span>` : '—'}</td>
          <td>${formatDuration(s.durationMs)}</td>
          <td>${esc(truncate(s.detail || '', 220))}</td>
          <td>${s.screenshot ? `<a href="${esc(s.screenshot)}">screenshot</a>` : '—'}</td>
        </tr>`
          )
          .join('\n')}
      </tbody>
    </table>
  </div>`
      : ''
  }

  <h2>Results</h2>
  <div class="card scroll">
    <table>
      <thead><tr><th>#</th><th>Test case</th><th>Result</th><th>Captured</th><th>Duration</th></tr></thead>
      <tbody>
        ${run.rows
          .map(
            (r) => `<tr>
          <td>${r.rowNumber}</td>
          <td>${esc(r.label)}</td>
          <td>${pill(r)}</td>
          <td>${esc(formatCaptured(r.captured)) || '—'}</td>
          <td>${formatDuration(r.durationMs)}</td>
        </tr>`
          )
          .join('\n')}
      </tbody>
    </table>
  </div>

  <h2>Row by row</h2>
  <div class="card">
    ${run.rows.map((r) => rowDetail(r)).join('\n')}
  </div>

  <footer>
    Generated by the Oracle Cloud Automation Platform. Steps marked
    <span class="eng">code</span> ran a deterministic implementation,
    <span class="eng">replay</span> replayed a previously learned sequence, and
    <span class="eng">ai</span> was driven live by the AI agent.
  </footer>
</div>
</body>
</html>`;
}

function tile(label, value) {
  return `<div class="card tile"><div class="n">${esc(String(value))}</div><div class="k">${esc(label)}</div></div>`;
}

function pill(row) {
  const cls = row.status === STATUS.SUCCESS ? 'ok' : row.status === STATUS.SKIPPED ? 'warn' : 'bad';
  const text = row.status === STATUS.SUCCESS ? STATUS.SUCCESS : `${row.status}${row.reason ? ` -- ${row.reason}` : ''}`;
  return `<span class="pill ${cls}">${esc(text)}</span>`;
}

function rowDetail(row) {
  const steps = (row.steps || [])
    .map(
      (s) => `<tr>
        <td>${esc(s.stepId)}</td>
        <td>${esc(s.title)}</td>
        <td>${statusPill(s.status)}</td>
        <td>${s.engine ? `<span class="eng">${esc(s.engine)}</span>` : '—'}</td>
        <td>${formatDuration(s.durationMs)}</td>
        <td>${esc(s.detail || '')}</td>
      </tr>`
    )
    .join('\n');

  const checks = (row.verification || [])
    .map(
      (v) => `<tr><td>${statusPill(v.ok ? 'passed' : 'failed')}</td><td><code>${esc(v.rule)}</code></td><td>${esc(
        v.message
      )}</td></tr>`
    )
    .join('\n');

  return `<details${row.status === STATUS.SUCCESS ? '' : ' open'}>
    <summary>
      <span class="name">${esc(row.label)}</span>
      ${pill(row)}
      ${row.detail && row.detail !== row.reason ? `<span class="why">${esc(truncate(row.detail, 160))}</span>` : ''}
    </summary>
    <div class="body">
      <p><strong>Test data</strong></p>
      <pre>${esc(formatData(row.data))}</pre>
      ${
        Object.keys(row.captured || {}).length
          ? `<p><strong>Captured values</strong></p><pre>${esc(formatData(row.captured))}</pre>`
          : ''
      }
      ${
        steps
          ? `<p><strong>Steps</strong></p><div class="scroll"><table><thead><tr><th>Step</th><th>Title</th><th>Status</th><th>Engine</th><th>Duration</th><th>Detail</th></tr></thead><tbody>${steps}</tbody></table></div>`
          : ''
      }
      ${
        checks
          ? `<p><strong>Verification</strong></p><div class="scroll"><table><thead><tr><th>Result</th><th>Rule</th><th>Evidence</th></tr></thead><tbody>${checks}</tbody></table></div>`
          : ''
      }
      ${
        (row.warnings || []).length
          ? `<p><strong>Warnings</strong></p><ul>${row.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        (row.screenshots || []).length
          ? `<p><strong>Screenshots</strong></p><ul>${row.screenshots
              .map((f) => `<li><a href="${esc(f)}">${esc(f)}</a></li>`)
              .join('')}</ul>`
          : ''
      }
    </div>
  </details>`;
}

function statusPill(status) {
  const cls = status === 'passed' ? 'ok' : status === 'skipped' ? 'warn' : 'bad';
  return `<span class="pill ${cls}">${esc(status)}</span>`;
}

function formatCaptured(captured) {
  return Object.entries(captured || {})
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}

function formatData(data) {
  return Object.entries(data || {})
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' | ') : String(v ?? '')}`)
    .join('\n');
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.round(seconds - m * 60)}s`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function truncate(text, max) {
  const t = String(text ?? '');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
