/**
 * scope.ts — tenant-isolation primitives (Brief §7/§17).
 *
 * Every user-data query MUST be scoped by `workspaceId`. A query that can't be
 * scoped is a bug, not an exception. Query helpers take a `WorkspaceScope` so the
 * scoping is explicit and impossible to forget at the call site.
 */

/** An authenticated caller's tenant boundary. Pass this into every scoped helper. */
export interface WorkspaceScope {
  workspaceId: string;
}

/** Narrow an unknown/optional id into a WorkspaceScope, throwing if absent. */
export function requireScope(workspaceId: string | null | undefined): WorkspaceScope {
  if (!workspaceId) {
    throw new Error('Missing workspaceId — every tenant query must be workspace-scoped.');
  }
  return { workspaceId };
}
