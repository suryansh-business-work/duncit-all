/**
 * Per-app configuration for the Duncit Regional Club Admin console. Reusable
 * configuration only — no dynamic business data. `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES`.
 *
 * This console used to be a section of the Partners app. It has its own domain
 * because a Regional Club Admin is an INTERNAL appointment, not a partner who
 * applies: the Partners console is a place people are invited into, and every
 * other area there has an onboarding journey behind it. This one never did.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'regional-club-admin',
  name: 'Regional Club Admin',
  fullName: 'Duncit Regional Club Admin',
  tagline: 'Your whole region — every city, locality, Club Admin and Host under you.',
  taglineKey: 'shell.portal.regionalClubAdmin.tagline',
  promoTitle: 'Your region, on one canvas',
  promoTitleKey: 'shell.portal.regionalClubAdmin.promoTitle',
  promoText:
    'Add the Club Admins who report into you, and the cities, hosts and pods below them draw themselves.',
  promoTextKey: 'shell.portal.regionalClubAdmin.promoText',
  portalLabel: 'Regional Club Admin Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['REGIONAL_CLUB_ADMIN']),
  tokenKey: 'regional_club_admin_token',
  colorModeKey: 'regional_club_admin_color_mode',
  accent: { light: '#fca5a5', main: '#ef4444', hover: '#dc2626', active: '#b91c1c' },
  nav: [
    {
      label: 'Region Structure',
      labelKey: 'shell.nav.regionStructure',
      to: '/',
      icon: 'timeline',
    },
    { label: 'Club Admins', labelKey: 'shell.nav.clubAdmins', to: '/club-admins', icon: 'groups' },
  ],
  modules: [],
} satisfies AppConfig;
