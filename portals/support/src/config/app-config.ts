import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'support',
  name: 'Support',
  fullName: 'Duncit Support',
  tagline: 'Handle customer tickets and support conversations.',
  taglineKey: 'shell.portal.support.tagline',
  promoTitle: 'One unified desk',
  promoTitleKey: 'shell.portal.support.promoTitle',
  promoText: 'Every ticket, every conversation — one place. Sign in and get moving.',
  promoTextKey: 'shell.portal.support.promoText',
  portalLabel: 'Support Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/5453823/pexels-photo-5453823.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['SUPPORT_MANAGER']),
  tokenKey: 'support_token',
  colorModeKey: 'support_color_mode',
  accent: { light: '#6ee7b7', main: '#10b981', hover: '#059669', active: '#047857' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'SOS Alerts', labelKey: 'shell.nav.sosAlerts', to: '/sos', icon: 'sos' },
    { label: 'Callback Requests', labelKey: 'shell.nav.callbackRequests', to: '/callbacks', icon: 'callback' },
    { label: 'Tickets', labelKey: 'shell.nav.tickets', to: '/tickets', icon: 'ticket' },
    { label: 'Chat with Us', labelKey: 'shell.nav.chatWithUs', to: '/live-chat', icon: 'chat' },
    { label: 'Mail Automation', labelKey: 'shell.nav.mailAutomation', to: '/mail-automation', icon: 'markEmailRead' },
    {
      // A group header, not a link: the two children are the list and the
      // config that decides what the app's form even offers.
      label: 'Reported Problems', labelKey: 'shell.nav.reportedProblems',
      icon: 'ticket',
      children: [
        { label: 'Problems', labelKey: 'shell.nav.problems', to: '/reported-problems', icon: 'ticket' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/reported-problems/settings', icon: 'settings' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
