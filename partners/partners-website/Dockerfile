# --- builder ---
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /repo

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

COPY partners/partners-website ./partners/partners-website
RUN pnpm --filter partners-website build

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/partners/partners-website/dist /usr/share/nginx/html
COPY partners/partners-website/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80