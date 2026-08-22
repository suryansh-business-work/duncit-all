# --- builder ---
FROM public.ecr.aws/docker/library/node:24-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_MAP_API
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_MAP_API=${VITE_GOOGLE_MAP_API}

# Signing identity for the app-link association files (scripts/generate-app-links.mjs),
# written into public/.well-known during the build. Unset means those files are
# not written at all, and an mWeb link opens the browser instead of the app.
ARG MWEB_ANDROID_CERT_SHA256
ARG MWEB_IOS_TEAM_ID
ENV MWEB_ANDROID_CERT_SHA256=${MWEB_ANDROID_CERT_SHA256}
ENV MWEB_IOS_TEAM_ID=${MWEB_IOS_TEAM_ID}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY server/package.json ./server/
COPY app/mweb/package.json ./app/mweb/
COPY portals/admin/package.json ./portals/admin/
COPY website/main-website/package.json ./website/main-website/
COPY portals/partners-app/package.json ./portals/partners-app/
COPY website/partners-website/package.json ./website/partners-website/
COPY portals/ads-portal/package.json ./portals/ads-portal/
COPY website/ads-website/package.json ./website/ads-website/
COPY portals/crm/package.json ./portals/crm/
COPY portals/finance/package.json ./portals/finance/
COPY portals/tech/package.json ./portals/tech/
COPY portals/support/package.json ./portals/support/
COPY portals/website-app/package.json ./portals/website-app/
COPY portals/legal/package.json ./portals/legal/
COPY portals/ai/package.json ./portals/ai/
COPY portals/products/package.json ./portals/products/
COPY portals/marketing/package.json ./portals/marketing/
COPY portals/onboarding/package.json ./portals/onboarding/
COPY portals/hr/package.json ./portals/hr/
COPY portals/employee/package.json ./portals/employee/
COPY website/status-website/package.json ./website/status-website/
COPY portals/challenge-portal/package.json ./portals/challenge-portal/
COPY portals/developers/package.json ./portals/developers/
COPY website/earnwith-website/package.json ./website/earnwith-website/
COPY packages/user-context/package.json ./packages/user-context/
COPY packages/logs/package.json ./packages/logs/
COPY packages/shell/package.json ./packages/shell/
COPY packages/dialogs/package.json ./packages/dialogs/
COPY packages/geo/package.json ./packages/geo/
COPY packages/breadcrumb/package.json ./packages/breadcrumb/
COPY packages/theme/package.json ./packages/theme/
COPY packages/location/package.json ./packages/location/
COPY packages/user-core/package.json ./packages/user-core/
COPY packages/utils/package.json ./packages/utils/
COPY packages/auto-pods/package.json ./packages/auto-pods/
# @duncit/auto-pods now ships the Auto Pod template form, which builds its inputs
# from @duncit/forms — a workspace dep needs its manifest here or pnpm install fails.
COPY packages/forms/package.json ./packages/forms/
COPY packages/ai-monitoring/package.json ./packages/ai-monitoring/
COPY packages/media-picker/package.json ./packages/media-picker/
COPY packages/tabs/package.json ./packages/tabs/
COPY packages/ui/package.json ./packages/ui/
COPY packages/pod-product-picker/package.json ./packages/pod-product-picker/
COPY packages/table/package.json ./packages/table/
COPY packages/errors/package.json ./packages/errors/
COPY packages/slack/package.json ./packages/slack/
COPY packages/app-settings/package.json ./packages/app-settings/
COPY packages/slots/package.json ./packages/slots/
COPY packages/datetime/package.json ./packages/datetime/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/fallback-icons/package.json ./packages/fallback-icons/
COPY packages/onboarding/package.json ./packages/onboarding/
COPY packages/tours/package.json ./packages/tours/
COPY packages/virtual-scroll/package.json ./packages/virtual-scroll/
COPY packages/captcha/package.json ./packages/captcha/
COPY packages/brand/package.json ./packages/brand/
COPY packages/communication/package.json ./packages/communication/
COPY packages/host-pod-actions/package.json ./packages/host-pod-actions/
COPY packages/earn/package.json ./packages/earn/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

# The build chain runs scripts/verify-fallback-icons.mjs (rule 39) and
# scripts/generate-app-links.mjs, which reads the app's package name and bundle
# id out of app.json so the association files cannot drift from the app itself.
COPY scripts ./scripts
COPY app/mobile-app/app.json ./app/mobile-app/app.json
COPY packages ./packages
COPY app/mweb ./app/mweb
RUN pnpm --filter mweb-app build

# --- runner ---
# Node, not nginx: every HTML response gets its meta tags (title, OG/Twitter
# cards, theme color) composed SERVER-SIDE per request by server/main.ts, which
# crawlers need because they never run the SPA. dist-server/main.mjs is a
# self-contained bundle — no node_modules in the image. Static assets keep
# spa.conf's exact cache behaviour, reimplemented in server/static-files.ts.
FROM public.ecr.aws/docker/library/node:24-alpine AS runner
WORKDIR /app
ARG VITE_GRAPHQL_URL
ENV GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV NODE_ENV=production
# Non-root (S6471) — which also means no port 80; compose maps the host port
# onto 8080 instead.
ENV PORT=8080
COPY --from=builder /repo/app/mweb/dist ./dist
COPY --from=builder /repo/app/mweb/dist-server ./dist-server
USER node
EXPOSE 8080
CMD ["node", "dist-server/main.mjs"]
