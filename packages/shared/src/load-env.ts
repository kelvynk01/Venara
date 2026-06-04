/**
 * load-env.ts — minimal, dependency-free .env loader for the Node apps (api, worker).
 *
 * Next.js loads .env / .env.local itself, but tsx-run apps don't — so api/worker call
 * this at the top of their env module. Precedence (highest → lowest):
 *   real process.env  >  .env.local (your secrets)  >  .env (local infra defaults)
 *
 * Blank values are ignored so an empty key in .env.local falls back to .env. Never
 * overrides a value already set in the real environment.
 *
 * NOT exported from the package index (it imports node:fs) — import it via the
 * `@venara/shared/load-env` subpath so it never reaches a browser bundle.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function repoRoot(): string {
  // This file lives at packages/shared/src/load-env.ts → repo root is three up.
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
}

function applyFile(path: string): void {
  if (!existsSync(path)) return;
  const contents = readFileSync(path, 'utf8');
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === '') continue; // blank → let a lower-precedence file fill it
    if (process.env[key] === undefined) process.env[key] = value; // never override real env
  }
}

/** Load .env.local then .env from the repo root into process.env (idempotent-ish). */
export function loadEnvFiles(): void {
  const root = repoRoot();
  applyFile(resolve(root, '.env.local')); // your real secrets win over .env
  applyFile(resolve(root, '.env')); // local infra defaults fill the rest
}
