/**
 * @venara/storage — Cloudflare R2 object storage adapter (Brief §4/§10/§16).
 *
 * Source captures, clips, rendered MP4s, and thumbnails. Media is delivered to the
 * frontend via signed URLs directly from R2 — never proxied through the API (Brief §16).
 *
 * Phase 1: contract only. The R2 implementation lands with the capture/render phases.
 */

/** Where an object lives + how long a signed link should last. */
export interface SignedUrlOptions {
  /** Seconds the signed URL stays valid. */
  expiresInSeconds?: number;
}

/** Thin storage contract; the R2 implementation sits behind this (Brief §4). */
export interface StorageProvider {
  /** Upload bytes to `key`, returning the stored key. */
  put(key: string, body: Uint8Array | Buffer, contentType: string): Promise<string>;
  /** A time-limited GET url for direct browser/playback access. */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  /** A time-limited PUT url for direct uploads, when needed. */
  getSignedUploadUrl(key: string, contentType: string, options?: SignedUrlOptions): Promise<string>;
  /** Remove an object (e.g. on ConnectedApp deletion / retention aging, Brief §18). */
  delete(key: string): Promise<void>;
}
