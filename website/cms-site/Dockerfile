# The Website CMS renderer: one Node SSR server for every CMS site, chosen by
# hostname. Astro bundles every dependency into dist/ (only Node builtins stay
# external), so the runtime image is node + dist and nothing else.
#
# Build-time (baked into the pages a browser runs):
#   PUBLIC_GRAPHQL_URL — the API as the visitor's browser reaches it.
# Runtime (compose):
#   GRAPHQL_URL — the API as this container reaches it (the internal network).
#   LEGACY_ORIGIN_MAIN / _PARTNERS / _ADS / _EARNWITH — the old site behind each
#     CMS site, for what the CMS has no page for (short links, newer policies).
FROM node:24-alpine AS builder
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY website/cms-site/package.json ./website/cms-site/
COPY packages/brand/package.json ./packages/brand/
COPY packages/captcha/package.json ./packages/captcha/
COPY packages/datetime/package.json ./packages/datetime/
COPY packages/forms/package.json ./packages/forms/
COPY packages/gql-types/package.json ./packages/gql-types/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/regex/package.json ./packages/regex/
COPY packages/utils/package.json ./packages/utils/

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
RUN pnpm install --frozen-lockfile

ARG PUBLIC_GRAPHQL_URL=
ENV PUBLIC_GRAPHQL_URL=$PUBLIC_GRAPHQL_URL

COPY packages/brand ./packages/brand
COPY packages/captcha ./packages/captcha
COPY packages/datetime ./packages/datetime
COPY packages/forms ./packages/forms
COPY packages/gql-types ./packages/gql-types
COPY packages/i18n ./packages/i18n
COPY packages/regex ./packages/regex
COPY packages/utils ./packages/utils
# The migrated pages point at the old sites' own static files under /legacy/<site>/;
# the build copies them from each site's public/ (scripts/sync-legacy-assets.mjs).
COPY website/main-website/public ./website/main-website/public
COPY website/ads-website/public ./website/ads-website/public
COPY website/earnwith-website/public ./website/earnwith-website/public
COPY website/cms-site ./website/cms-site
RUN pnpm --filter cms-site build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=builder --chown=node:node /repo/website/cms-site/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1
CMD ["node", "dist/server/entry.mjs"]
