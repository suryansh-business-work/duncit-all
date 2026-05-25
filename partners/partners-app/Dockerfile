# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_MAP_API
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_MAP_API=${VITE_GOOGLE_MAP_API}

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

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

COPY partners/partners-app ./partners/partners-app
RUN pnpm --filter partners-app build

# --- runner ---
FROM nginx:alpine AS runner
COPY --from=builder /repo/partners/partners-app/dist /usr/share/nginx/html
COPY partners/partners-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80