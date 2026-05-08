# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_MAP_API
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_MAP_API=${VITE_GOOGLE_MAP_API}

COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json ./server/
COPY mweb-app/package.json ./mweb-app/
COPY admin/package.json ./admin/
COPY website/package.json ./website/

RUN npm ci --no-audit --no-fund

COPY mweb-app ./mweb-app
RUN npm run build --workspace=mweb-app

# --- runner ---
FROM nginx:alpine AS runner
COPY --from=builder /repo/mweb-app/dist /usr/share/nginx/html
COPY mweb-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
