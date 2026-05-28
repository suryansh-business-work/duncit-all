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
  key: 'website-app',
  name: 'Website',
  fullName: 'Duncit Website',
  tagline: 'Manage website content, pages and publishing.',
  portalLabel: 'Website Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/8524940/pexels-photo-8524940.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['WEBSITE_MANAGER'],
  tokenKey: 'website_app_token',
  colorModeKey: 'website_app_color_mode',
  accent: { light: '#93c5fd', main: '#2563eb', hover: '#1d4ed8', active: '#1e40af' },
  nav: [
    { label: 'Welcome', to: '/', icon: 'dashboard' },
  ],
  modules: [],
};
