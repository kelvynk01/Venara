# Venara marketing site (apps/landing). Build context = repo root.
#   docker build -f docker/landing.Dockerfile .
# On Railway, set this service's Dockerfile path to docker/landing.Dockerfile.
FROM node:20-slim AS build
WORKDIR /app

COPY . .
RUN npm ci

# The landing site links to the product app; this is inlined at build time.
ARG NEXT_PUBLIC_APP_URL

RUN npm run build --workspace @venara/landing

ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "@venara/landing"]
