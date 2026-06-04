# Venara worker image. Includes FFmpeg for the render pipeline (Brief §10/§13).
# Build context = repo root: `docker build -f docker/worker.Dockerfile .`
FROM node:20-slim AS base
WORKDIR /app

# FFmpeg + DejaVu fonts are required by the render workers.
# fonts-dejavu-core provides DejaVuSans-Bold.ttf used by the FFmpeg drawtext filter.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npm ci
RUN npm run db:generate

ENV NODE_ENV=production
CMD ["npm", "run", "start", "--workspace", "@venara/worker"]
