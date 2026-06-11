/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export interface AppNavItem {
  label: string;
  to: string;
  icon: string;
}

export interface AppModule {
  title: string;
  description: string;
  icon: string;
}

export interface AccentColors {
  light: string;
  main: string;
  hover: string;
  active: string;
}

export interface AppConfig {
  key: string;
  name: string;
  fullName: string;
  tagline: string;
  promoTitle: string;
  promoText: string;
  portalLabel: string;
  loginImage: string;
  requiredRoles: string[];
  tokenKey: string;
  colorModeKey: string;
  accent: AccentColors;
  nav: AppNavItem[];
  modules: AppModule[];
}

const envRoles = String(import.meta.env.VITE_REQUIRED_ROLES ?? '')
  .split(',')
  .map((role: string) => role.trim())
  .filter(Boolean);

export const appConfig: AppConfig = {
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
  requiredRoles: envRoles.length ? envRoles : ['SUPPORT_MANAGER'],
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
};
