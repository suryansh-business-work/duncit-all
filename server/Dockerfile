# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /repo

# Copy root manifests + workspace manifests for cached install
COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json ./server/
COPY web-ui/app/package.json ./web-ui/app/
COPY web-ui/admin/package.json ./web-ui/admin/

RUN npm ci --no-audit --no-fund

# Copy source and build server
COPY server ./server
RUN npm run build --workspace=server

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo/package.json /repo/package-lock.json ./
COPY --from=builder /repo/server/package.json ./server/
COPY --from=builder /repo/web-ui/app/package.json ./web-ui/app/
COPY --from=builder /repo/web-ui/admin/package.json ./web-ui/admin/

RUN npm ci --omit=dev --no-audit --no-fund --workspace=server --include-workspace-root=false || \
    npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /repo/server/dist ./server/dist

ENV PORT=2001
EXPOSE 2001
WORKDIR /app/server
CMD ["node", "dist/index.js"]
