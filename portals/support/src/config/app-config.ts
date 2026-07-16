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
  promoTitle: 'One unified desk',
  promoText: 'Every ticket, every conversation — one place. Sign in and get moving.',
  portalLabel: 'Support Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/5453823/pexels-photo-5453823.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['SUPPORT_MANAGER']),
  tokenKey: 'support_token',
  colorModeKey: 'support_color_mode',
  accent: { light: '#6ee7b7', main: '#10b981', hover: '#059669', active: '#047857' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'SOS Alerts', to: '/sos', icon: 'sos' },
    { label: 'Callback Requests', to: '/callbacks', icon: 'callback' },
    { label: 'Tickets', to: '/tickets', icon: 'ticket' },
    { label: 'Chat with Us', to: '/live-chat', icon: 'chat' },
  ],
  modules: [],
} satisfies AppConfig;
