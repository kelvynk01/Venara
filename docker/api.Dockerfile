# Venara API image. Build context = repo root: `docker build -f docker/api.Dockerfile .`
FROM node:20-slim AS base
WORKDIR /app

# Prisma's query engine needs libssl/openssl present (Debian 12 / OpenSSL 3.x).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install workspace deps (lockfile copied with the full context for simplicity).
COPY . .
RUN npm ci

# Generate the Prisma client into node_modules.
RUN npm run db:generate

ENV NODE_ENV=production
EXPOSE 4000
# Apply any pending migrations (idempotent), then start. The api is the single migrator
# for the stack (workers never migrate) to avoid concurrent-migration races.
CMD ["sh", "-c", "npm run migrate:deploy --workspace @venara/db && npm run start --workspace @venara/api"]
