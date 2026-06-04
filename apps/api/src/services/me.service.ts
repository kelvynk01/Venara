/**
 * me.service.ts — business logic behind GET /v1/me (Brief §6/§12).
 *
 * Services own orchestration; routes stay thin. On first authenticated call we
 * provision a workspace + owner user (idempotent), pulling the email from Clerk.
 */
import { ensureUserAndWorkspace, getUserByClerkId } from '@venara/db';
import type { MeResponse, UserRole } from '@venara/shared';
import { getClerkUserProfile } from '../lib/clerk';

export async function getMe(clerkId: string): Promise<MeResponse> {
  let user = await getUserByClerkId(clerkId);

  if (!user) {
    const profile = await getClerkUserProfile(clerkId);
    user = await ensureUserAndWorkspace({
      clerkId,
      email: profile.email,
      workspaceName: profile.workspaceName,
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    },
    workspace: {
      id: user.workspace.id,
      name: user.workspace.name,
      planId: user.workspace.planId,
    },
  };
}
