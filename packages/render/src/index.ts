/**
 * @venara/render — the FFmpeg render pipeline (Brief §10).
 *
 * Input: a raw capture + marked beats + a generated script. Output: rendered MP4(s) +
 * thumbnail + captions. Two paths: how-to (callouts + VO + captions, 16:9 primary) and
 * marketing (tight cut, hook, optional avatar, 9:16 primary).
 *
 * Phase 1: contract only. The how-to pipeline lands in Phase 3, marketing in Phase 5.
 */
import type { RenderAspect, VideoType } from '@venara/shared';

export interface RenderRequest {
  type: VideoType;
  rawVideoKey: string;
  aspect: RenderAspect;
  /** Marked beats (from `markBeat`) used for callouts + caption timing (Brief §8/§10). */
  beats?: { label: string; atMs: number }[];
  /** Narration (how-to) or hook+CTA copy (marketing). */
  scriptJson?: unknown;
}

export interface RenderResult {
  mp4Key: string;
  thumbKey: string;
  captionsKey: string;
  durationMs: number;
}
