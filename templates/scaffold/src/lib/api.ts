const BASE = '/api';

export class ApiRequestError extends Error {
  status?: number;
  statusText?: string;
  method: string;
  url: string;
  requestBody?: unknown;
  responseBody?: unknown;
  rawResponseBody?: string;
  isNetworkError?: boolean;
  causeData?: unknown;

  constructor(
    message: string,
    details: {
      status?: number;
      statusText?: string;
      method: string;
      url: string;
      requestBody?: unknown;
      responseBody?: unknown;
      rawResponseBody?: string;
      isNetworkError?: boolean;
      causeData?: unknown;
    },
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = details.status;
    this.statusText = details.statusText;
    this.method = details.method;
    this.url = details.url;
    this.requestBody = details.requestBody;
    this.responseBody = details.responseBody;
    this.rawResponseBody = details.rawResponseBody;
    this.isNetworkError = details.isNetworkError;
    this.causeData = details.causeData;
  }
}

function tryParseJSON(body: string): unknown {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  const url = `${BASE}${path}`;
  const requestBody = options?.body;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });
  } catch (error) {
    throw new ApiRequestError('Error de red al llamar al API', {
      method,
      url,
      requestBody,
      isNetworkError: true,
      causeData: error,
    });
  }

  const rawBody = await res.text();
  const parsedBody = tryParseJSON(rawBody);

  if (!res.ok) {
    const responseError =
      parsedBody &&
      typeof parsedBody === 'object' &&
      'error' in parsedBody &&
      typeof (parsedBody as { error?: unknown }).error === 'string'
        ? (parsedBody as { error: string }).error
        : `HTTP ${res.status}`;
    throw new ApiRequestError(responseError, {
      status: res.status,
      statusText: res.statusText,
      method,
      url,
      requestBody,
      responseBody: parsedBody,
      rawResponseBody: rawBody,
    });
  }

  if (!rawBody) {
    return undefined as T;
  }

  if (parsedBody === undefined) {
    throw new ApiRequestError('La respuesta del servidor no es JSON válido', {
      status: res.status,
      statusText: res.statusText,
      method,
      url,
      requestBody,
      rawResponseBody: rawBody,
    });
  }

  return parsedBody as T;
}

export const api = {
  auth: {
    google: (idToken: string) => request<{ user: { id: number; email: string; name: string }; permissions: string[] }>('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
    me: () => request<{ user: { id: number; email: string }; permissions: string[] }>('/auth/me'),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  admin: {
    listUsers: () => request<unknown[]>('/admin/users'),
    patchUser: (id: number, body: { active?: boolean; roleIds?: number[] }) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    listRoles: () => request<unknown[]>('/admin/roles'),
    createRole: (body: { name: string; description: string; permissionCodes: string[] }) => request('/admin/roles', { method: 'POST', body: JSON.stringify(body) }),
    updateRole: (id: number, body: { name?: string; description?: string; permissionCodes?: string[] }) => request(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteRole: (id: number) => request<void>(`/admin/roles/${id}`, { method: 'DELETE' }),
    listPermissions: () => request<{ code: string; description: string }[]>('/admin/permissions'),
  },
  {{EXAMPLE_MODULE_NAME}}: {
    list: () => request<unknown[]>('/{{EXAMPLE_MODULE_PATH}}'),
    create: (body: { title: string; description: string }) => request('/{{EXAMPLE_MODULE_PATH}}', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request(`/{{EXAMPLE_MODULE_PATH}}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: number) => request(`/{{EXAMPLE_MODULE_PATH}}/${id}`, { method: 'DELETE' }),
  },
  diagnostics: {
    check: () => request<{ status: 'ok' | 'error'; database?: { now: string; version: string }; message?: string }>('/diagnostics'),
  },
};
