import { API_URL } from './config';
import { getToken } from './token-storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Laravel validacijske napake: { polje: ['sporočilo', ...] }
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** Status 0 = zahteva ni prišla do strežnika (ni povezave, časovna omejitev). */
export function isNetworkError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 0;
}

/** Sporočilo za uporabnika: prva validacijska napaka ali splošno sporočilo strežnika. */
export function errorMessage(e: unknown, fallback = 'Prišlo je do napake.'): string {
  if (e instanceof ApiError) {
    const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
    return first ?? e.message ?? fallback;
  }
  return fallback;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const TIMEOUT_MS = 15000;

// Seja se registrira tukaj, da ob 401 (preklican/potekel žeton) uporabnika odjavi.
let onUnauthorized: (() => void) | null = null;
// Povezava se registrira tukaj: vsak odgovor strežnika pomeni "dosegljiv", vsaka omrežna napaka "nedosegljiv".
let onReachability: ((reachable: boolean) => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function setReachabilityHandler(handler: ((reachable: boolean) => void) | null) {
  onReachability = handler;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${API_URL}/api${path}`,
      {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      TIMEOUT_MS,
    );
  } catch {
    onReachability?.(false);
    throw new ApiError(0, 'Strežnik ni dosegljiv. Preveri povezavo.');
  }
  onReachability?.(true);

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, data?.message ?? res.statusText, data?.errors);
  }
  return data as T;
}

/** Ali je strežnik dosegljiv (/api/ping). Rezultat sporoči tudi poslušalcu povezave. */
export async function ping(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/api/ping`, { headers: { Accept: 'application/json' } }, 5000);
    onReachability?.(true);
    return res.ok;
  } catch {
    onReachability?.(false);
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
