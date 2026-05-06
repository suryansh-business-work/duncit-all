# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json ./server/
COPY mweb-app/package.json ./mweb-app/
COPY admin/package.json ./admin/
COPY website/package.json ./website/

RUN npm ci --no-audit --no-fund

COPY admin ./admin
RUN npm run build --workspace=admin

# --- runner ---
FROM nginx:alpine AS runner
COPY --from=builder /repo/admin/dist /usr/share/nginx/html
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
