# Venara dashboard (apps/dashboard). Build context = repo root so the workspace
# packages resolve: `docker build -f docker/dashboard.Dockerfile .`
# On Railway, set this service's Dockerfile path to docker/dashboard.Dockerfile.
FROM node:20-slim AS build
WORKDIR /app

COPY . .
RUN npm ci

# NEXT_PUBLIC_* must exist at BUILD time — Next.js inlines them into the client bundle.
# Railway passes matching service variables as build args when these ARGs are declared.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_SENTRY_DSN

RUN npm run build --workspace @venara/dashboard

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@venara/dashboard"]
