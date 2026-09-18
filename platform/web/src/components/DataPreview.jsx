import React from 'react';

/**
 * What the platform made of the uploaded data file, before any browser opens:
 * one line per row, with the rows that are missing required values called out.
 */
export default function DataPreview({ preview, onDismiss }) {
  if (!preview) return null;

  const invalid = preview.rows.filter((r) => !r.valid);

  return (
    <section className="card">
      <h2>Data file check</h2>
      <div className="content">
        <div className="actions" style={{ marginBottom: 12 }}>
          <span className="pill idle">{preview.rowCount} rows</span>
          <span className={`pill ${invalid.length ? 'bad' : 'ok'}`}>
            {invalid.length ? `${invalid.length} would be rejected` : 'all rows have the required values'}
          </span>
          <button type="button" className="secondary" onClick={onDismiss}>
            Dismiss
          </button>
        </div>

        {preview.parseErrors.map((error) => (
          <div className="banner warn" key={error}>
            {error}
          </div>
        ))}
        {preview.unknownColumns.length > 0 && (
          <div className="banner warn">
            These columns are not used by this flow and will be ignored: {preview.unknownColumns.join(', ')}
          </div>
        )}

        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Test case</th>
                <th>Status</th>
                <th>Missing</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td className="num">{row.rowNumber}</td>
                  <td>{row.label}</td>
                  <td>
                    <span className={`pill ${row.valid ? 'ok' : 'bad'}`}>{row.valid ? 'Ready' : 'Invalid Data'}</span>
                  </td>
                  <td>{row.missing.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
