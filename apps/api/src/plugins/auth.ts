/**
 * auth.ts — Clerk JWT authentication (Brief §12/§16).
 *
 * Every /v1 route (except webhooks) requires `Authorization: Bearer <clerk_jwt>`. The
 * `authenticate` preHandler verifies the token and attaches `{ clerkId }` to the request.
 * The raw token is never logged. Use `getAuth(req)` inside handlers to read it safely.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyClerkToken } from '../lib/clerk';
import { UnauthorizedError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: { clerkId: string };
  }
}

export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Missing bearer token');
  }
  try {
    req.auth = await verifyClerkToken(token);
  } catch {
    // Never surface verification internals (or the token) to the client or logs.
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/** Read the authenticated identity, asserting the preHandler ran. */
export function getAuth(req: FastifyRequest): { clerkId: string } {
  if (!req.auth) throw new UnauthorizedError();
  return req.auth;
}
