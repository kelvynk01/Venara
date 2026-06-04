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
│   ├── dashboard/   Next.js 14 (App Router) frontend
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

- **Prisma engine download behind a proxy.** If `prisma generate` fails with
  `unable to verify the first certificate`, your network uses a custom root CA. Run it
  with the system trust store: `NODE_OPTIONS="--use-system-ca" npm run db:generate`.
- **Single `ioredis`.** The root `overrides` pin `ioredis` to one version so BullMQ and our
  own connection share a single copy (avoids a TypeScript dual-package clash). `npm ls`
  may print `invalid` because BullMQ pins an exact patch — that's cosmetic; the copy is
  deduped and patch-compatible.

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
