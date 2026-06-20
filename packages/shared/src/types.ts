/**
 * types.ts — domain enums and shared types mirroring the data model (Brief §7)
 * and the capture tool set (Brief §8). These are the vocabulary every package and
 * app agrees on. Keep in lockstep with the Prisma schema in packages/db.
 */

/** User role within a workspace (Brief §7). */
export type UserRole = 'owner' | 'member';

/**
 * How a connected app authenticates during capture (Brief §7/§8, ADR-001).
 * `none`: public app, no login. `session`: the user signed into their own app via the
 * interactive handoff and Venara holds an authenticated browser session, never a password.
 */
export type LoginMode = 'none' | 'session';

/** Lifecycle of a captured auth session (loginMode=session, ADR-001). */
export type SessionStatus = 'active' | 'expired';

/** Lifecycle of a connected app. */
export type ConnectedAppStatus = 'connected' | 'error' | 'disabled';

/** A discovered or requested journey through the app. */
export type FlowStatus = 'discovered' | 'requested' | 'ready' | 'archived';

/** A single recording run (Brief §7). */
export type CaptureStatus = 'queued' | 'capturing' | 'done' | 'failed';

/** The two kinds of output, from the same footage (Brief §1/§7). */
export type VideoType = 'howto' | 'marketing';

/** Lifecycle of a Video row. */
export type VideoStatus = 'draft' | 'ready' | 'failed';

/** Lifecycle of a Render row. */
export type RenderStatus = 'queued' | 'rendering' | 'done' | 'failed';

/** Lifecycle of the Job mirror row (Brief §7/§13). */
export type JobStatus = 'queued' | 'active' | 'completed' | 'failed';

/** Whether a video matches the current live app (Brief §11/§15). */
export type Freshness = 'live' | 'stale';

/** Export aspect ratios (Brief §7/§10). */
export type RenderAspect = '16:9' | '9:16' | '1:1';

/** Lifecycle of a conversational create request (Brief §7/§9). */
export type AgentRequestStatus =
  | 'planning'
  | 'capturing'
  | 'rendering'
  | 'done'
  | 'failed'
  | 'needs_input';

/** Metered usage kinds for plan enforcement + billing (Brief §7/§18). */
export type UsageEventKind = 'capture_minutes' | 'agent_run' | 'render' | 'regenerate';

/**
 * The capture tool set — the ONLY verbs the agent may emit (Brief §8).
 * Targets resolve by accessible role/label first, visible text second, CSS last.
 */
export type CaptureToolName =
  | 'navigate'
  | 'click'
  | 'type'
  | 'press'
  | 'scroll'
  | 'wait'
  | 'hover'
  | 'screenshot'
  | 'assert'
  | 'markBeat';

/** Output type the conversational agent resolves a request into (Brief §9). */
export interface AgentIntent {
  goal: string;
  outputType: VideoType;
  targetFeature: string;
  constraints: {
    lengthSeconds?: number;
    aspect?: RenderAspect;
    tone?: string;
  };
  needsConfirmation: boolean;
}

/** A user + their workspace + plan — shape returned by GET /v1/me (Brief §12). */
export interface MeResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  workspace: {
    id: string;
    name: string;
    planId: string;
  };
}
