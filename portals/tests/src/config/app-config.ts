import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic; SUPER_ADMIN
 * always passes.
 *
 * The sidebar is grouped by the question a page answers: is the code tested
 * (Automated Testing), did a person check it (Manual Testing), is the code
 * itself healthy (Code Quality), and is the running platform healthy
 * (Monitoring). The E2E, stress, telemetry, error-boundary, GraphQL and
 * SonarQube pages moved here from Tech and keep the paths they had there,
 * because those pages navigate to each other by path.
 */
export const appConfig = {
  key: 'tests',
  name: 'Tests',
  fullName: 'Duncit Tests',
  tagline: 'Every test, run and quality signal behind a Duncit release.',
  taglineKey: 'shell.portal.tests.tagline',
  promoTitle: 'Ship with confidence',
  promoTitleKey: 'shell.portal.tests.promoTitle',
  promoText: 'Unit, E2E, stress, regression and manual testing, with one confidence score.',
  promoTextKey: 'shell.portal.tests.promoText',
  portalLabel: 'Tests Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['TESTS_MANAGER']),
  tokenKey: 'tests_token',
  colorModeKey: 'tests_color_mode',
  accent: { light: '#86efac', main: '#16a34a', hover: '#15803d', active: '#166534' },
  nav: [
    // Coverage, scenario coverage and the confidence score across every kind of testing.
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Automated Testing', labelKey: 'shell.nav.automatedTesting',
      icon: 'rule',
      children: [
        {
          label: 'Unit Tests', labelKey: 'shell.nav.unitTests',
          icon: 'code',
          children: [
            { label: 'Runs', labelKey: 'shell.nav.runs', to: '/unit/runs', icon: 'article' },
            // Every test file the last run saw: what it mocks, and the Cypress specs.
            { label: 'Mocks & Cypress', labelKey: 'shell.nav.mocksCypress', to: '/unit/inventory', icon: 'inventory' },
          ],
        },
        {
          // The nightly schedule lives under Settings, and is the ONLY thing
          // that starts a scheduled run: the workflow declares no cron of its own.
          label: 'E2E Tests', labelKey: 'shell.nav.e2eTests',
          icon: 'hub',
          children: [
            { label: 'Runs', labelKey: 'shell.nav.runs', to: '/e2e/runs', icon: 'article' },
            { label: 'Flows', labelKey: 'shell.nav.flows', to: '/e2e/flows', icon: 'accountTree' },
            { label: 'Settings', labelKey: 'shell.nav.settings', to: '/e2e/settings', icon: 'settings' },
          ],
        },
        {
          label: 'Stress Testing', labelKey: 'shell.nav.stressTesting',
          icon: 'speed',
          children: [
            { label: 'Runs', labelKey: 'shell.nav.runs', to: '/stress-testing/runs', icon: 'article' },
            { label: 'Settings', labelKey: 'shell.nav.settings', to: '/stress-testing/settings', icon: 'tune' },
          ],
        },
        // What broke since the run before: a report per finished unit or E2E run.
        { label: 'Regression', labelKey: 'shell.nav.regression', to: '/regression/reports', icon: 'compare' },
      ],
    },
    {
      label: 'Manual Testing', labelKey: 'shell.nav.manualTesting',
      icon: 'survey',
      children: [
        { label: 'Board', labelKey: 'shell.nav.testBoard', to: '/manual/board', icon: 'widgets' },
        { label: 'Test Cases', labelKey: 'shell.nav.testCases', to: '/manual/cases', icon: 'description' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/manual/settings', icon: 'tune' },
      ],
    },
    {
      label: 'Code Quality', labelKey: 'shell.nav.codeQuality',
      icon: 'policy',
      children: [
        { label: 'SonarQube', labelKey: 'shell.nav.sonarqube', to: '/code-quality/sonarqube', icon: 'policy' },
        { label: 'SonarQube Settings', labelKey: 'shell.nav.sonarqubeSettings', to: '/code-quality/sonarqube-settings', icon: 'tune' },
      ],
    },
    {
      label: 'Monitoring', labelKey: 'shell.nav.monitoring',
      icon: 'insights',
      children: [
        {
          label: 'Telemetry', labelKey: 'shell.nav.telemetry',
          icon: 'timeline',
          children: [
            { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/telemetry/dashboard', icon: 'dashboard' },
            { label: 'Bugs', labelKey: 'shell.nav.bugs', to: '/telemetry/bugs', icon: 'bug' },
            // Every persisted log, one table per level (Error / Warn / Info / Debug).
            { label: 'Logs', labelKey: 'shell.nav.logs', to: '/telemetry/logs', icon: 'article' },
            { label: 'Error Logs', labelKey: 'shell.nav.errorLogs', to: '/telemetry/error-logs', icon: 'block' },
            { label: 'Logs Settings', labelKey: 'shell.nav.logsSettings', to: '/telemetry/logs-settings', icon: 'tune' },
          ],
        },
        // Every page / screen that crashed into an error boundary on mWeb, the
        // app or a portal, and every Report an Issue pressed on one.
        { label: 'Error Boundaries', labelKey: 'shell.nav.errorBoundaries', to: '/error-boundaries', icon: 'shield' },
        {
          label: 'GraphQL Monitor', labelKey: 'shell.nav.graphqlMonitor',
          icon: 'operations',
          children: [
            { label: 'Overview', labelKey: 'shell.nav.overview', to: '/graphql-monitor/overview', icon: 'dashboard' },
            { label: 'Operations', labelKey: 'shell.nav.operations', to: '/graphql-monitor/operations', icon: 'operations' },
            { label: 'Query & Mutation', labelKey: 'shell.nav.graphqlQueryMutation', to: '/graphql-monitor/query-mutation', icon: 'code' },
            { label: 'Fields', labelKey: 'shell.nav.fields', to: '/graphql-monitor/fields', icon: 'accountTree' },
            { label: 'Errors', labelKey: 'shell.nav.errors', to: '/graphql-monitor/errors', icon: 'bug' },
            { label: 'Settings', labelKey: 'shell.nav.settings', to: '/graphql-monitor/settings', icon: 'tune' },
          ],
        },
      ],
    },
    // The confidence-score weights and the unit run retention.
    { label: 'Settings', labelKey: 'shell.nav.settings', to: '/settings', icon: 'settings', pinBottom: true },
  ],
  modules: [],
} satisfies AppConfig;
