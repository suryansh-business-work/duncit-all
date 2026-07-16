/**
 * Per-app configuration. This is the single source of truth that makes the
 * shared shell (layout, login gating, theme accent, dashboard modules) behave
 * differently for each Duncit console. Everything here is reusable
 * configuration — no dynamic business data lives in this file.
 *
 * `requiredRoles` can be overridden at build/runtime via `VITE_REQUIRED_ROLES`
 * (comma separated) so access control stays dynamic without a code change.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'ads',
  name: 'Ads',
  fullName: 'Duncit Ads',
  tagline: 'Plan campaigns, manage creatives and track ad performance.',
  promoTitle: "Campaigns that convert",
  promoText: "Plan, launch and measure ad campaigns from one console.",
  portalLabel: 'Ads Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['ADS_MANAGER']),
  tokenKey: 'ads_token',
  colorModeKey: 'ads_color_mode',
  accent: { light: '#ff9e9e', main: '#ff5757', hover: '#f03e3e', active: '#d92d2d' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [
    { title: 'Campaigns', description: 'Create, schedule and manage ad campaigns across placements.', icon: 'campaign' },
    { title: 'Creatives', description: 'Upload and organise banners, media and creative variants.', icon: 'image' },
    { title: 'Performance', description: 'Monitor impressions, clicks, CTR and spend in real time.', icon: 'insights' },
    { title: 'Audiences', description: 'Build, segment and target reusable audience lists.', icon: 'groups' },
  ],
} satisfies AppConfig;
