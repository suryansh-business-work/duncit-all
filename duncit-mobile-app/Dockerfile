# Builds the Expo **web** export (static SPA, app.json web.output = "single") and
# serves it with nginx. Build context is this folder — the mobile app is
# npm-based and intentionally NOT part of the root pnpm workspace.

# --- builder ---
FROM public.ecr.aws/docker/library/node:20 AS builder
WORKDIR /app
ENV CI=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web --output-dir dist

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
