/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';
import { MARKETING_NAV } from './nav';

export const appConfig = {
  key: 'marketing',
  name: 'Marketing',
  fullName: 'Duncit Marketing',
  tagline: 'Plan campaigns and brand content.',
  taglineKey: 'shell.portal.marketing.tagline',
  promoTitle: "Reach, amplified",
  promoTitleKey: 'shell.portal.marketing.promoTitle',
  promoText: "Campaigns, notifications and audiences — one place.",
  promoTextKey: 'shell.portal.marketing.promoText',
  portalLabel: 'Marketing Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7693745/pexels-photo-7693745.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['MARKETING_MANAGER', 'MARKETING_EDITOR']),
  tokenKey: 'marketing_token',
  colorModeKey: 'marketing_color_mode',
  // Duncit's brand red; the theme corrects it for AA contrast wherever it is used as text.
  accent: { light: '#fecaca', main: '#f82c2e', hover: '#d91f21', active: '#b51719' },
  // The manager's full sidebar; AppShell narrows it per role with buildNav().
  nav: [...MARKETING_NAV],
  modules: [],
} satisfies AppConfig;
