# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}

COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json ./server/
COPY web-ui/app/package.json ./web-ui/app/
COPY web-ui/admin/package.json ./web-ui/admin/

RUN npm ci --no-audit --no-fund

COPY web-ui/app ./web-ui/app
RUN npm run build --workspace=app

# --- runner ---
FROM nginx:alpine AS runner
COPY --from=builder /repo/web-ui/app/dist /usr/share/nginx/html
COPY web-ui/app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
