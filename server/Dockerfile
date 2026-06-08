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
COPY ads/ads-portal/package.json ./ads/ads-portal/
COPY ads/ads-website/package.json ./ads/ads-website/
COPY crm/package.json ./crm/
COPY finance/package.json ./finance/
COPY tech/package.json ./tech/
COPY support/package.json ./support/
COPY website-app/package.json ./website-app/
COPY legal/package.json ./legal/
COPY ai/package.json ./ai/
COPY products/package.json ./products/
COPY marketing/package.json ./marketing/
COPY onboarding/package.json ./onboarding/
COPY hr/package.json ./hr/
COPY employee/package.json ./employee/
COPY status/package.json ./status/

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
COPY --from=builder /repo/ads/ads-portal/package.json ./ads/ads-portal/
COPY --from=builder /repo/ads/ads-website/package.json ./ads/ads-website/
COPY --from=builder /repo/crm/package.json ./crm/
COPY --from=builder /repo/finance/package.json ./finance/
COPY --from=builder /repo/tech/package.json ./tech/
COPY --from=builder /repo/support/package.json ./support/
COPY --from=builder /repo/website-app/package.json ./website-app/
COPY --from=builder /repo/legal/package.json ./legal/
COPY --from=builder /repo/ai/package.json ./ai/
COPY --from=builder /repo/products/package.json ./products/
COPY --from=builder /repo/marketing/package.json ./marketing/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --prod --frozen-lockfile --filter server

COPY --from=builder /repo/server/dist ./server/dist

ENV PORT=2001
EXPOSE 2001
WORKDIR /app/server
CMD ["node", "-r", "./dist/tracing.js", "dist/index.js"]
