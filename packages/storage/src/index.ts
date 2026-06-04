/**
 * @venara/storage — Cloudflare R2 object storage adapter (Brief §4/§10/§16).
 *
 * Source captures, clips, rendered MP4s, and thumbnails. Media is delivered to the
 * frontend via signed URLs directly from R2 — never proxied through the API (Brief §16).
 */
export type { SignedUrlOptions, StorageProvider } from './types';
export { R2Storage, getStorage } from './r2';
export { storageKeys } from './keys';
