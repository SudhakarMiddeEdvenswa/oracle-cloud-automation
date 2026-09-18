import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from './api.js';
import RunForm from './components/RunForm.jsx';
import DataPreview from './components/DataPreview.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import LogStream from './components/LogStream.jsx';
import RunHistory from './components/RunHistory.jsx';

const INITIAL_FORM = {
  flowId: '',
  baseUrl: '',
  username: '',
  password: '',
  headless: true,
  browser: 'chromium',
  defaultTimeout: 60000,
  additionalInstructions: '',
  reportFormats: ['html'],
  stopOnFirstFailure: false,
};

export default function App() {
  const [health, setHealth] = useState(null);
  const [flows, setFlows] = useState([]);
  const [flow, setFlow] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [dataFile, setDataFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [run, setRun] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const unsubscribe = useRef(null);

  // Load the catalogue and prefill the instance details from the server's .env.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [healthBody, flowsBody, runsBody] = await Promise.all([api.health(), api.flows(), api.runs()]);
        if (cancelled) return;
        setHealth(healthBody);
        setFlows(flowsBody.flows);
        setHistory(runsBody.runs);
        setForm((prev) => ({
          ...prev,
          baseUrl: prev.baseUrl || healthBody.defaults.baseUrl,
          username: prev.username || healthBody.defaults.username,
          browser: healthBody.defaults.browser || prev.browser,
          headless: healthBody.defaults.headless,
        }));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the selected flow's contract so the form can show its data fields.
  useEffect(() => {
    if (!form.flowId) {
      setFlow(null);
      return;
    }
    let cancelled = false;
    api
      .flow(form.flowId)
      .then((body) => !cancelled && setFlow(body))
      .catch((err) => !cancelled && setError(err.message));
    setPreview(null);
    return () => {
      cancelled = true;
    };
  }, [form.flowId]);

  // Close the event stream if the page unmounts mid-run.
  useEffect(() => () => unsubscribe.current?.(), []);

  const buildFormData = useCallback(() => {
    const body = new FormData();
    body.append('flowId', form.flowId);
    body.append('baseUrl', form.baseUrl);
    body.append('username', form.username);
    body.append('password', form.password);
    body.append('headless', String(form.headless));
    body.append('browser', form.browser);
    body.append('defaultTimeout', String(form.defaultTimeout));
    body.append('additionalInstructions', form.additionalInstructions);
    body.append('reportFormats', form.reportFormats.join(','));
    body.append('stopOnFirstFailure', String(form.stopOnFirstFailure));
    if (dataFile) body.append('dataFile', dataFile);
    return body;
  }, [form, dataFile]);

  const onPreview = async () => {
    setError('');
    setBusy(true);
    try {
      setPreview(await api.preview(buildFormData()));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onExecute = async () => {
    setError('');
    setBusy(true);
    setLogLines([]);
    setPreview(null);

    try {
      const { runId } = await api.start(buildFormData());
      setRun({
        runId,
        flowName: flow?.name ?? form.flowId,
        mode: form.headless ? 'headless' : 'headed',
        totalRows: 0,
        rows: new Map(),
        sessionSteps: [],
        finished: false,
        status: 'running',
        reports: [],
        summary: null,
        abortReason: '',
      });

      unsubscribe.current?.();
      unsubscribe.current = api.subscribe(runId, (event) => applyEvent(event, setRun, setLogLines));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  // Re-enable the form and refresh history when the run reports it has ended.
  useEffect(() => {
    if (run?.finished) {
      setBusy(false);
      api
        .runs()
        .then((body) => setHistory(body.runs))
        .catch(() => {});
    }
  }, [run?.finished]);

  const onCancel = async () => {
    if (!run) return;
    try {
      await api.cancel(run.runId);
    } catch (err) {
      setError(err.message);
    }
  };

  const aiAvailable = health?.aiAvailable ?? false;
  const selectedFlow = useMemo(() => flows.find((f) => f.id === form.flowId) ?? null, [flows, form.flowId]);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Automation Platform</h1>
          <p>
            Select a test case, attach its data file and instance details, and execute — with an AI agent standing
            behind every step.
          </p>
        </div>
        <div className="actions">
          <span className={`pill ${aiAvailable ? 'ok' : 'warn'}`}>
            {aiAvailable ? `AI agent ready (${health.agentModel})` : 'AI agent disabled'}
          </span>
          {health?.activeRun && <span className="pill idle">run in progress</span>}
        </div>
      </header>

      {error && <div className="banner bad">{error}</div>}
      {health && !aiAvailable && (
        <div className="banner warn">
          ANTHROPIC_API_KEY is not set, so the AI agent cannot run. Flows that rely on it — everything except the coded
          steps of Create Supplier — will report the step as having no available engine.
        </div>
      )}

      <div className="layout">
        <div>
          <RunForm
            flows={flows}
            flow={flow}
            form={form}
            setForm={setForm}
            dataFile={dataFile}
            setDataFile={setDataFile}
            onPreview={onPreview}
            onExecute={onExecute}
            busy={busy}
            aiAvailable={aiAvailable}
          />
          {selectedFlow?.broken && <div className="banner bad">{selectedFlow.error}</div>}
        </div>

        <div>
          <DataPreview preview={preview} onDismiss={() => setPreview(null)} />
          <ResultsPanel run={run} onCancel={onCancel} />
          <LogStream lines={logLines} running={!!run && !run.finished} />
          <RunHistory runs={history} />
        </div>
      </div>
    </div>
  );
}

/**
 * Fold one streamed event into the run state.
 * Rows are kept in a Map so a row-end simply replaces its row-start entry.
 */
function applyEvent(event, setRun, setLogLines) {
  if (event.type === 'log') {
    setLogLines((prev) => [...prev, event].slice(-4000));
    return;
  }

  setRun((prev) => {
    if (!prev) return prev;
    const rows = new Map(prev.rows);

    switch (event.type) {
      case 'run-start':
        return {
          ...prev,
          flowName: event.flowName,
          totalRows: event.totalRows,
          mode: event.mode,
          engine: event.engine,
        };

      case 'row-start':
        rows.set(event.rowNumber, {
          rowNumber: event.rowNumber,
          label: event.label,
          status: 'Running',
          reason: '',
          captured: {},
          steps: [],
          durationMs: 0,
        });
        return { ...prev, rows };

      case 'step-end': {
        // Session steps (sign-in, navigation) run once for the whole execution
        // and carry no row number.
        if (event.scope === 'session' || event.rowNumber === undefined || event.rowNumber === null) {
          const sessionSteps = prev.sessionSteps.filter((s) => s.stepId !== event.stepId);
          return {
            ...prev,
            sessionSteps: [
              ...sessionSteps,
              { stepId: event.stepId, title: event.title, status: event.status, engine: event.engine },
            ],
          };
        }
        const row = rows.get(event.rowNumber);
        if (row) {
          const steps = row.steps.filter((s) => s.stepId !== event.stepId);
          rows.set(event.rowNumber, {
            ...row,
            steps: [...steps, { stepId: event.stepId, title: event.title, status: event.status, engine: event.engine }],
          });
        }
        return { ...prev, rows };
      }

      case 'row-end': {
        const row = rows.get(event.rowNumber) ?? { steps: [] };
        rows.set(event.rowNumber, {
          ...row,
          rowNumber: event.rowNumber,
          label: event.label,
          status: event.status,
          reason: event.reason,
          captured: event.captured ?? {},
          durationMs: event.durationMs,
        });
        return { ...prev, rows };
      }

      case 'run-end':
        return {
          ...prev,
          finished: true,
          status: event.status,
          summary: event.summary,
          reports: event.reports ?? [],
          abortReason: event.abortReason || '',
        };

      default:
        return prev;
    }
  });
}
