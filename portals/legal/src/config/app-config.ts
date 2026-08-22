import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'legal',
  name: 'Legal',
  fullName: 'Duncit Legal',
  tagline: 'Manage contracts, policies and compliance.',
  taglineKey: 'shell.portal.legal.tagline',
  promoTitle: "Compliance, organized",
  promoTitleKey: 'shell.portal.legal.promoTitle',
  promoText: "Policies, agreements and legal records — one place.",
  promoTextKey: 'shell.portal.legal.promoText',
  portalLabel: 'Legal Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7841459/pexels-photo-7841459.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['LEGAL_MANAGER']),
  tokenKey: 'legal_token',
  colorModeKey: 'legal_color_mode',
  accent: { light: '#c4b5fd', main: '#7c3aed', hover: '#6d28d9', active: '#5b21b6' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Documents', labelKey: 'shell.nav.documents', to: '/documents', icon: 'document' },
    { label: 'Policies', labelKey: 'shell.nav.policies', to: '/policies', icon: 'policy' },
    { label: 'Policy Acceptance Logs', labelKey: 'shell.nav.policyAcceptanceLogs', to: '/policy-acceptance-logs', icon: 'verified-user' },
    { label: 'Contracts', labelKey: 'shell.nav.contracts', to: '/contracts', icon: 'handshake' },
    // What users have reported from the app and mWeb. It sits beside
    // Grievance rather than under it: a grievance is someone complaining
    // about US, a report is someone flagging another user's content.
    { label: 'Report By User', labelKey: 'shell.nav.reportByUser', to: '/reports', icon: 'flag' },
    {
      label: 'Grievance', labelKey: 'shell.nav.grievance',
      icon: 'flag',
      children: [
        { label: 'Grievance Tickets', labelKey: 'shell.nav.grievanceTickets', to: '/grievance/tickets', icon: 'ticket' },
        { label: 'Grievance Info', labelKey: 'shell.nav.grievanceInfo', to: '/grievance/info', icon: 'contactMail' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
