# Venara

> Paste your app's link. Venara drives the app, films what it sees, and turns it into
> narrated how-to videos and polished marketing videos — then keeps every video current
> automatically as your app changes.

**The authoritative spec is `venara-build-brief.md`** (repo parent). `CLAUDE.md` is the
session operating procedure. Read both before contributing.

---

## Monorepo layout

Plain **npm workspaces** (no Turborepo/Nx). TypeScript only, `strict` everywhere.

```
venara/
├── apps/
│   ├── landing/     Next.js 14 marketing site (public) — apex venara.ai
│   ├── dashboard/   Next.js 14 product app (Clerk-gated) — app.venara.ai
│   ├── api/         Fastify API — thin routes → services
│   └── worker/      BullMQ workers (capture, render, diff, digest…)
├── packages/
│   ├── shared/      Types, Zod schemas, the BRAND constant, design tokens
│   ├── db/          Prisma schema, client, workspace-scoped query helpers
│   ├── agent/       Conversational create agent (planner + tool loop)   [stub]
│   ├── capture/     Browserbase adapter, recorder, snapshotter          [stub]
│   ├── render/      FFmpeg pipeline                                      [stub]
│   ├── llm/         Anthropic client + prompt builders                   [stub]
│   ├── tts/         ElevenLabs adapter (TtsProvider)                     [stub]
│   ├── avatar/      Avatar provider adapter (AvatarProvider)             [stub]
│   ├── storage/     Cloudflare R2 adapter                               [stub]
│   └── staleness/   UI snapshot, diff, affected-video resolver          [stub]
└── docker/          FFmpeg + worker images
```

`[stub]` packages are scaffolded for Phase 1 and filled in during their phase (Brief §19).

## Layering (Brief §6)

`Frontend → API routes → services → domain packages → db/adapters`. Each layer talks only to
the one below it. Routes are thin (Zod validate → authz → call service → shape response).
All long work runs in BullMQ workers — never the LLM or capture/render in a request handler.

---

## Getting started

```bash
# 1. Install (root — npm workspaces hoists everything)
npm install

# 2. Configure env
cp .env.example .env   # then fill in real values

# 3. Generate the Prisma client
npm run db:generate

# 4. Run a Postgres + Redis migration (needs a live DATABASE_URL)
npm run db:migrate

# 5. Run the three apps (separate terminals)
npm run dev:api         # Fastify on :4000  (+ Bull Board at /admin/queues)
npm run dev:worker      # BullMQ workers
npm run dev:dashboard   # Next.js on :3000
```

### Useful scripts (root)

| Script | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run build` | Build every workspace that defines a build script |
| `npm run db:generate` | Prisma client generation |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:studio` | Prisma Studio |

### Environment notes / gotchas

- **Custom root CA / proxy → `unable to verify the first certificate`.** This network uses a
  custom root CA, which breaks tools that fetch over TLS at build time. Prefix the command
  with the system trust store:
  - Prisma: `NODE_OPTIONS="--use-system-ca" npm run db:generate`
  - Next.js builds (`next/font/google` fetches fonts): `NODE_OPTIONS="--use-system-ca" npm run build`
  This only affects this machine; Railway's network builds normally without the flag.
- **Single `ioredis`.** The root `overrides` pin `ioredis` to one version so BullMQ and our
  own connection share a single copy (avoids a TypeScript dual-package clash). `npm ls`
  may print `invalid` because BullMQ pins an exact patch — that's cosmetic; the copy is
  deduped and patch-compatible.

---

## Deployment (Railway)

All compute, DB, and cache run on **Railway** (Brief §4); object storage is **Cloudflare R2**.

| Railway service | Source | Build | Public URL |
|---|---|---|---|
| `landing` | `apps/landing` | Nixpacks (`next build`/`start`) | `venara.ai` (apex) |
| `dashboard` | `apps/dashboard` | Nixpacks (`next build`/`start`) | `app.venara.ai` |
| `api` | `apps/api` | `docker/api.Dockerfile` | `api.venara.ai` |
| `worker` | `apps/worker` | `docker/worker.Dockerfile` (FFmpeg) | — (no ingress) |
| Postgres | Railway add-on | — | → `DATABASE_URL` |
| Redis | Railway add-on | — | → `REDIS_URL` |

- The landing site links to `${NEXT_PUBLIC_APP_URL}` (= `https://app.venara.ai`) for login/signup.
- Media is served to browsers via **signed R2 URLs**, never proxied through `api` (Brief §16).
- Run `prisma migrate deploy` on release (not `migrate dev`); the worker scales independently
  of the api since capture/render are CPU/memory heavy.

---

## Build phases

We follow Brief §19 in order; finish a phase's Done Criteria before the next.

1. **Foundation** ← current — monorepo, schema, auth shell, BullMQ no-op, Bull Board.
2. Connect + capture core
3. Render pipeline
4. The agent (conversational create)
5. Marketing output + publish
6. Staleness engine
7. Billing + plans + limits
8. Polish + craft pass

---

*Venara — venara.ai — Confidential.*
