import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'communications',
  name: 'Communications',
  fullName: 'Duncit Communications',
  tagline: 'Every message Duncit sends, in one place.',
  taglineKey: 'shell.portal.communications.tagline',
  promoTitle: 'Every message, one console',
  promoTitleKey: 'shell.portal.communications.promoTitle',
  promoText: 'Email, SMS, WhatsApp and push — what Duncit tells its members, and how it lands.',
  promoTextKey: 'shell.portal.communications.promoText',
  portalLabel: 'Communications Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/1591062/pexels-photo-1591062.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['COMMUNICATIONS_MANAGER']),
  tokenKey: 'communications_token',
  colorModeKey: 'communications_color_mode',
  accent: { light: '#67e8f9', main: '#0891b2', hover: '#0e7490', active: '#155e75' },
  nav: [{ label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
} satisfies AppConfig;
