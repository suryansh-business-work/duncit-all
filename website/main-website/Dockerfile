# --- builder ---
FROM public.ecr.aws/docker/library/node:24-alpine AS builder
WORKDIR /repo

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

COPY packages/logs/package.json ./packages/logs/
COPY packages/utils/package.json ./packages/utils/
COPY packages/media-picker/package.json ./packages/media-picker/
COPY packages/table/package.json ./packages/table/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

# Cross-site/API URLs are baked into the Astro bundle at build time. Empty
# defaults keep the in-code production fallbacks; the staging pipeline passes
# staging.*.duncit.com values here.
ARG PUBLIC_GRAPHQL_URL=
ARG PUBLIC_SITE_URL=
ARG PUBLIC_MWEB_URL=
ARG PUBLIC_PARTNERS_SITE_URL=
ARG PUBLIC_ADS_SITE_URL=
ARG PUBLIC_EARNWITH_URL=
ENV PUBLIC_GRAPHQL_URL=$PUBLIC_GRAPHQL_URL \
    PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_MWEB_URL=$PUBLIC_MWEB_URL \
    PUBLIC_PARTNERS_SITE_URL=$PUBLIC_PARTNERS_SITE_URL \
    PUBLIC_ADS_SITE_URL=$PUBLIC_ADS_SITE_URL \
    PUBLIC_EARNWITH_URL=$PUBLIC_EARNWITH_URL

COPY website/main-website ./website/main-website
COPY packages/logs ./packages/logs
RUN pnpm --filter duncit.com build

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/website/main-website/dist /usr/share/nginx/html
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
