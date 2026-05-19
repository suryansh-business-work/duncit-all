# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY server/package.json ./server/
COPY mweb-app/package.json ./mweb-app/
COPY admin/package.json ./admin/
COPY website/package.json ./website/
COPY partners/partners-app/package.json ./partners/partners-app/
COPY partners/partners-website/package.json ./partners/partners-website/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

COPY website ./website
RUN pnpm --filter duncit.com build

# --- runner ---
FROM nginx:alpine AS runner
COPY --from=builder /repo/website/dist /usr/share/nginx/html
COPY website/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
