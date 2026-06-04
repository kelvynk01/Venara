/**
 * workspace.ts — resolve the authenticated caller's tenant scope (Brief §7/§17).
 * Turns the verified Clerk identity into a WorkspaceScope every service is scoped by.
 */
import { getUserByClerkId, type WorkspaceScope } from '@venara/db';
import type { FastifyRequest } from 'fastify';
import { getAuth } from '../plugins/auth';
import { NotFoundError } from './errors';

export interface AuthedScope extends WorkspaceScope {
  userId: string;
}

export async function getScope(req: FastifyRequest): Promise<AuthedScope> {
  const { clerkId } = getAuth(req);
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    // The dashboard provisions the user on first /v1/me; this guards direct API calls.
    throw new NotFoundError('User has not been provisioned. Load the app first.');
  }
  return { workspaceId: user.workspaceId, userId: user.id };
}
