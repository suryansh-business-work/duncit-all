# --- builder ---
FROM public.ecr.aws/docker/library/node:24-alpine AS builder
WORKDIR /repo

ARG VITE_GRAPHQL_URL
ARG VITE_REQUIRED_ROLES
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_REQUIRED_ROLES=${VITE_REQUIRED_ROLES}

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
# The Package Documentation page mounts every shared package on mock data, so
# @duncit/docs-demos depends on all of them and pnpm needs every manifest here.
# A missing line fails ONLY in the deploy build, never locally.
COPY packages/ad-request-form/package.json ./packages/ad-request-form/
COPY packages/ai-monitoring/package.json ./packages/ai-monitoring/
COPY packages/ai-prompts/package.json ./packages/ai-prompts/
COPY packages/app-settings/package.json ./packages/app-settings/
COPY packages/auth-tokens/package.json ./packages/auth-tokens/
COPY packages/auto-pods/package.json ./packages/auto-pods/
COPY packages/availability-calendar/package.json ./packages/availability-calendar/
COPY packages/brand/package.json ./packages/brand/
COPY packages/breadcrumb/package.json ./packages/breadcrumb/
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
COPY packages/virtual-scroll/package.json ./packages/virtual-scroll/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY portals/tech ./portals/tech
RUN pnpm --filter tech build

# --- runner ---
FROM public.ecr.aws/docker/library/nginx:alpine AS runner
COPY --from=builder /repo/portals/tech/dist /usr/share/nginx/html
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
