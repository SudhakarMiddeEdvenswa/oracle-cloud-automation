import React from 'react';

import { api } from '../api.js';

/** Previous runs, with their reports still downloadable. */
export default function RunHistory({ runs }) {
  if (!runs.length) return null;

  return (
    <section className="card">
      <h2>Previous runs</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Test case</th>
              <th>Result</th>
              <th>Started</th>
              <th>Reports</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.runId}>
                <td>
                  <code>{run.runId}</code>
                </td>
                <td>{run.flowName || run.flowId}</td>
                <td>
                  <span className={`pill ${run.status === 'passed' ? 'ok' : run.summary ? 'bad' : 'idle'}`}>
                    {run.summary ? run.summary.text : run.status}
                  </span>
                </td>
                <td>{run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</td>
                <td>
                  {(run.reports || []).length
                    ? run.reports.map((report) => (
                        <a key={report.format} href={api.reportUrl(run.runId, report.format)} style={{ marginRight: 10 }}>
                          {report.format.toUpperCase()}
                        </a>
                      ))
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
