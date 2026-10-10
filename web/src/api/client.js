import { API_URL } from '../lib/constants.js';

const TOKEN_KEY = 'orbit.token';
const EXPIRY_KEY = 'orbit.expiresAt';
const REQUEST_TIMEOUT_MS = 30_000; // generous: free hosting tiers can take a while to wake up

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  get isNetwork() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT';
  }
}

/** Persists the JWT between visits. Cleared on logout or as soon as the server says it is no longer valid. */
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  expiresAt() {
    try {
      return localStorage.getItem(EXPIRY_KEY);
    } catch {
      return null;
    }
  },
  set(token, expiresAt) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EXPIRY_KEY, expiresAt || '');
    } catch {
      /* storage unavailable (private mode) — user simply has to log in again next visit */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch {
      /* ignore */
    }
  },
  isExpired() {
    const at = this.expiresAt();
    return Boolean(at) && new Date(at).getTime() <= Date.now();
  },
};

let unauthorizedHandler = () => {};
export const onUnauthorized = (fn) => {
  unauthorizedHandler = fn;
};

const SESSION_CODES = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED']);

async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    throw new ApiError(0, 'NETWORK', 'Can’t reach the server. Check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    const error = new ApiError(
      response.status,
      data?.error?.code || 'ERROR',
      data?.error?.message || 'Something went wrong. Please try again.',
      data?.error?.details,
    );
    if (response.status === 401 && auth && SESSION_CODES.has(error.code)) unauthorizedHandler(error);
    throw error;
  }
  return data;
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/api/auth/login', { method: 'POST', body, auth: false }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  dashboard: () => request('/api/dashboard'),

  listProjects: (params) => request('/api/projects', { params }),
  getProject: (id) => request(`/api/projects/${id}`),
  createProject: (body) => request('/api/projects', { method: 'POST', body }),
  updateProject: (id, body) => request(`/api/projects/${id}`, { method: 'PUT', body }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),

  listTasks: (params) => request('/api/tasks', { params }),
  createTask: (body) => request('/api/tasks', { method: 'POST', body }),
  updateTask: (id, body) => request(`/api/tasks/${id}`, { method: 'PUT', body }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
};

/** Turns the API's per-field `details` array into { fieldName: message } for forms. */
export function fieldErrors(error) {
  const out = {};
  for (const d of error?.details || []) if (d.field && !out[d.field]) out[d.field] = d.message;
  return out;
}
