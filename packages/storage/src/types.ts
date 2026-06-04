/**
 * types.ts — the provider-agnostic storage contract (Brief §4).
 * Domain code depends on this interface, not on the R2 SDK.
 */

export interface SignedUrlOptions {
  /** Seconds the signed URL stays valid. Default 3600. */
  expiresInSeconds?: number;
}

export interface StorageProvider {
  /** Upload bytes to `key`, returning the stored key. */
  put(key: string, body: Uint8Array | Buffer, contentType: string): Promise<string>;
  /** Download the raw bytes for `key` (used by workers that need a local copy). */
  get(key: string): Promise<Uint8Array>;
  /** A time-limited GET url for direct browser/playback access. */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  /** A time-limited PUT url for direct uploads, when needed. */
  getSignedUploadUrl(key: string, contentType: string, options?: SignedUrlOptions): Promise<string>;
  /** Remove an object (e.g. on ConnectedApp deletion / retention aging, Brief §18). */
  delete(key: string): Promise<void>;
}
