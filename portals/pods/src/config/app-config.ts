import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'pods',
  name: 'Pods',
  fullName: 'Duncit Pods',
  tagline: 'Every pod on Duncit.',
  taglineKey: 'shell.portal.pods.tagline',
  promoTitle: 'Every pod, one list',
  promoTextKey: 'shell.portal.pods.promoText',
  promoTitleKey: 'shell.portal.pods.promoTitle',
  promoText: 'Upcoming, running now, and already settled.',
  portalLabel: 'Pods Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/1153213/pexels-photo-1153213.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['ALL_PODS_ACCESS']),
  tokenKey: 'pods_token',
  colorModeKey: 'pods_color_mode',
  accent: { light: '#93c5fd', main: '#2563eb', hover: '#1d4ed8', active: '#1e40af' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
  ],
  modules: [],
} satisfies AppConfig;
