# --- builder ---
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /repo

# Copy root manifests + workspace manifests for cached install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY server/package.json ./server/
COPY mweb-app/package.json ./mweb-app/
COPY admin/package.json ./admin/
COPY website/package.json ./website/
COPY partners/partners-app/package.json ./partners/partners-app/
COPY partners/partners-website/package.json ./partners/partners-website/
COPY ads/package.json ./ads/
COPY crm/package.json ./crm/
COPY track/package.json ./track/
COPY tech/package.json ./tech/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

# Copy source and build server
COPY server ./server
RUN pnpm --filter server build

# --- runner ---
FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/server/package.json ./server/
COPY --from=builder /repo/mweb-app/package.json ./mweb-app/
COPY --from=builder /repo/admin/package.json ./admin/
COPY --from=builder /repo/website/package.json ./website/
COPY --from=builder /repo/partners/partners-app/package.json ./partners/partners-app/
COPY --from=builder /repo/partners/partners-website/package.json ./partners/partners-website/
COPY --from=builder /repo/ads/package.json ./ads/
COPY --from=builder /repo/crm/package.json ./crm/
COPY --from=builder /repo/track/package.json ./track/
COPY --from=builder /repo/tech/package.json ./tech/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --prod --frozen-lockfile --filter server

COPY --from=builder /repo/server/dist ./server/dist

ENV PORT=2001
EXPOSE 2001
WORKDIR /app/server
CMD ["node", "dist/index.js"]
