/**
 * queries/users.ts — user + workspace lookups.
 */
import { prisma } from '../client';

/**
 * Resolve the user (with their workspace) from a Clerk subject id. Backs GET /v1/me
 * (Brief §12). Returns null if the user has not been provisioned yet.
 */
export function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: { workspace: true },
  });
}

/**
 * Idempotently provision a workspace + owner user for a freshly-authenticated Clerk
 * subject. Used on first sign-in (and by the Clerk webhook later). Atomic via upsert on
 * the unique `clerkId`, so concurrent first-sign-in requests can't race into a duplicate
 * (the `create` branch runs at most once at the DB level; the other becomes a no-op update).
 */
export async function ensureUserAndWorkspace(params: {
  clerkId: string;
  email: string;
  workspaceName: string;
}) {
  return prisma.user.upsert({
    where: { clerkId: params.clerkId },
    update: {},
    create: {
      clerkId: params.clerkId,
      email: params.email,
      role: 'owner',
      workspace: { create: { name: params.workspaceName } },
    },
    include: { workspace: true },
  });
}
