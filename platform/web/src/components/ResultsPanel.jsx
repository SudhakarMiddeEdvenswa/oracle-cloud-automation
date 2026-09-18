import React from 'react';

import { api } from '../api.js';

/**
 * Live results for the current run: the headline count, one line per test case
 * as it finishes, the step trail, and the generated reports.
 */
export default function ResultsPanel({ run, onCancel }) {
  if (!run) {
    return (
      <section className="card">
        <h2>Execute</h2>
        <div className="empty">
          Choose a test case, attach its data file and the instance details, then press Execute.
        </div>
      </section>
    );
  }

  const done = run.finished;
  const rows = [...run.rows.values()].sort((a, b) => a.rowNumber - b.rowNumber);
  const success = rows.filter((r) => r.status === 'Success').length;
  const total = run.totalRows || rows.length;
  const headline = run.summary?.text ?? `${success} Success out of ${total}`;

  return (
    <>
      <section className="card">
        <h2>Execute</h2>
        <div className="headline">
          {headline}
          {!done && <span className="pill idle" style={{ marginLeft: 10 }}>running…</span>}
          {done && (
            <span className={`pill ${run.status === 'passed' ? 'ok' : 'bad'}`} style={{ marginLeft: 10 }}>
              {run.status}
            </span>
          )}
        </div>

        <div className="tiles">
          <Tile k="Rows" n={total} />
          <Tile k="Success" n={run.summary?.success ?? success} />
          <Tile k="Failed" n={run.summary?.failed ?? rows.filter((r) => r.status === 'Failed').length} />
          <Tile k="Invalid" n={run.summary?.invalid ?? rows.filter((r) => r.status === 'Invalid Data').length} />
        </div>

        {run.abortReason && <div className="banner bad" style={{ margin: 16 }}>{run.abortReason}</div>}

        <div className="content">
          <div className="actions">
            <span className="tag">{run.flowName}</span>
            <span className="tag">{run.mode}</span>
            <span className="tag">run {run.runId}</span>
            {!done && (
              <button type="button" className="secondary" onClick={onCancel}>
                Cancel run
              </button>
            )}
          </div>

          {done && (run.reports?.length ?? 0) > 0 && (
            <div className="actions" style={{ marginTop: 12 }}>
              <strong style={{ marginRight: 4 }}>Download report:</strong>
              {run.reports.map((report) => (
                <a key={report.format} className="secondary" href={api.reportUrl(run.runId, report.format)}>
                  {report.format.toUpperCase()} ({formatBytes(report.bytes)})
                </a>
              ))}
            </div>
          )}
          {done && !(run.reports?.length ?? 0) && (
            <div className="banner warn" style={{ marginTop: 12 }}>
              No report was generated for this run.
            </div>
          )}
        </div>
      </section>

      {(run.sessionSteps?.length ?? 0) > 0 && (
        <section className="card">
          <h2>Session setup — sign-in and navigation</h2>
          <div className="content">
            <ul className="plain">
              {run.sessionSteps.map((step) => (
                <li key={step.stepId}>
                  <span className={`pill ${step.status === 'passed' ? 'ok' : 'bad'}`}>{step.status}</span>{' '}
                  {step.title} {step.engine && <span className="tag">{step.engine}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Results</h2>
        {rows.length === 0 ? (
          <div className="empty">Waiting for the first test case to finish…</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Test case</th>
                  <th>Result</th>
                  <th>Captured</th>
                  <th>Steps</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="num">{row.rowNumber}</td>
                    <td>{row.label}</td>
                    <td>
                      <span className={`pill ${statusClass(row.status)}`}>
                        {row.status === 'Success' ? 'Success' : `${row.status}${row.reason ? ` -- ${row.reason}` : ''}`}
                      </span>
                    </td>
                    <td>{formatCaptured(row.captured)}</td>
                    <td>
                      {row.steps.length ? (
                        <details className="steps">
                          <summary>
                            {row.steps.filter((s) => s.status === 'passed').length}/{row.steps.length}
                          </summary>
                          <ul className="plain">
                            {row.steps.map((step) => (
                              <li key={step.stepId}>
                                <span className={`pill ${statusClass(step.status === 'passed' ? 'Success' : 'Failed')}`}>
                                  {step.status}
                                </span>{' '}
                                {step.title} {step.engine && <span className="tag">{step.engine}</span>}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{row.durationMs ? `${(row.durationMs / 1000).toFixed(1)} s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Tile({ k, n }) {
  return (
    <div className="tile">
      <div className="n">{n}</div>
      <div className="k">{k}</div>
    </div>
  );
}

function statusClass(status) {
  if (status === 'Success') return 'ok';
  if (status === 'Skipped' || status === 'Cancelled') return 'warn';
  return 'bad';
}

function formatCaptured(captured) {
  const entries = Object.entries(captured || {});
  if (!entries.length) return '—';
  return entries.map(([k, v]) => `${k}=${v}`).join(', ');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
