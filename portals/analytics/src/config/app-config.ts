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
  // One dashboard per subject and nothing else — `/` opens the first of them.
  // Tech, Security and Testing only READ what the Tech console runs; every
  // action (backups, test runs, credentials) stays there.
  nav: [
    {
      label: 'Business', labelKey: 'shell.nav.business',
      icon: 'insights',
      children: [
        { label: 'Users', labelKey: 'shell.nav.users', to: '/users', icon: 'people' },
        { label: 'Pods', labelKey: 'shell.nav.pods', to: '/pods', icon: 'calendar' },
        { label: 'Clubs', labelKey: 'shell.nav.clubs', to: '/clubs', icon: 'groups' },
        { label: 'Club Admins', labelKey: 'shell.nav.clubAdmins', to: '/club-admins', icon: 'verified-user' },
        { label: 'Hosts', labelKey: 'shell.nav.hosts', to: '/hosts', icon: 'host-request' },
      ],
    },
    {
      label: 'Tech', labelKey: 'shell.nav.tech',
      icon: 'dns',
      children: [
        { label: 'Database', labelKey: 'shell.nav.database', to: '/tech/database', icon: 'storage' },
        { label: 'Environment Variables', labelKey: 'shell.nav.environmentVariables', to: '/tech/env-keys', icon: 'settings' },
      ],
    },
    {
      label: 'Security', labelKey: 'shell.nav.security',
      icon: 'shield',
      children: [
        { label: 'SonarQube', labelKey: 'shell.nav.sonarqube', to: '/security/sonarqube', icon: 'policy' },
      ],
    },
    {
      label: 'Testing', labelKey: 'shell.nav.testing',
      icon: 'rule',
      children: [
        { label: 'Unit Test Coverage', labelKey: 'shell.nav.unitTestCoverage', to: '/testing/unit-coverage', icon: 'percent' },
        { label: 'Stress Testing', labelKey: 'shell.nav.stressTesting', to: '/testing/stress', icon: 'speed' },
        { label: 'E2E Tests', labelKey: 'shell.nav.e2eTests', to: '/testing/e2e', icon: 'bug' },
      ],
    },
    {
      label: 'Settings', labelKey: 'shell.nav.settings',
      icon: 'settings',
      children: [
        { label: 'Analytics Mails', labelKey: 'shell.nav.analyticsMails', to: '/settings/analytics-mails', icon: 'email' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
