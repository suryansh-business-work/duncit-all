# --- builder ---
FROM public.ecr.aws/docker/library/node:24-alpine AS builder
WORKDIR /repo

# The public site URL and the console URL are compiled into the two bundles
# (links, canonical URLs); the API itself is same-origin (/graphql).
ARG VITE_LITE_SITE_URL
ARG VITE_LITE_PORTAL_URL
ENV VITE_LITE_SITE_URL=${VITE_LITE_SITE_URL}
ENV VITE_LITE_PORTAL_URL=${VITE_LITE_PORTAL_URL}

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
COPY portals/pods/package.json ./portals/pods/
COPY portals/ai/package.json ./portals/ai/
COPY portals/products/package.json ./portals/products/
COPY portals/marketing/package.json ./portals/marketing/
COPY portals/onboarding/package.json ./portals/onboarding/
COPY portals/hr/package.json ./portals/hr/
COPY portals/employee/package.json ./portals/employee/
COPY portals/regional-club-admin/package.json ./portals/regional-club-admin/
COPY portals/venues/package.json ./portals/venues/
COPY portals/clubs/package.json ./portals/clubs/
COPY portals/club-admins/package.json ./portals/club-admins/
COPY portals/hosts/package.json ./portals/hosts/
COPY portals/communications/package.json ./portals/communications/
COPY portals/logs/package.json ./portals/logs/
COPY portals/analytics/package.json ./portals/analytics/
COPY portals/ecomm-portal/package.json ./portals/ecomm-portal/
COPY website/ecomm-store/package.json ./website/ecomm-store/
COPY website/status-website/package.json ./website/status-website/
COPY portals/challenge-portal/package.json ./portals/challenge-portal/
COPY portals/developers/package.json ./portals/developers/
COPY website/earnwith-website/package.json ./website/earnwith-website/
COPY lite/package.json ./lite/
# Every workspace package manifest: the install is frozen-lockfile across the
# whole workspace, and the packages Lite bundles peer on react + MUI, which pnpm
# only links when their manifests are present at install time.
COPY packages/ad-request-form/package.json ./packages/ad-request-form/
COPY packages/ai-monitoring/package.json ./packages/ai-monitoring/
COPY packages/ai-prompts/package.json ./packages/ai-prompts/
COPY packages/app-settings/package.json ./packages/app-settings/
COPY packages/auth-tokens/package.json ./packages/auth-tokens/
COPY packages/auto-pods/package.json ./packages/auto-pods/
COPY packages/availability-calendar/package.json ./packages/availability-calendar/
COPY packages/brand/package.json ./packages/brand/
COPY packages/breadcrumb/package.json ./packages/breadcrumb/
COPY packages/buttons/package.json ./packages/buttons/
COPY packages/buttons-native/package.json ./packages/buttons-native/
COPY packages/captcha/package.json ./packages/captcha/
COPY packages/category/package.json ./packages/category/
COPY packages/club-form/package.json ./packages/club-form/
COPY packages/communication/package.json ./packages/communication/
COPY packages/coupons/package.json ./packages/coupons/
COPY packages/dashboard/package.json ./packages/dashboard/
COPY packages/datetime/package.json ./packages/datetime/
COPY packages/dialogs/package.json ./packages/dialogs/
COPY packages/dialogs-native/package.json ./packages/dialogs-native/
COPY packages/docs-demos/package.json ./packages/docs-demos/
COPY packages/earn/package.json ./packages/earn/
COPY packages/entity-consoles/package.json ./packages/entity-consoles/
COPY packages/errors/package.json ./packages/errors/
COPY packages/fallback-icons/package.json ./packages/fallback-icons/
COPY packages/forms/package.json ./packages/forms/
COPY packages/geo/package.json ./packages/geo/
COPY packages/gql-types/package.json ./packages/gql-types/
COPY packages/host-pod-actions/package.json ./packages/host-pod-actions/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/location/package.json ./packages/location/
COPY packages/logs/package.json ./packages/logs/
COPY packages/media-picker/package.json ./packages/media-picker/
COPY packages/onboarding/package.json ./packages/onboarding/
COPY packages/pod-change-requests/package.json ./packages/pod-change-requests/
COPY packages/pod-details/package.json ./packages/pod-details/
COPY packages/pod-form/package.json ./packages/pod-form/
COPY packages/pod-product-picker/package.json ./packages/pod-product-picker/
COPY packages/portal-pod-form/package.json ./packages/portal-pod-form/
COPY packages/regex/package.json ./packages/regex/
COPY packages/rich-text/package.json ./packages/rich-text/
COPY packages/shell/package.json ./packages/shell/
COPY packages/slack/package.json ./packages/slack/
COPY packages/slots/package.json ./packages/slots/
COPY packages/table/package.json ./packages/table/
COPY packages/tabs/package.json ./packages/tabs/
COPY packages/theme/package.json ./packages/theme/
COPY packages/tours/package.json ./packages/tours/
COPY packages/ui/package.json ./packages/ui/
COPY packages/user-context/package.json ./packages/user-context/
COPY packages/user-core/package.json ./packages/user-core/
COPY packages/utils/package.json ./packages/utils/
COPY packages/verification/package.json ./packages/verification/
COPY packages/virtual-scroll/package.json ./packages/virtual-scroll/

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY scripts/verify-fallback-icons.mjs ./scripts/verify-fallback-icons.mjs
COPY lite ./lite
RUN pnpm --filter duncit-lite build

# --- runner ---
# Node, not nginx: this one process is the GraphQL API, the upload and calendar
# routes, and the HTML server for BOTH hostnames (the console shell for
# lite-portal.*, the web app with per-page head tags for lite.*).
FROM public.ecr.aws/docker/library/node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/lite/package.json ./lite/
COPY --from=builder /repo/server/package.json ./server/
COPY --from=builder /repo/app/mweb/package.json ./app/mweb/
COPY --from=builder /repo/portals/admin/package.json ./portals/admin/
COPY --from=builder /repo/website/main-website/package.json ./website/main-website/

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate \
    && pnpm install --prod --frozen-lockfile --filter duncit-lite

COPY --from=builder /repo/lite/dist ./lite/dist
COPY --from=builder /repo/lite/dist-server ./lite/dist-server

ENV PORT=2040
EXPOSE 2040
WORKDIR /app/lite
USER node
CMD ["node", "dist-server/index.mjs"]
