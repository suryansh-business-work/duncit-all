import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'logs',
  name: 'Logs',
  fullName: 'Duncit Logs',
  tagline: 'Every log line Duncit writes, in one place.',
  taglineKey: 'shell.portal.logs.tagline',
  promoTitle: 'Every log, one console',
  promoTitleKey: 'shell.portal.logs.promoTitle',
  promoText: 'What the server, the apps and every console report, read from one place.',
  promoTextKey: 'shell.portal.logs.promoText',
  portalLabel: 'Logs Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['LOGS_MANAGER']),
  tokenKey: 'logs_token',
  colorModeKey: 'logs_color_mode',
  accent: { light: '#cbd5e1', main: '#475569', hover: '#334155', active: '#1e293b' },
  nav: [{ label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
} satisfies AppConfig;
