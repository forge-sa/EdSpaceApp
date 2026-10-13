/**
 * The EdSpace server. Override with EXPO_PUBLIC_API_URL (e.g. in .env.local)
 * to point the app at a local server.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://edville.space').replace(/\/+$/, '');

/** Uploads come back as "/uploads/…" paths on the API host. */
export const mediaUrl = (path: string | null | undefined) =>
  !path ? null : /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;

/** Public website link for sharing, e.g. webUrl('/post/12'). */
export const webUrl = (path: string) => `${API_URL}${path}`;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
interface Options {
  method?: Method;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

let signedOutHandler: (() => void) | null = null;
/** Called on any 401, i.e. when the session has expired or was revoked. */
export function onSignedOut(fn: (() => void) | null) {
  signedOutHandler = fn;
}

/**
 * Calls the EdSpace API. The session lives in the server's httpOnly cookie,
 * which the native networking layer stores and sends like a browser would.
 * Mutating requests carry the x-edspace header the server's CSRF check expects.
 */
export async function api<T = unknown>(path: string, { method = 'GET', body, form, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (method !== 'GET') headers['x-edspace'] = '1';
  if (body !== undefined) headers['content-type'] = 'application/json';

  // Uploads can be slow on mobile data; everything else should be quick.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), form ? 120_000 : 30_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (__DEV__) console.warn(`[api] ${method} ${path} failed:`, err);
    if (controller.signal.aborted) throw new ApiError('EdSpace is taking too long to answer. Try again.', 0, 'timeout');
    throw new ApiError("Can't reach EdSpace. Check your connection.", 0, 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) signedOutHandler?.();
    throw new ApiError(data.error || 'Something went wrong', res.status, data.code);
  }
  return data as T;
}

export const post = <T = unknown>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body ?? {} });
export const del = <T = unknown>(path: string, body?: unknown) => api<T>(path, { method: 'DELETE', body });
export const patch = <T = unknown>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body });

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
