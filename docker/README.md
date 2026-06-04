# Docker images

Build images from the **repo root** so the whole npm workspace is in context.

```bash
docker build -f docker/api.Dockerfile    -t venara-api    .
docker build -f docker/worker.Dockerfile -t venara-worker .
```

- **api.Dockerfile** — Fastify API (`apps/api`).
- **worker.Dockerfile** — BullMQ workers (`apps/worker`), with **FFmpeg** installed for the
  render pipeline (Brief §10/§13).

The dashboard (`apps/dashboard`) deploys on Railway via Nixpacks (`next build` / `next start`),
so it has no Dockerfile here.

All images read configuration from environment variables only (Brief §17); see `.env.example`.
