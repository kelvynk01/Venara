/**
 * api.ts — typed fetch helper for the Fastify API (Brief §16).
 *
 * Every authenticated call carries a fresh Clerk JWT via `Authorization: Bearer`. The
 * token is fetched per request (never cached in frontend state) and passed in by the
 * caller, which holds the Clerk `getToken()` from `useAuth()`.
 */
import type { ApiError } from '@venara/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  // Only declare a JSON content-type when we actually send a body — Fastify rejects a
  // POST that advertises application/json with an empty body (e.g. body-less action calls).
  const hasBody = init?.body != null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let code = 'request_failed';
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as ApiError;
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // non-JSON error body; keep defaults
    }
    throw new ApiRequestError(res.status, code, message);
  }

  return res.json() as Promise<T>;
}
