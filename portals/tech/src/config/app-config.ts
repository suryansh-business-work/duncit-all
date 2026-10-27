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
    // Telemetry, Error Boundaries, the GraphQL Monitor, SonarQube, E2E Tests and
    // Stress Testing live in the Tests console (tests.duncit.com).
    {
      // The token behind every portal table's "GET API" button.
      label: 'Table API', labelKey: 'shell.nav.tableApi',
      icon: 'code',
      children: [
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/table-api/settings', icon: 'tune' },
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
      // Info says which database is live; Backups and Data Clone both move a
      // whole one: one takes a copy of it, the other overwrites staging with
      // production. They belong beside each other rather than filed under
      // Server next to a log viewer and a terminal.
      label: 'Database', labelKey: 'shell.nav.database',
      icon: 'storage',
      children: [
        { label: 'Info', labelKey: 'shell.nav.info', to: '/database/info', icon: 'info' },
        { label: 'Backups', labelKey: 'shell.nav.backups', to: '/database/backups', icon: 'backup' },
        { label: 'Data Clone', labelKey: 'shell.nav.dataClone', to: '/database/data-clone', icon: 'warehouse' },
        // Files, not rows — but the same act: walks every record and rewrites
        // the ImageKit URLs it holds, so it sits with the other whole-database tools.
        { label: 'Media Organizer', labelKey: 'shell.nav.mediaOrganizer', to: '/database/media-organizer', icon: 'image' },
      ],
    },
    {
      // Beside Server and Database: the zone is what points every *.duncit.com
      // host at that server, and a new portal's A record is added here rather
      // than by someone logged in to GoDaddy. The key lives in Environment
      // Variables → GoDaddy like every other credential.
      //
      // Overview leads because the registration is the one thing here that
      // stops working on a DATE rather than because somebody changed it — a
      // perfect zone under a lapsed domain resolves nowhere.
      label: 'Domain', labelKey: 'shell.nav.domain',
      icon: 'language',
      children: [
        { label: 'Overview', labelKey: 'shell.nav.overview', to: '/domain/overview', icon: 'info' },
        { label: 'DNS Records', labelKey: 'shell.nav.dnsRecords', to: '/domain/dns-records', icon: 'dns' },
        { label: 'Staging Sync', labelKey: 'shell.nav.dnsStagingSync', to: '/domain/staging', icon: 'compare' },
        { label: 'Port Mapping', labelKey: 'shell.nav.portMapping', to: '/domain/port-mapping', icon: 'hub' },
      ],
    },
    {
      // Beside Domain. SSL: the certificates every host the zone points here
      // answers HTTPS with. Cloudflare: where the zone moves when DNS leaves
      // GoDaddy, and the nameserver switch that decides which of the two answers.
      label: 'Security', labelKey: 'shell.nav.security',
      icon: 'shield',
      children: [
        { label: 'SSL', labelKey: 'shell.nav.ssl', to: '/security/ssl', icon: 'lock' },
        { label: 'Cloudflare', labelKey: 'shell.nav.cloudflare', to: '/security/cloudflare', icon: 'dns' },
      ],
    },
    // Beside DNS Config: both decide something about every public website —
    // one where its name points, the other where its traffic is reported.
    { label: 'Google Analytics', labelKey: 'shell.nav.googleAnalytics', to: '/google-analytics', icon: 'analytics' },
    {
      // Beside Google Analytics: another outside service this console holds the
      // keys for. Logs and Analytics are the Communications console's own
      // pages, mounted here too; Settings is the MSG91 category of Environment
      // Variables on a page of its own, so the keys sit beside what they read.
      label: 'MSG91 OTP Logs', labelKey: 'shell.nav.msg91OtpLogs',
      icon: 'phone',
      children: [
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/msg91-otp/logs', icon: 'article' },
        { label: 'Analytics', labelKey: 'shell.nav.analytics', to: '/msg91-otp/analytics', icon: 'analytics' },
        { label: 'MSG91 Settings', labelKey: 'shell.nav.msg91Settings', to: '/msg91-otp/settings', icon: 'tune' },
      ],
    },
    {
      // Beside Server rather than under it: a ceiling is a platform-wide
      // policy, and the systems it governs are the portals, the two apps and
      // the websites — not the box any of it happens to run on.
      label: 'Rate Limiting', labelKey: 'shell.nav.rateLimiting',
      icon: 'speed',
      children: [
        // Systems first: which callers exist and what they spend is the thing
        // you have to look at before a limit means anything.
        { label: 'Systems', labelKey: 'shell.nav.systems', to: '/rate-limiting/systems', icon: 'dns' },
        { label: 'Rules', labelKey: 'shell.nav.rules', to: '/rate-limiting/rules', icon: 'rule' },
        { label: 'Blocked', labelKey: 'shell.nav.blocked', to: '/rate-limiting/blocked', icon: 'block' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/rate-limiting/settings', icon: 'tune' },
      ],
    },
    // Kept apart from Telemetry (the Tests console's): those rows are written
    // by machines, these by people, and the triage is a different job.
    { label: 'Status Reports', labelKey: 'shell.nav.statusReports', to: '/status-reports', icon: 'sos' },
    // Beside Status Reports for the same reason it sits beside Telemetry: both
    // are queues a PERSON filed and a person has to answer. Filed under Database
    // it would read as a maintenance tool, which is exactly the wrong instinct
    // for the one screen here that destroys somebody's account for good.
    { label: 'Account Deletions', labelKey: 'shell.nav.accountDeletions', to: '/account-deletions', icon: 'personRemove' },
    {
      label: 'App Builds', labelKey: 'shell.nav.appBuilds',
      icon: 'installMobile',
      children: [
        { label: 'Android', labelKey: 'shell.nav.android', to: '/app-builds/android', icon: 'android' },
        { label: 'iOS', labelKey: 'shell.nav.ios', to: '/app-builds/ios', icon: 'apple' },
        // What the stores show — name, descriptions, screenshots, review contact —
        // kept once and applied by every push from the two tables above.
        { label: 'Store Listing', labelKey: 'shell.nav.storeListing', to: '/app-builds/store-listing', icon: 'storefront' },
        // What the stores say about every version, read live: review state,
        // rejections with their reason and advice, and the latest build's retry.
        { label: 'Releases', labelKey: 'shell.nav.releases', to: '/app-builds/releases', icon: 'upload' },
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
