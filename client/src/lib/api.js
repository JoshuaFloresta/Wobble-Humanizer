/**
 * API client.
 *
 * Requests are origin-relative and proxied by Vite in development, so there
 * is no base URL to configure. Every call funnels through `request` so error
 * handling and the offline signal live in one place.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export class ApiError extends Error {
  constructor(message, { status, issues, offline } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
    this.offline = Boolean(offline);
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body ? JSON_HEADERS : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the HumanInzer API. Is the server running?', { offline: true });
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = (isJson && (payload.error || payload.detail)) || `Request failed (${response.status})`;
    throw new ApiError(message, { status: response.status, issues: isJson ? payload.issues : undefined });
  }

  return payload;
}

export const api = {
  health: () => request('/health'),
  presets: () => request('/presets'),

  paraphrase: (payload, signal) => request('/paraphrase', { method: 'POST', body: payload, signal }),
  analyze: (text, signal) => request('/analyze', { method: 'POST', body: { text }, signal }),

  /** Persist a run that was computed in the browser. */
  storeRun: (payload) => request('/runs', { method: 'POST', body: payload }),

  listRuns: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    ).toString();
    return request(`/runs${query ? `?${query}` : ''}`);
  },
  getRun: (id) => request(`/runs/${id}`),
  updateRun: (id, update) => request(`/runs/${id}`, { method: 'PATCH', body: update }),
  deleteRun: (id) => request(`/runs/${id}`, { method: 'DELETE' }),
  exportUrl: (id, format) => `/api/runs/${id}/export?format=${format}`,
};

export default api;
