import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'logs',
  name: 'Logs',
  fullName: 'Duncit Logs',
  tagline: 'Every log line Duncit writes, in one place.',
  taglineKey: 'shell.portal.logs.tagline',
  promoTitle: 'Every log, one console',
  promoTitleKey: 'shell.portal.logs.promoTitle',
  promoText: 'What the server, the apps and every console report, read from one place.',
  promoTextKey: 'shell.portal.logs.promoText',
  portalLabel: 'Logs Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['LOGS_MANAGER']),
  tokenKey: 'logs_token',
  colorModeKey: 'logs_color_mode',
  accent: { light: '#cbd5e1', main: '#475569', hover: '#334155', active: '#1e293b' },
  // Every log the other consoles keep, grouped by the console it belongs to.
  // Each entry is that console's own page at that console's own path — copied
  // here, not moved — so a link pasted from one opens the same view in the other.
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Tech', labelKey: 'shell.nav.tech',
      icon: 'dns',
      children: [
        { label: 'Telemetry Logs', labelKey: 'shell.nav.telemetryLogs', to: '/telemetry/logs', icon: 'article' },
        { label: 'Error Logs', labelKey: 'shell.nav.errorLogs', to: '/telemetry/error-logs', icon: 'bug' },
        { label: 'Rate Limit Blocks', labelKey: 'shell.nav.rateLimitBlocks', to: '/rate-limiting/blocked', icon: 'block' },
      ],
    },
    {
      label: 'AI', labelKey: 'shell.nav.ai',
      icon: 'ai',
      children: [
        { label: 'OpenAI Logs', labelKey: 'shell.nav.openAiLogs', to: '/openai/logs', icon: 'article' },
        { label: 'AI Monitoring Logs', labelKey: 'shell.nav.aiMonitoringLogs', to: '/monitoring', icon: 'image' },
      ],
    },
    {
      label: 'Communications', labelKey: 'shell.nav.communications',
      icon: 'forum',
      children: [
        { label: 'Email Logs', labelKey: 'shell.nav.emailLogs', to: '/emails/logs', icon: 'email' },
        { label: 'WhatsApp Logs', labelKey: 'shell.nav.whatsappLogs', to: '/whatsapp/logs', icon: 'whatsapp' },
        {
          // The keys the log is read with sit beside it, as they do in the
          // consoles this page is borrowed from.
          label: 'MSG91 OTP Logs', labelKey: 'shell.nav.msg91OtpLogs',
          icon: 'phone',
          children: [
            { label: 'Logs', labelKey: 'shell.nav.logs', to: '/msg91-otp/logs', icon: 'article' },
            { label: 'MSG91 Settings', labelKey: 'shell.nav.msg91Settings', to: '/msg91-otp/settings', icon: 'tune' },
          ],
        },
      ],
    },
    {
      label: 'Finance', labelKey: 'shell.nav.finance',
      icon: 'payments',
      children: [
        { label: 'Payment Logs', labelKey: 'shell.nav.paymentLogs', to: '/payment-logs', icon: 'receipt' },
        { label: 'User Refund Logs', labelKey: 'shell.nav.userRefundLogs', to: '/user-refund-logs', icon: 'quote' },
        { label: 'Gift Card Logs', labelKey: 'shell.nav.giftCardLogs', to: '/gift-cards/logs', icon: 'ticket' },
        { label: 'Coin Transactions', labelKey: 'shell.nav.coinTransactions', to: '/duncit-coin/transactions', icon: 'wallet' },
      ],
    },
    {
      label: 'Legal', labelKey: 'shell.nav.legal',
      icon: 'policy',
      children: [
        { label: 'Policy Acceptance Logs', labelKey: 'shell.nav.policyAcceptanceLogs', to: '/policy-acceptance-logs', icon: 'verified-user' },
      ],
    },
    {
      label: 'Pods', labelKey: 'shell.nav.pods',
      icon: 'calendar',
      children: [
        { label: 'Pod Monitoring (AI)', labelKey: 'shell.nav.podMonitoringAi', to: '/pod-monitoring', icon: 'insights' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
