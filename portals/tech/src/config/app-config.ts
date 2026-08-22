import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via
 * `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'tech',
  name: 'Tech',
  fullName: 'Duncit Tech',
  tagline: 'Manage platform configuration and environment variables.',
  taglineKey: 'shell.portal.tech.tagline',
  promoTitle: 'Ship with control',
  promoTitleKey: 'shell.portal.tech.promoTitle',
  promoText: 'Environment, feature flags and platform config in one console.',
  promoTextKey: 'shell.portal.tech.promoText',
  portalLabel: 'Tech Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/6804068/pexels-photo-6804068.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['TECH_MANAGER']),
  tokenKey: 'tech_token',
  colorModeKey: 'tech_color_mode',
  accent: { light: '#94a3b8', main: '#0ea5e9', hover: '#0284c7', active: '#0369a1' },
  nav: [
    { label: 'Environment Variables', labelKey: 'shell.nav.environmentVariables', to: '/', icon: 'settings' },
    { label: 'Maintenance', labelKey: 'shell.nav.maintenance', to: '/portal-modes', icon: 'construction' },
    { label: 'Feature Flags', labelKey: 'shell.nav.featureFlags', to: '/feature-flags', icon: 'flag' },
    { label: 'Authentication', labelKey: 'shell.nav.authentication', to: '/authentication', icon: 'lock' },
    {
      label: 'Emails', labelKey: 'shell.nav.emails',
      icon: 'email',
      children: [
        // First, like Telemetry's: the board is where you look before you know
        // which template or which row you are after.
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/emails/dashboard', icon: 'dashboard' },
        { label: 'Templates', labelKey: 'shell.nav.templates', to: '/emails/templates', icon: 'description' },
        { label: 'Fragments', labelKey: 'shell.nav.fragments', to: '/emails/fragments', icon: 'widgets' },
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/emails/logs', icon: 'article' },
        // Connecting the mailbox only — the reply and the queue are Support's,
        // so the rest of this feature is in the Support portal.
        { label: 'Mail Automation', labelKey: 'shell.nav.mailAutomation', to: '/mail-automation', icon: 'markEmailRead' },
      ],
    },
    {
      label: 'Telemetry', labelKey: 'shell.nav.telemetry',
      icon: 'insights',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/telemetry/dashboard', icon: 'dashboard' },
        { label: 'Bugs', labelKey: 'shell.nav.bugs', to: '/telemetry/bugs', icon: 'bug' },
        // Every persisted log, one table per level (Error / Warn / Info / Debug).
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/telemetry/logs', icon: 'article' },
        { label: 'Error Logs', labelKey: 'shell.nav.errorLogs', to: '/telemetry/error-logs', icon: 'report' },
        { label: 'Logs Settings', labelKey: 'shell.nav.logsSettings', to: '/telemetry/logs-settings', icon: 'tune' },
      ],
    },
    {
      label: 'Server', labelKey: 'shell.nav.server',
      icon: 'dns',
      children: [
        { label: 'Info', labelKey: 'shell.nav.info', to: '/server/info', icon: 'info' },
        { label: 'Docker', labelKey: 'shell.nav.docker', to: '/server/docker', icon: 'docker' },
        { label: 'Terminal', labelKey: 'shell.nav.terminal', to: '/server/terminal', icon: 'terminal' },
      ],
    },
    {
      // Both entries move a whole database: one takes a copy of it, the other
      // overwrites staging with production. They belong beside each other
      // rather than filed under Server next to a log viewer and a terminal.
      label: 'Database', labelKey: 'shell.nav.database',
      icon: 'storage',
      children: [
        { label: 'Backups', labelKey: 'shell.nav.backups', to: '/database/backups', icon: 'backup' },
        { label: 'Data Clone', labelKey: 'shell.nav.dataClone', to: '/database/data-clone', icon: 'warehouse' },
      ],
    },
    { label: 'Slack', labelKey: 'shell.nav.slack', to: '/slack', icon: 'chat' },
    // Sits beside Telemetry rather than inside it: those rows are written by
    // machines, these by people, and the triage is a different job.
    { label: 'Status Reports', labelKey: 'shell.nav.statusReports', to: '/status-reports', icon: 'sos' },
    {
      label: 'App Builds', labelKey: 'shell.nav.appBuilds',
      icon: 'installMobile',
      children: [
        { label: 'Android', labelKey: 'shell.nav.android', to: '/app-builds/android', icon: 'android' },
        { label: 'iOS', labelKey: 'shell.nav.ios', to: '/app-builds/ios', icon: 'apple' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/app-builds/settings', icon: 'settings' },
      ],
    },
    { label: 'Package Documentation', labelKey: 'shell.nav.packageDocumentation', to: '/package-docs', icon: 'menuBook' },
    // Beside the docs, because both answer a question about the same manifests:
    // what a package exports, and how far behind what it depends on is.
    { label: 'Package Updates', labelKey: 'shell.nav.packageUpdates', to: '/package-updates', icon: 'inventory' },
  ],
  modules: [],
} satisfies AppConfig;
