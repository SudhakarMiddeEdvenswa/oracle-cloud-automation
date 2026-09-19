import React from 'react';

import { api } from '../api.js';

const REPORT_FORMATS = [
  { id: 'html', label: 'HTML' },
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'XLSX' },
];

/**
 * The execution form: pick a flow, attach its data file, give the instance
 * details, choose the mode and the report formats, then execute.
 */
export default function RunForm({
  flows,
  flow,
  form,
  setForm,
  dataFile,
  setDataFile,
  testdataFiles = [],
  dataFileName = '',
  setDataFileName,
  onPreview,
  onExecute,
  busy,
  aiAvailable,
}) {
  const set = (key) => (event) => {
    const target = event.target;
    setForm((prev) => ({ ...prev, [key]: target.type === 'checkbox' ? target.checked : target.value }));
  };

  const toggleFormat = (id) => () =>
    setForm((prev) => ({
      ...prev,
      reportFormats: prev.reportFormats.includes(id)
        ? prev.reportFormats.filter((f) => f !== id)
        : [...prev.reportFormats, id],
    }));

  const grouped = groupByModule(flows);
  // A run needs data from exactly one source: an upload or a testdata-folder file.
  const hasData = !!dataFile || !!dataFileName;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onExecute();
      }}
    >
      <section className="card">
        <h2>Form / Function Name</h2>
        <div className="content">
          <div className="field">
            <label htmlFor="flowId">Test case</label>
            <select id="flowId" value={form.flowId} onChange={set('flowId')} required>
              <option value="">Select a test case…</option>
              {grouped.map(([moduleName, moduleFlows]) => (
                <optgroup key={moduleName} label={moduleName}>
                  {moduleFlows.map((f) => (
                    <option key={f.id} value={f.id} disabled={f.broken}>
                      {f.name}
                      {f.broken ? ' — unavailable' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {flow && (
              <div className="hint">
                {flow.description}
                <br />
                <span className="tag">{flow.engine === 'hybrid' ? 'coded + AI fallback' : 'AI-driven'}</span>{' '}
                <span className="tag">{flow.steps.length} steps</span>{' '}
                <span className="tag">{flow.rules.length} verification rules</span>{' '}
                <span className="tag">{flow.fields.length} data fields</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Data file</h2>
        <div className="content">
          <div className="field">
            <label htmlFor="dataFileName">Select from the testdata folder</label>
            <select
              id="dataFileName"
              value={dataFileName}
              onChange={(event) => {
                setDataFileName?.(event.target.value);
                // A folder selection and an upload are mutually exclusive.
                if (event.target.value) setDataFile(null);
              }}
              disabled={!!dataFile}
            >
              <option value="">Select a testdata file…</option>
              {testdataFiles.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="hint">
              CSV files in the project&apos;s <code>testdata/</code> folder. One row per test case.
            </div>
          </div>
          <div className="field">
            <label htmlFor="dataFile">…or upload a data file (CSV)</label>
            <input
              id="dataFile"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setDataFile(file);
                // An upload wins over a folder selection; clear the latter.
                if (file) setDataFileName?.('');
              }}
            />
            <div className="hint">
              {dataFile ? (
                <strong>{dataFile.name}</strong>
              ) : dataFileName ? (
                <>
                  Using <strong>{dataFileName}</strong> from the testdata folder.
                </>
              ) : (
                'No file chosen yet.'
              )}
            </div>
          </div>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={!form.flowId || !hasData || busy}
              onClick={onPreview}
            >
              Check data file
            </button>
            {form.flowId && (
              <a className="secondary" href={api.templateUrl(form.flowId)} download>
                Download template
              </a>
            )}
          </div>
          {flow && (
            <div className="field" style={{ marginTop: 14 }}>
              <details className="steps">
                <summary>Required columns for {flow.name}</summary>
                <ul className="plain">
                  {flow.fields
                    .filter((f) => f.required)
                    .map((f) => (
                      <li key={f.name}>
                        <code>{f.name}</code> — {f.label}
                        {f.generated ? ' (enter AUTO to generate)' : ''}
                      </li>
                    ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Instance details</h2>
        <div className="content">
          <div className="field">
            <label htmlFor="baseUrl">Application URL</label>
            <input
              id="baseUrl"
              type="url"
              value={form.baseUrl}
              onChange={set('baseUrl')}
              placeholder="https://your-pod.fa.ocs.oraclecloud.com"
              required
            />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="username">User name</label>
              <input id="username" type="text" value={form.username} onChange={set('username')} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete="off"
                required
              />
            </div>
          </div>
          <div className="hint">
            Credentials are used for this run only. They are never written to the run record or to any report.
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Mode and options</h2>
        <div className="content">
          <div className="field">
            <label>Browser mode</label>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={!form.headless}
                onClick={() => setForm((prev) => ({ ...prev, headless: false }))}
              >
                Headed
              </button>
              <button
                type="button"
                aria-pressed={form.headless}
                onClick={() => setForm((prev) => ({ ...prev, headless: true }))}
              >
                Headless
              </button>
            </div>
            <div className="hint">Headed shows the browser while it works — useful for a first run on a new pod.</div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="browser">Browser</label>
              <select id="browser" value={form.browser} onChange={set('browser')}>
                <option value="chromium">Chromium</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">WebKit</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="defaultTimeout">Timeout (ms)</label>
              <input
                id="defaultTimeout"
                type="number"
                min="10000"
                step="5000"
                value={form.defaultTimeout}
                onChange={set('defaultTimeout')}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="additionalInstructions">Additional instructions</label>
            <textarea
              id="additionalInstructions"
              value={form.additionalInstructions}
              onChange={set('additionalInstructions')}
              placeholder="Anything the agent should know about this pod or this run — for example: the Procurement BU is Vision Operations; skip the Site Assignments sub-tab; the Purchasing purpose is labelled Ordering."
            />
            <div className="hint">
              {aiAvailable
                ? 'Passed to the AI agent with every step, and it takes precedence over the step wording where they conflict.'
                : 'Recorded with the run. The AI agent is disabled because ANTHROPIC_API_KEY is not set, so these instructions will not change execution.'}
            </div>
          </div>

          <div className="field">
            <label>Report format</label>
            <div className="checks">
              {REPORT_FORMATS.map((f) => (
                <label key={f.id}>
                  <input type="checkbox" checked={form.reportFormats.includes(f.id)} onChange={toggleFormat(f.id)} />
                  {f.label}
                </label>
              ))}
            </div>
            <div className="hint">
              Reports are generated when the run finishes and can be downloaded below. With none selected, HTML is
              produced anyway so the run always leaves a record.
            </div>
          </div>

          <div className="field">
            <div className="checks">
              <label>
                <input type="checkbox" checked={form.stopOnFirstFailure} onChange={set('stopOnFirstFailure')} />
                Stop after the first failed row
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="actions">
        <button className="primary" type="submit" disabled={busy || !form.flowId || !hasData}>
          {busy ? 'Running…' : 'Execute'}
        </button>
        {!form.reportFormats.length && <span className="pill warn">No format selected — HTML will be produced</span>}
      </div>
    </form>
  );
}

/** Group the dropdown by application module, preserving registry order. */
function groupByModule(flows) {
  const groups = new Map();
  for (const flow of flows) {
    const key = flow.module || 'General';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(flow);
  }
  return [...groups.entries()];
}
