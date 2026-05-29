# --- builder ---
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_REQUIRED_ROLES
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_REQUIRED_ROLES=${VITE_REQUIRED_ROLES}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY server/package.json ./server/
COPY mweb-app/package.json ./mweb-app/
COPY admin/package.json ./admin/
COPY website/package.json ./website/
COPY partners/partners-app/package.json ./partners/partners-app/
COPY partners/partners-website/package.json ./partners/partners-website/
COPY ads/package.json ./ads/
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
COPY packages/user-context/package.json ./packages/user-context/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY crm ./crm
RUN pnpm --filter crm build

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/crm/dist /usr/share/nginx/html
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
