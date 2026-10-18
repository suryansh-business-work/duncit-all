import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic; SUPER_ADMIN
 * always passes.
 */
export const appConfig = {
  key: 'gig-jobs',
  name: 'Gig Jobs',
  fullName: 'Duncit Gig Jobs',
  tagline: 'Every gig, freelancer and category on Duncit, in one place.',
  taglineKey: 'shell.portal.gigJobs.tagline',
  promoTitle: 'Every gig, one console',
  promoTitleKey: 'shell.portal.gigJobs.promoTitle',
  promoText: 'Moderate the gigs hosts, venues and brands post, see who is interested, and keep the categories tidy.',
  promoTextKey: 'shell.portal.gigJobs.promoText',
  portalLabel: 'Gig Jobs Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['GIG_JOBS_MANAGER']),
  tokenKey: 'gig_jobs_token',
  colorModeKey: 'gig_jobs_color_mode',
  accent: { light: '#fdba74', main: '#ea580c', hover: '#c2410c', active: '#9a3412' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Gig Jobs', labelKey: 'shell.nav.gigJobs', to: '/gigs', icon: 'work' },
    { label: 'Interested freelancers', labelKey: 'shell.nav.gigInterests', to: '/interests', icon: 'handshake' },
    { label: 'Freelancers', labelKey: 'shell.nav.freelancers', to: '/freelancers', icon: 'people' },
    { label: 'Gig Categories', labelKey: 'shell.nav.gigCategories', to: '/categories', icon: 'accountTree' },
  ],
  modules: [],
} satisfies AppConfig;
