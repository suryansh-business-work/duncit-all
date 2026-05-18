# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json ./server/
COPY mweb-app/package.json ./mweb-app/
COPY admin/package.json ./admin/
COPY website/package.json ./website/
COPY partners/partners-app/package.json ./partners/partners-app/
COPY partners/partners-website/package.json ./partners/partners-website/

RUN npm ci --no-audit --no-fund

COPY partners/partners-website ./partners/partners-website
RUN npm run build --workspace=partners-website

# --- runner ---
FROM nginx:alpine AS runner
COPY --from=builder /repo/partners/partners-website/dist /usr/share/nginx/html
COPY partners/partners-website/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80