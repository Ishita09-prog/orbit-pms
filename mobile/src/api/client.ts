import { API_URL } from '../config';
import type { AuthResponse, Dashboard, Paginated, Project, ProjectInput, Task, TaskInput, User } from '../types';

const REQUEST_TIMEOUT_MS = 30_000; // free hosting tiers can take a while to wake up

export class ApiError extends Error {
  status: number;
  code: string;
  details?: { field?: string; message: string }[];
  constructor(status: number, code: string, message: string, details?: ApiError['details']) {
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

// The in-memory copy of the token used for requests. The persistent copy is in secure storage.
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

let unauthorizedHandler: (error: ApiError) => void = () => {};
export const onUnauthorized = (fn: (error: ApiError) => void) => {
  unauthorizedHandler = fn;
};

const SESSION_CODES = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED']);

type Params = Record<string, string | number | undefined | null>;

async function request<T>(path: string, opts: { method?: string; body?: unknown; params?: Params; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, params, auth = true } = opts;
  const query = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${API_URL}${path}${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    throw new ApiError(0, 'NETWORK', 'No internet connection. Check your network and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null as T;
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    const error = new ApiError(response.status, data?.error?.code || 'ERROR', data?.error?.message || 'Something went wrong. Please try again.', data?.error?.details);
    if (response.status === 401 && auth && SESSION_CODES.has(error.code)) unauthorizedHandler(error);
    throw error;
  }
  return data as T;
}

export const api = {
  register: (body: { fullName: string; email: string; password: string }) => request<AuthResponse>('/api/auth/register', { method: 'POST', body, auth: false }),
  login: (body: { email: string; password: string }) => request<AuthResponse>('/api/auth/login', { method: 'POST', body, auth: false }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),

  dashboard: async () => (await request<{ data: Dashboard }>('/api/dashboard')).data,

  listProjects: (params?: Params) => request<Paginated<Project>>('/api/projects', { params }),
  getProject: async (id: string) => (await request<{ data: Project }>(`/api/projects/${id}`)).data,

  createProject: async (body: ProjectInput) => (await request<{ data: Project }>('/api/projects', { method: 'POST', body })).data,
  updateProject: async (id: string, body: Partial<ProjectInput>) => (await request<{ data: Project }>(`/api/projects/${id}`, { method: 'PUT', body })).data,
  deleteProject: (id: string) => request<null>(`/api/projects/${id}`, { method: 'DELETE' }),

  listTasks: (params?: Params) => request<Paginated<Task>>('/api/tasks', { params }),
  createTask: async (body: TaskInput & { projectId: string }) => (await request<{ data: Task }>('/api/tasks', { method: 'POST', body })).data,
  updateTask: async (id: string, body: Partial<TaskInput>) => (await request<{ data: Task }>(`/api/tasks/${id}`, { method: 'PUT', body })).data,
  deleteTask: (id: string) => request<null>(`/api/tasks/${id}`, { method: 'DELETE' }),
};

export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of (error as ApiError)?.details || []) if (d.field && !out[d.field]) out[d.field] = d.message;
  return out;
}
