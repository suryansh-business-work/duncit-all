import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'challenge',
  name: 'Challenges',
  fullName: 'Duncit Challenges',
  tagline: 'Create and manage challenges across categories.',
  taglineKey: 'shell.portal.challengePortal.tagline',
  promoTitle: 'Challenges, organized',
  promoTitleKey: 'shell.portal.challengePortal.promoTitle',
  promoText: 'Build challenges scoped by super, category and sub-category — all in one place.',
  promoTextKey: 'shell.portal.challengePortal.promoText',
  portalLabel: 'Challenges Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['CHALLENGE_MANAGER']),
  tokenKey: 'challenge_token',
  colorModeKey: 'challenge_color_mode',
  accent: { light: '#fdba74', main: '#f97316', hover: '#ea580c', active: '#c2410c' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Tool Master', labelKey: 'shell.nav.toolMaster', to: '/tools', icon: 'tools' },
    { label: 'Tool Presets', labelKey: 'shell.nav.toolPresets', to: '/tools/presets', icon: 'tune' },
    { label: 'Category Mapping', labelKey: 'shell.nav.categoryMapping', to: '/category-mapping', icon: 'hub' },
    { label: 'Challenge Templates', labelKey: 'shell.nav.challengeTemplates', to: '/challenges', icon: 'challenge' },
    { label: 'Pod Challenges', labelKey: 'shell.nav.podChallenges', to: '/pod-challenges', icon: 'flag' },
    { label: 'Live Challenge Monitor', labelKey: 'shell.nav.challengeLiveMonitor', to: '/live', icon: 'speed' },
    { label: 'Results & Leaderboards', labelKey: 'shell.nav.challengeResults', to: '/results', icon: 'insights' },
    { label: 'Notifications', labelKey: 'shell.nav.notifications', to: '/notifications', icon: 'notifications' },
    { label: 'Audit Logs', labelKey: 'shell.nav.challengeAuditLogs', to: '/audit-logs', icon: 'timeline' },
    {
      label: 'Leaderboard', labelKey: 'shell.nav.leaderboard',
      icon: 'trophy',
      children: [
        { label: 'Boards', labelKey: 'shell.nav.boards', to: '/leaderboard', icon: 'insights' },
        { label: 'Points Ledger', labelKey: 'shell.nav.pointsLedger', to: '/leaderboard/points', icon: 'receipt' },
        { label: 'Settings & Rewards', labelKey: 'shell.nav.settingsAndRewards', to: '/leaderboard/settings', icon: 'tune' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
