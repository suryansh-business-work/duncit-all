# --- builder ---
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_REQUIRED_ROLES
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_REQUIRED_ROLES=${VITE_REQUIRED_ROLES}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

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
COPY packages/user-context/package.json ./packages/user-context/
COPY packages/logs/package.json ./packages/logs/
COPY packages/shell/package.json ./packages/shell/
COPY packages/theme/package.json ./packages/theme/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY portals/website-app ./portals/website-app
RUN pnpm --filter website-app build

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/portals/website-app/dist /usr/share/nginx/html
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
