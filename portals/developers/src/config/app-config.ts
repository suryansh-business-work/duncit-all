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
  requiredRoles: envRoles.length ? envRoles : ['DEVELOPERS_MANAGER'],
  tokenKey: 'developers_token',
  colorModeKey: 'developers_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'API Keys', to: '/keys', icon: 'key' },
    { label: 'API Reference', to: '/docs', icon: 'docs' },
  ],
  modules: [],
};
