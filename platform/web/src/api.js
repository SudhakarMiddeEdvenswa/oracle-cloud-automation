/** Thin wrapper over the platform API. */

async function json(response) {
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export const api = {
  health: () => fetch('/api/health').then(json),
  flows: () => fetch('/api/flows').then(json),
  flow: (id) => fetch(`/api/flows/${id}`).then(json),
  templateUrl: (id) => `/api/flows/${id}/template`,
  runs: () => fetch('/api/runs').then(json),
  run: (runId) => fetch(`/api/runs/${runId}`).then(json),
  cancel: (runId) => fetch(`/api/runs/${runId}/cancel`, { method: 'POST' }).then(json),
  reportUrl: (runId, format) => `/api/runs/${runId}/report/${format}`,

  preview: (formData) => fetch('/api/runs/preview', { method: 'POST', body: formData }).then(json),
  start: (formData) => fetch('/api/runs', { method: 'POST', body: formData }).then(json),

  /**
   * Subscribe to a run's event stream.
   * @param {string} runId
   * @param {(event:object)=>void} onEvent
   * @returns {()=>void} unsubscribe
   */
  subscribe(runId, onEvent) {
    const source = new EventSource(`/api/runs/${runId}/events`);
    source.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data));
      } catch {
        // Ignore keep-alive and malformed frames.
      }
    };
    // The server closes the stream when the run ends; that surfaces as an error.
    source.onerror = () => source.close();
    return () => source.close();
  },
};
