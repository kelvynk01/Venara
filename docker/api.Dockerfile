# Venara API image. Build context = repo root: `docker build -f docker/api.Dockerfile .`
FROM node:20-slim AS base
WORKDIR /app

# Install workspace deps (lockfile copied with the full context for simplicity).
COPY . .
RUN npm ci

# Generate the Prisma client into node_modules.
RUN npm run db:generate

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@venara/api"]
