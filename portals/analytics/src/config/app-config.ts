import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'analytics',
  name: 'Analytics',
  fullName: 'Duncit Analytics',
  tagline: 'Every number Duncit runs on, in one place.',
  taglineKey: 'shell.portal.analytics.tagline',
  promoTitle: 'Every number, one console',
  promoTitleKey: 'shell.portal.analytics.promoTitle',
  promoText: 'Bookings, revenue and growth across Duncit, read from one place.',
  promoTextKey: 'shell.portal.analytics.promoText',
  portalLabel: 'Analytics Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['ANALYTICS_MANAGER']),
  tokenKey: 'analytics_token',
  colorModeKey: 'analytics_color_mode',
  accent: { light: '#f0abfc', main: '#c026d3', hover: '#a21caf', active: '#86198f' },
  nav: [{ label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
} satisfies AppConfig;
