import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'club-admins',
  name: 'Club Admins',
  fullName: 'Duncit Club Admins',
  tagline: 'Club Admins across all of Duncit.',
  taglineKey: 'shell.portal.clubAdmins.tagline',
  promoTitle: 'Every club admins, one list',
  promoTitleKey: 'shell.portal.clubAdmins.promoTitle',
  promoText: 'One directory for every club admins on Duncit.',
  promoTextKey: 'shell.portal.clubAdmins.promoText',
  portalLabel: 'Club Admins Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ["ALL_CLUB_ADMINS_ACCESS"]),
  tokenKey: 'club_admins_token',
  colorModeKey: 'club_admins_color_mode',
  accent: {"light":"#fcd34d","main":"#d97706","hover":"#b45309","active":"#92400e"},
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
  ],
  modules: [],
} satisfies AppConfig;
