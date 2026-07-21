# --- builder ---
FROM public.ecr.aws/docker/library/node:24-alpine AS builder
WORKDIR /repo

# Copy root manifests + workspace manifests for cached install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY server/package.json ./server/
COPY app/mweb/package.json ./app/mweb/
COPY portals/admin/package.json ./portals/admin/
COPY website/main-website/package.json ./website/main-website/
COPY portals/partners-app/package.json ./portals/partners-app/
COPY website/partners-website/package.json ./website/partners-website/
COPY portals/ads-portal/package.json ./portals/ads-portal/
COPY website/ads-website/package.json ./website/ads-website/
COPY portals/crm/package.json ./portals/crm/
COPY portals/finance/package.json ./portals/finance/
COPY portals/tech/package.json ./portals/tech/
COPY portals/support/package.json ./portals/support/
COPY portals/website-app/package.json ./portals/website-app/
COPY portals/legal/package.json ./portals/legal/
COPY portals/ai/package.json ./portals/ai/
COPY portals/products/package.json ./portals/products/
COPY portals/marketing/package.json ./portals/marketing/
COPY portals/onboarding/package.json ./portals/onboarding/
COPY portals/hr/package.json ./portals/hr/
COPY portals/employee/package.json ./portals/employee/
COPY website/status-website/package.json ./website/status-website/
COPY portals/challenge-portal/package.json ./portals/challenge-portal/
COPY portals/developers/package.json ./portals/developers/
COPY website/earnwith-website/package.json ./website/earnwith-website/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

# Copy source and build server
COPY server ./server
RUN pnpm --filter server build

# --- runner ---
FROM public.ecr.aws/docker/library/node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Video compression (fluent-ffmpeg): the ffmpeg-static npm binary is glibc and
# cannot run on this musl (alpine) image, so the real encoder comes from apk and
# the service resolves it via FFMPEG_PATH (ffmpeg-static stays the local-dev path).
RUN apk add --no-cache ffmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY --from=builder /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/server/package.json ./server/
COPY --from=builder /repo/app/mweb/package.json ./app/mweb/
COPY --from=builder /repo/portals/admin/package.json ./portals/admin/
COPY --from=builder /repo/website/main-website/package.json ./website/main-website/
COPY --from=builder /repo/portals/partners-app/package.json ./portals/partners-app/
COPY --from=builder /repo/website/partners-website/package.json ./website/partners-website/
COPY --from=builder /repo/portals/ads-portal/package.json ./portals/ads-portal/
COPY --from=builder /repo/website/ads-website/package.json ./website/ads-website/
COPY --from=builder /repo/portals/crm/package.json ./portals/crm/
COPY --from=builder /repo/portals/finance/package.json ./portals/finance/
COPY --from=builder /repo/portals/tech/package.json ./portals/tech/
COPY --from=builder /repo/portals/support/package.json ./portals/support/
COPY --from=builder /repo/portals/website-app/package.json ./portals/website-app/
COPY --from=builder /repo/portals/legal/package.json ./portals/legal/
COPY --from=builder /repo/portals/ai/package.json ./portals/ai/
COPY --from=builder /repo/portals/products/package.json ./portals/products/
COPY --from=builder /repo/portals/marketing/package.json ./portals/marketing/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
    && pnpm install --prod --frozen-lockfile --filter server

COPY --from=builder /repo/server/dist ./server/dist

ENV PORT=2001
EXPOSE 2001
WORKDIR /app/server

# Runs as root deliberately (Sonar docker:S6471 reviewed, not ignored).
# deploy/docker-compose.yml bind-mounts /var/run/docker.sock:ro so the Tech
# portal's Server > Docker page (techDockerInfo, gated to SUPER_ADMIN/
# TECH_MANAGER) can list host containers. That socket is root:docker on the
# host, so an unprivileged `node` user cannot read it and the feature breaks —
# verified before reverting a USER node attempt. Dropping root here therefore
# requires either removing that mount or matching the host's docker GID, which
# is a deployment change, not a Dockerfile one.
CMD ["node", "-r", "./dist/tracing.js", "dist/index.js"]
