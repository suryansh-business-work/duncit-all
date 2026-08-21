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
  promoTitle: 'Challenges, organized',
  promoText: 'Build challenges scoped by super, category and sub-category — all in one place.',
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
    { label: 'Challenges', labelKey: 'shell.nav.challenges', to: '/challenges', icon: 'challenge' },
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
