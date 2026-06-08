# Builds the Expo **web** export (static SPA, app.json web.output = "single") and
# serves it with nginx.
#
# Build context is the REPO ROOT (not this folder) because the build needs files
# outside the app:
#   - @duncit/auth-tokens         (file:../packages/auth-tokens + metro watchFolders)
#   - server GraphQL schema files (codegen reads ../server/src/modules/**/*.schema.ts)
# src/generated/** is gitignored, so codegen must run before the web export.
# The root .dockerignore already excludes node_modules/dist.

# --- builder ---
FROM public.ecr.aws/docker/library/node:20 AS builder
WORKDIR /repo
ENV CI=1

# Shared design-token package (file: dep + metro watchFolders) and the server
# GraphQL SDL that codegen reads (self-contained `export const … = gql\`…\``).
COPY packages/auth-tokens ./packages/auth-tokens
COPY packages/logs ./packages/logs
COPY server/src/modules ./server/src/modules

WORKDIR /repo/duncit-mobile-app
COPY duncit-mobile-app/package.json duncit-mobile-app/package-lock.json ./
RUN npm ci

COPY duncit-mobile-app/ ./
RUN npm run codegen
RUN npx expo export --platform web --output-dir dist

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/duncit-mobile-app/dist /usr/share/nginx/html
COPY duncit-mobile-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
