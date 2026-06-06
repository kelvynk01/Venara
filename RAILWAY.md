# Deploying Venara on Railway

The whole stack runs on **Railway** (Brief §4): 4 app services + managed Postgres + Redis,
all from this one GitHub repo (`kelvynk01/Venara`). Object storage is **Cloudflare R2**.

```
Railway project "Venara"
├── landing     apps/landing    (Dockerfile docker/landing.Dockerfile)    → venara.ai
├── dashboard   apps/dashboard  (Dockerfile docker/dashboard.Dockerfile)  → app.venara.ai
├── api         apps/api        (Dockerfile docker/api.Dockerfile)        → api.venara.ai
├── worker      apps/worker     (Dockerfile docker/worker.Dockerfile)     → (no domain)
├── Postgres    (add-on)
└── Redis       (add-on)
```

Each app builds from the **repo root** (so workspace packages resolve) using its Dockerfile.

---

## 0. Prerequisites
- Code pushed to GitHub (`kelvynk01/Venara`, branch `main`).
- A 32-byte base64 key for production credential encryption:
  `openssl rand -base64 32` → use as `CREDENTIALS_ENCRYPTION_KEY` (use a **fresh** one for prod,
  not the local-dev key).

---

## 1. Create the project + databases
1. **railway.com → New Project**.
2. **+ New → Database → Add PostgreSQL**.
3. **+ New → Database → Add Redis**.

Railway exposes each as reference variables you'll wire into the app services below — use the
**internal** ones (`${{Postgres.DATABASE_URL}}`, `${{Redis.REDIS_URL}}`) for service-to-service
traffic (free, fast). The *public* `*.proxy.rlwy.net` URLs are only for connecting from your laptop.

---

## 2. Create the 4 app services (all from this repo)
For each: **+ New → GitHub Repo → kelvynk01/Venara**, then **Settings**:

| Service | Settings → Build → Dockerfile Path | Notes |
|---|---|---|
| `api` | `docker/api.Dockerfile` | Healthcheck path `/health` |
| `worker` | `docker/worker.Dockerfile` | No public networking; includes FFmpeg + fonts |
| `dashboard` | `docker/dashboard.Dockerfile` | Next.js |
| `landing` | `docker/landing.Dockerfile` | Next.js |

Leave **Root Directory** empty (the Dockerfiles build from repo root). Set **Watch Paths** to the
whole repo or leave default. Add domains in step 5.

> **Next.js build args:** `NEXT_PUBLIC_*` vars are inlined at *build* time. Railway passes a
> service variable as a Docker build arg automatically when the Dockerfile declares the matching
> `ARG` (it does). So just set the `NEXT_PUBLIC_*` variables on the dashboard/landing services
> (step 3) and rebuilds pick them up.

---

## 3. Environment variables (per service)
Set these in each service's **Variables** tab. `${{...}}` are Railway reference variables.

### `api`
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
API_CORS_ORIGINS=https://app.venara.ai
CLERK_SECRET_KEY=sk_live_...
CLERK_AUTHORIZED_PARTIES=https://app.venara.ai
CREDENTIALS_ENCRYPTION_KEY=<openssl rand -base64 32>
BULL_BOARD_USER=admin
BULL_BOARD_PASSWORD=<strong password>
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=venara-media
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
SENTRY_DSN=          # optional
```

### `worker`
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CREDENTIALS_ENCRYPTION_KEY=<same value as api>
ANTHROPIC_API_KEY=sk-ant-...
BROWSERBASE_API_KEY=...
BROWSERBASE_PROJECT_ID=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=venara-media
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
WORKER_CONCURRENCY=5
SENTRY_DSN=          # optional
```
> `CREDENTIALS_ENCRYPTION_KEY` MUST be byte-identical on `api` and `worker` (api encrypts, worker
> decrypts the same secrets).

### `dashboard`
```
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.venara.ai
NEXT_PUBLIC_APP_URL=https://app.venara.ai
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...          # Clerk middleware needs this at runtime
NEXT_PUBLIC_POSTHOG_KEY=              # optional
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=               # optional
SENTRY_ENVIRONMENT=production
```

### `landing`
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.venara.ai
```

---

## 4. Run the database migration (once, and on schema changes)
The first migration must be created from a machine with the DB URL. Easiest:

```bash
# from your laptop, against the Railway Postgres PUBLIC url:
DATABASE_URL="<DATABASE_PUBLIC_URL>" npx prisma migrate dev --name init --schema packages/db/prisma/schema.prisma
git add packages/db/prisma/migrations && git commit -m "First Prisma migration" && git push
```

Then on every deploy, apply migrations with **`npx prisma migrate deploy`**. Wire it as the api
service's pre-start (or run it as a Railway one-off command) so prod tables stay in sync. (Do NOT
run `migrate dev` in production.)

---

## 5. Custom domains
Each service → **Settings → Networking → Custom Domain**, then add the CNAME Railway shows at your
DNS provider:
- `landing` → **venara.ai** (apex; Railway gives an ALIAS/CNAME target)
- `dashboard` → **app.venara.ai**
- `api` → **api.venara.ai**

After DNS resolves, the `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_APP_URL` / `API_CORS_ORIGINS`
values above line up.

---

## 6. Deploy order
1. Postgres + Redis (step 1).
2. Run the migration (step 4) so tables exist.
3. Deploy `api` + `worker` (they connect to DB/Redis on boot).
4. Deploy `dashboard` + `landing`.
5. Add domains; redeploy the Next apps if you changed a `NEXT_PUBLIC_*` value (build-time).

---

## Local testing without deploying
You can run the apps on your laptop against Railway's **public** Postgres/Redis URLs — put those
+ Clerk keys in `.env.local`, then `npm run db:migrate` and `npm run dev:api` / `dev:worker` /
`dev:dashboard`. See `README.md` → Environment notes.
