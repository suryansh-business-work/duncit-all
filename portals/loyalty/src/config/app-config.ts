import { parseEnvRoles, SUPER_ROLE, type AppConfig } from '@duncit/shell';

/**
 * Who may act here, not just read: reveal a passcode, download a print file,
 * cancel a card, mint a batch. Mirrors the server's LOYALTY_ADMIN_WRITE, which is
 * what actually decides — this only shapes the UI (the analyst seat FINANCE_USER
 * reads the console and is never offered the buttons).
 */
export const writeRoles: readonly string[] = [
  SUPER_ROLE,
  ...parseEnvRoles(import.meta.env.VITE_WRITE_ROLES, ['LOYALTY_MANAGER', 'FINANCE_MANAGER']),
];

/**
 * Per-app configuration. Single source of truth for the shared shell (layout,
 * login gating, theme accent, nav). `requiredRoles` is overridable via
 * `VITE_REQUIRED_ROLES` so access control stays dynamic.
 *
 * Duncit Coin and the gift cards moved here from the Finance console, so the
 * Finance seats that ran them keep a way in beside the console's own role; the
 * server gates every read and write on its own (LOYALTY_ADMIN_READ / _WRITE).
 */
export const appConfig = {
  key: 'loyalty',
  name: 'Loyalty',
  fullName: 'Duncit Loyalty',
  tagline: 'Duncit Coin and every gift card, in one place.',
  taglineKey: 'shell.portal.loyalty.tagline',
  promoTitle: 'Every reward, one console',
  promoTitleKey: 'shell.portal.loyalty.promoTitle',
  promoText: 'Run Duncit Coin, sell virtual gift cards and mint printed scratch cards — with the full history of each.',
  promoTextKey: 'shell.portal.loyalty.promoText',
  portalLabel: 'Loyalty Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, [
    'LOYALTY_MANAGER',
    'FINANCE_MANAGER',
    'FINANCE_USER',
  ]),
  tokenKey: 'loyalty_token',
  colorModeKey: 'loyalty_color_mode',
  accent: { light: '#fcd34d', main: '#d97706', hover: '#b45309', active: '#92400e' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Duncit Coin', labelKey: 'shell.nav.duncitCoin',
      icon: 'wallet',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/duncit-coin/dashboard', icon: 'insights' },
        { label: 'Transactions', labelKey: 'shell.nav.transactions', to: '/duncit-coin/transactions', icon: 'receipt' },
        { label: 'Coin Settings', labelKey: 'shell.nav.coinSettings', to: '/duncit-coin/settings', icon: 'tune' },
      ],
    },
    {
      label: 'Refer & Earn', labelKey: 'shell.nav.referAndEarn',
      icon: 'campaign',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/referrals/dashboard', icon: 'insights' },
        { label: 'Referrals', labelKey: 'shell.nav.referrals', to: '/referrals/history', icon: 'people' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/referrals/settings', icon: 'tune' },
      ],
    },
    {
      label: 'Cards', labelKey: 'shell.nav.cards',
      icon: 'ticket',
      children: [
        {
          label: 'Virtual Gift Cards', labelKey: 'shell.nav.virtualGiftCards',
          icon: 'wallet',
          children: [
            { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/gift-cards/virtual/dashboard', icon: 'insights' },
            { label: 'All Cards', labelKey: 'shell.nav.allCards', to: '/gift-cards/virtual/cards', icon: 'ticket' },
            { label: 'Logs', labelKey: 'shell.nav.logs', to: '/gift-cards/virtual/logs', icon: 'receipt' },
          ],
        },
        {
          label: 'Physical Gift Cards', labelKey: 'shell.nav.physicalGiftCards',
          icon: 'ticket',
          children: [
            { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/gift-cards/physical/dashboard', icon: 'insights' },
            { label: 'Generate Cards', labelKey: 'shell.nav.generateCards', to: '/gift-cards/physical/generate', icon: 'tools' },
            { label: 'All Cards', labelKey: 'shell.nav.allCards', to: '/gift-cards/physical/cards', icon: 'ticket' },
            { label: 'Batches', labelKey: 'shell.nav.batches', to: '/gift-cards/physical/batches', icon: 'inventory' },
            { label: 'History', labelKey: 'shell.nav.history', to: '/gift-cards/physical/history', icon: 'timeline' },
          ],
        },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
