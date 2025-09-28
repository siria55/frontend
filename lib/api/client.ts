const DEFAULT_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const buildUrl = (path: string, baseUrl: string = DEFAULT_BASE_URL) => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with '/' - received "${path}"`);
  }
  const url = new URL(path, baseUrl);
  return url.toString();
};

const parseJson = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return undefined;
};

interface RequestOptions extends RequestInit {
  baseUrl?: string;
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { baseUrl, headers, ...rest } = init;
  const url = buildUrl(path, baseUrl);

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    }
  });

  if (!response.ok) {
    let message = `request failed: ${response.status}`;
    let detail: unknown;
    try {
      detail = await parseJson(response);
      if (detail && typeof detail === 'object' && 'error' in detail && typeof (detail as any).error === 'string') {
        message = (detail as any).error;
      }
    } catch {
      // ignore JSON parse errors for failure path
    }
    throw new ApiError(message, response.status, detail);
  }

  return (await parseJson(response)) as T;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestOptions) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { ...init, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, init?: RequestOptions) => request<T>(path, { ...init, method: 'DELETE' }),
  buildWsUrl: (path: string, baseUrl: string = DEFAULT_BASE_URL) => {
    if (!path.startsWith('/')) {
      throw new Error(`WebSocket path must start with '/' - received "${path}"`);
    }
    const url = new URL(path, baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }
};

export type { RequestOptions as ApiRequestOptions };
