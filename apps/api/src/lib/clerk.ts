/**
 * clerk.ts — thin Clerk adapter for the API (Brief §4 auth).
 *
 * Two jobs: verify the Bearer JWT on every request, and look up a user's email when we
 * first provision them. We never store or log the raw token.
 */
import { createClerkClient, verifyToken } from '@clerk/backend';
import { env } from '../env';

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

const authorizedParties = env.CLERK_AUTHORIZED_PARTIES?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Verify a Clerk session JWT and return its `sub` (the Clerk user id). Throws if invalid. */
export async function verifyClerkToken(token: string): Promise<{ clerkId: string }> {
  const payload = await verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY,
    // Pin the authorized party (azp) when configured, so a token minted for a
    // different Clerk app on the same key is rejected.
    ...(authorizedParties && authorizedParties.length > 0 ? { authorizedParties } : {}),
  });
  if (!payload.sub) throw new Error('Token missing subject');
  return { clerkId: payload.sub };
}

/** Fetch a user's primary email + a sensible default workspace name for provisioning. */
export async function getClerkUserProfile(
  clerkId: string,
): Promise<{ email: string; workspaceName: string }> {
  const user = await clerk.users.getUser(clerkId);
  const email =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? '';
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'My';
  return { email, workspaceName: `${displayName}'s workspace` };
}
