import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'venues',
  name: 'Venues',
  fullName: 'Duncit Venues',
  tagline: 'Venues across all of Duncit.',
  taglineKey: 'shell.portal.venues.tagline',
  promoTitle: 'Every venues, one list',
  promoTitleKey: 'shell.portal.venues.promoTitle',
  promoText: 'One directory for every venues on Duncit.',
  promoTextKey: 'shell.portal.venues.promoText',
  portalLabel: 'Venues Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ["ALL_VENUES_ACCESS","ONBOARDING_MANAGER"]),
  tokenKey: 'venues_token',
  colorModeKey: 'venues_color_mode',
  accent: {"light":"#5eead4","main":"#0d9488","hover":"#0f766e","active":"#115e59"},
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
  ],
  modules: [],
} satisfies AppConfig;
