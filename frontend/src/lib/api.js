// API client — single source of truth for backend communication.
//
// Set VITE_API_BASE in .env to point at your backend (default: localhost:8000).

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (e) {
    throw new ApiError(
      `Cannot reach backend at ${API_BASE}. Is it running?`,
      0,
      e,
    );
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail);
    } catch {
      /* response wasn't JSON, fall back to HTTP code */
    }
    throw new ApiError(detail, res.status);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(message, status = 0, cause = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.cause = cause;
  }
}

export const api = {
  health:          () => request("/"),
  listSegments:    () => request("/segments"),
  getHistory:      (country, category) =>
    request(`/history/${encodeURIComponent(country)}/${encodeURIComponent(category)}`),
  getBacktest:     () => request("/backtest_summary"),
  predict:         ({ country_code, category, target_month }) =>
    request("/predict", {
      method: "POST",
      body: JSON.stringify({ country_code, category, target_month }),
    }),
};

export const API_BASE_URL = API_BASE;
