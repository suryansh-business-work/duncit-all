/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via
 * `VITE_REQUIRED_ROLES` so access control stays dynamic.
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
  key: 'tech',
  name: 'Tech',
  fullName: 'Duncit Tech',
  tagline: 'Manage platform configuration and environment variables.',
  promoTitle: "Ship with control",
  promoText: "Environment, feature flags and platform config in one console.",
  portalLabel: 'Tech Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/6804068/pexels-photo-6804068.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['TECH_MANAGER'],
  tokenKey: 'tech_token',
  colorModeKey: 'tech_color_mode',
  accent: { light: '#94a3b8', main: '#0ea5e9', hover: '#0284c7', active: '#0369a1' },
  nav: [
    { label: 'Environment', to: '/', icon: 'settings' },
    { label: 'Portal Mapping', to: '/portal-env', icon: 'hub' },
    { label: 'Comms Providers', to: '/comms-providers', icon: 'forum' },
    { label: 'Maintenance', to: '/portal-modes', icon: 'construction' },
    { label: 'Feature Flags', to: '/feature-flags', icon: 'flag' },
    { label: 'Authentication', to: '/authentication', icon: 'lock' },
  ],
  modules: [],
};
