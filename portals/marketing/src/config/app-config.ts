/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'marketing',
  name: 'Marketing',
  fullName: 'Duncit Marketing',
  tagline: 'Plan campaigns and brand content.',
  promoTitle: "Reach, amplified",
  promoText: "Campaigns, notifications and audiences — one place.",
  portalLabel: 'Marketing Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7693745/pexels-photo-7693745.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['MARKETING_MANAGER']),
  tokenKey: 'marketing_token',
  colorModeKey: 'marketing_color_mode',
  accent: { light: '#fda4af', main: '#e11d48', hover: '#be123c', active: '#9f1239' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Email Campaigns', to: '/campaigns/email', icon: 'email' },
    { label: 'WhatsApp Campaigns', to: '/campaigns/whatsapp', icon: 'whatsapp' },
    { label: 'Notifications', to: '/notifications', icon: 'notifications' },
  ],
  modules: [],
} satisfies AppConfig;
