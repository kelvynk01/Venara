/**
 * @venara/db — Prisma client + workspace-scoped query helpers.
 * The only path to the database (Brief §6). Services import helpers from here, not
 * `@prisma/client` directly.
 */
export { prisma } from './client';
export type { Db } from './client';
export * from './scope';

// Re-export Prisma's generated types + enums so consumers get them from one place.
export {
  Prisma,
  UserRole,
  LoginMode,
  ConnectedAppStatus,
  FlowStatus,
  CaptureStatus,
  VideoType,
  VideoStatus,
  Freshness,
  RenderAspect,
  RenderStatus,
  AgentRequestStatus,
  JobStatus,
  UsageEventKind,
} from '@prisma/client';
export type {
  Workspace,
  User,
  ConnectedApp,
  Flow,
  Capture,
  Video,
  Render,
  UiSnapshot,
  StalenessEvent,
  AgentRequest,
  Job,
  UsageEvent,
} from '@prisma/client';

// Query helpers — the supported call surface for services.
export * from './queries/users';
export * from './queries/jobs';
