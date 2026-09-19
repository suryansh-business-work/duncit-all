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
  // Every page only READS; the work itself (refunds, test runs, credentials)
  // stays in the console its "more details" links open.
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
        { label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', icon: 'location' },
        { label: 'Revenue & Finance', labelKey: 'shell.nav.revenueFinance', to: '/revenue', icon: 'revenue' },
        { label: 'Coins & Rewards', labelKey: 'shell.nav.coinsRewards', to: '/rewards', icon: 'wallet' },
        { label: 'Pod Shop', labelKey: 'shell.nav.shop', to: '/shop', icon: 'storefront' },
        { label: 'Pet Store', labelKey: 'shell.nav.petStore', to: '/pet-store', icon: 'storefront' },
      ],
    },
    {
      label: 'Growth', labelKey: 'shell.nav.growth',
      icon: 'timeline',
      children: [
        { label: 'Funnel & Retention', labelKey: 'shell.nav.funnelRetention', to: '/growth/funnel', icon: 'northstar' },
        { label: 'Marketing', labelKey: 'shell.nav.marketing', to: '/growth/marketing', icon: 'marketing' },
        { label: 'Communications', labelKey: 'shell.nav.communications', to: '/growth/communications', icon: 'campaign' },
      ],
    },
    {
      label: 'Support', labelKey: 'shell.nav.support',
      icon: 'support',
      children: [
        { label: 'Support Desk', labelKey: 'shell.nav.supportDesk', to: '/support/desk', icon: 'ticket' },
        { label: 'Legal', labelKey: 'shell.nav.legal', to: '/support/legal', icon: 'document' },
      ],
    },
    {
      label: 'Tech', labelKey: 'shell.nav.tech',
      icon: 'dns',
      children: [
        { label: 'Database', labelKey: 'shell.nav.database', to: '/tech/database', icon: 'storage' },
        { label: 'Environment Variables', labelKey: 'shell.nav.environmentVariables', to: '/tech/env-keys', icon: 'settings' },
        { label: 'API Performance', labelKey: 'shell.nav.apiPerformance', to: '/tech/api', icon: 'hub' },
        { label: 'Server', labelKey: 'shell.nav.server', to: '/tech/server', icon: 'dns' },
        { label: 'AI Usage', labelKey: 'shell.nav.aiUsage', to: '/tech/ai-usage', icon: 'ai' },
        { label: 'App Releases', labelKey: 'shell.nav.appReleases', to: '/tech/app-releases', icon: 'android' },
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/tech/logs', icon: 'article' },
      ],
    },
    {
      label: 'Costing', labelKey: 'shell.nav.costing',
      icon: 'expenses',
      children: [
        { label: 'WhatsApp', labelKey: 'shell.nav.whatsapp', to: '/costing/whatsapp', icon: 'whatsapp' },
        { label: 'OpenAI', labelKey: 'shell.nav.openai', to: '/costing/openai', icon: 'ai' },
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
        { label: 'Alerts', labelKey: 'shell.nav.analyticsAlerts', to: '/settings/alerts', icon: 'notifications' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
