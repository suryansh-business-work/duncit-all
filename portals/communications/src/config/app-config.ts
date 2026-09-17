import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'communications',
  name: 'Communications',
  fullName: 'Duncit Communications',
  tagline: 'Every message Duncit sends, in one place.',
  taglineKey: 'shell.portal.communications.tagline',
  promoTitle: 'Every message, one console',
  promoTitleKey: 'shell.portal.communications.promoTitle',
  promoText: 'Email, SMS, WhatsApp and push — what Duncit tells its members, and how it lands.',
  promoTextKey: 'shell.portal.communications.promoText',
  portalLabel: 'Communications Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/1591062/pexels-photo-1591062.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['COMMUNICATIONS_MANAGER']),
  tokenKey: 'communications_token',
  colorModeKey: 'communications_color_mode',
  accent: { light: '#67e8f9', main: '#0891b2', hover: '#0e7490', active: '#155e75' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Emails', labelKey: 'shell.nav.emails',
      icon: 'email',
      children: [
        // First: the board is where you look before you know which template or
        // which row you are after.
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/emails/dashboard', icon: 'dashboard' },
        { label: 'Templates', labelKey: 'shell.nav.templates', to: '/emails/templates', icon: 'description' },
        { label: 'Fragments', labelKey: 'shell.nav.fragments', to: '/emails/fragments', icon: 'widgets' },
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/emails/logs', icon: 'article' },
        // Connecting the mailbox only — the reply and the queue are Support's,
        // so the rest of this feature is in the Support portal.
        { label: 'Mail Automation', labelKey: 'shell.nav.mailAutomation', to: '/mail-automation', icon: 'markEmailRead' },
      ],
    },
    { label: 'WhatsApp', labelKey: 'shell.nav.whatsapp', to: '/whatsapp', icon: 'whatsapp' },
    { label: 'Slack', labelKey: 'shell.nav.slack', to: '/slack', icon: 'chat' },
    {
      // MSG91's own records of the OTP widget that carries every phone code —
      // read live from MSG91, never copied here. The keys themselves are under
      // Tech → Environment Variables → MSG91 (SMS OTP).
      label: 'MSG91 OTP Logs', labelKey: 'shell.nav.msg91OtpLogs',
      icon: 'phone',
      children: [
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/msg91-otp/logs', icon: 'article' },
        { label: 'Analytics', labelKey: 'shell.nav.analytics', to: '/msg91-otp/analytics', icon: 'analytics' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
