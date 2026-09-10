import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'clubs',
  name: 'Clubs',
  fullName: 'Duncit Clubs',
  tagline: 'Clubs across all of Duncit.',
  taglineKey: 'shell.portal.clubs.tagline',
  promoTitle: 'Every clubs, one list',
  promoTitleKey: 'shell.portal.clubs.promoTitle',
  promoText: 'One directory for every clubs on Duncit.',
  promoTextKey: 'shell.portal.clubs.promoText',
  portalLabel: 'Clubs Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ["ALL_CLUBS_ACCESS"]),
  tokenKey: 'clubs_token',
  colorModeKey: 'clubs_color_mode',
  accent: {"light":"#a5b4fc","main":"#4f46e5","hover":"#4338ca","active":"#3730a3"},
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
  ],
  modules: [],
} satisfies AppConfig;
