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
  key: 'legal',
  name: 'Legal',
  fullName: 'Duncit Legal',
  tagline: 'Manage contracts, policies and compliance.',
  portalLabel: 'Legal Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7841459/pexels-photo-7841459.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['LEGAL_MANAGER'],
  tokenKey: 'legal_token',
  colorModeKey: 'legal_color_mode',
  accent: { light: '#c4b5fd', main: '#7c3aed', hover: '#6d28d9', active: '#5b21b6' },
  nav: [
    { label: 'Welcome', to: '/', icon: 'dashboard' },
  ],
  modules: [],
};
