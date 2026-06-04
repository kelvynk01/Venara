/**
 * @venara/avatar — presenter avatar adapter (HeyGen-class), behind `AvatarProvider` (Brief §4/§10).
 *
 * Optional intro/outro presenter for marketing renders. Pro-tier feature.
 *
 * Phase 1: contract only. Implementation lands in the marketing-output phase (Brief §19, Phase 5).
 */

import type { RenderAspect } from '@venara/shared';

export interface AvatarClipOptions {
  /** Provider avatar/persona id. */
  avatarId?: string;
  /** Aspect ratio of the produced clip. */
  aspect?: RenderAspect;
}

export interface AvatarClipResult {
  /** Storage key of the produced avatar clip. */
  videoKey: string;
  durationMs: number;
}

/** Presenter-avatar contract; the avatar provider adapter implements this (Brief §4). */
export interface AvatarProvider {
  /** Render a talking-head clip from script text. */
  renderClip(script: string, options?: AvatarClipOptions): Promise<AvatarClipResult>;
}
