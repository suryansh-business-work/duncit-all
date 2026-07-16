/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'developers',
  name: 'Developers',
  fullName: 'Duncit Developers',
  tagline: 'API keys and venue APIs — availability, slots and bookings.',
  promoTitle: 'Build on Duncit',
  promoText:
    'Generate API keys and integrate venue discovery, slot availability and slot booking into your own products.',
  portalLabel: 'Developers Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['DEVELOPERS_MANAGER']),
  tokenKey: 'developers_token',
  colorModeKey: 'developers_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'API Keys', to: '/keys', icon: 'key' },
    { label: 'API Reference', to: '/docs', icon: 'docs' },
  ],
  modules: [],
} satisfies AppConfig;
