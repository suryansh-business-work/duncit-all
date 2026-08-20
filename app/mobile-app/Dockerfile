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
FROM public.ecr.aws/docker/library/node:24 AS builder
WORKDIR /repo
# CYPRESS_INSTALL_BINARY=0 for the same reason as Dockerfile.android: `npm ci`
# pulls devDependencies, and this image does an expo web export — it never runs
# a browser test, so downloading the Cypress binary is cost and flakiness only.
ENV CI=1 CYPRESS_INSTALL_BINARY=0

# Shared design-token package (file: dep + metro watchFolders) and the server
# GraphQL SDL that codegen reads (self-contained `export const … = gql\`…\``).
# Every @duncit/* file: dep the app imports (Metro resolves them via
# watchFolders, so each must be present in the build context).
COPY packages/auth-tokens ./packages/auth-tokens
COPY packages/logs ./packages/logs
COPY packages/geo ./packages/geo
COPY packages/regex ./packages/regex
COPY packages/errors ./packages/errors
COPY packages/slack ./packages/slack
COPY packages/datetime ./packages/datetime
COPY packages/dialogs-native ./packages/dialogs-native
COPY packages/fallback-icons ./packages/fallback-icons
COPY packages/i18n ./packages/i18n
COPY packages/user-core ./packages/user-core
COPY packages/utils ./packages/utils
COPY packages/onboarding ./packages/onboarding
COPY packages/tours ./packages/tours
COPY packages/virtual-scroll ./packages/virtual-scroll
COPY packages/slots ./packages/slots
COPY server/src/modules ./server/src/modules

WORKDIR /repo/app/mobile-app
COPY app/mobile-app/package.json app/mobile-app/package-lock.json ./
RUN npm ci

COPY app/mobile-app/ ./

# The API base URL is baked into the web export (config.ts reads
# EXPO_PUBLIC_API_URL, and a process-env value wins over .env.production).
# Default = production; the staging pipeline passes staging.server.duncit.com.
ARG EXPO_PUBLIC_API_URL=https://server.duncit.com
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npm run codegen
RUN npx expo export --platform web --output-dir dist

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/app/mobile-app/dist /usr/share/nginx/html
COPY app/mobile-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
