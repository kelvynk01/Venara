/**
 * secrets.ts — encrypted secret store for connected-app credentials (Brief §17).
 *
 * Connected-app login values are NEVER stored as plaintext. We AES-256-GCM encrypt them
 * with a key from `CREDENTIALS_ENCRYPTION_KEY` and persist only the ciphertext in the
 * Secret table; `ConnectedApp.credentialsRef` holds the Secret.id. Plaintext exists only
 * transiently in worker memory during a capture login, and is never logged or returned.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { prisma } from './client';
import type { WorkspaceScope } from './scope';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

let cachedKey: Buffer | undefined;

/** Resolve and validate the 32-byte encryption key (base64) lazily + cached, so import never throws. */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt secrets.');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  cachedKey = key;
  return key;
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`;
}

function decrypt(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Malformed secret payload.');
  const [ivB64, tagB64, ctB64] = parts as [string, string, string];
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Encrypt and persist a secret value; returns the reference (Secret.id) to store. */
export async function storeSecret(scope: WorkspaceScope, value: string): Promise<string> {
  const secret = await prisma.secret.create({
    data: { workspaceId: scope.workspaceId, ciphertext: encrypt(value) },
    select: { id: true },
  });
  return secret.id;
}

/** Resolve a secret reference back to plaintext (worker-side, in memory only). */
export async function resolveSecret(scope: WorkspaceScope, ref: string): Promise<string | null> {
  const secret = await prisma.secret.findFirst({
    where: { id: ref, workspaceId: scope.workspaceId },
    select: { ciphertext: true },
  });
  return secret ? decrypt(secret.ciphertext) : null;
}

/** Permanently delete a secret (e.g. when a connected app is removed, Brief §18). */
export async function deleteSecret(scope: WorkspaceScope, ref: string): Promise<void> {
  await prisma.secret.deleteMany({ where: { id: ref, workspaceId: scope.workspaceId } });
}

/**
 * A connected app's authenticated session (ADR-001) is stored as a JSON `storageState`
 * (cookies + per-origin localStorage) under one encrypted secret — never a password.
 */
export interface StoredSessionState {
  cookies: unknown[];
  origins: unknown[];
}

export function serializeSessionState(state: StoredSessionState): string {
  return JSON.stringify(state);
}

/**
 * Parse a decrypted, stored session. Throws a SAFE error (never echoing the value) on
 * corrupt input or the wrong encryption key — callers treat this as "needs re-auth".
 */
export function parseSessionState(plaintext: string): StoredSessionState {
  try {
    const v = JSON.parse(plaintext) as { cookies?: unknown; origins?: unknown };
    if (!Array.isArray(v.cookies) || !Array.isArray(v.origins)) {
      throw new Error('unexpected shape');
    }
    return { cookies: v.cookies, origins: v.origins };
  } catch {
    throw new Error('Failed to parse stored session — possible key mismatch or corruption.');
  }
}
