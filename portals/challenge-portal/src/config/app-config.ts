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
  key: 'challenge',
  name: 'Challenges',
  fullName: 'Duncit Challenges',
  tagline: 'Create and manage challenges across categories.',
  promoTitle: 'Challenges, organized',
  promoText: 'Build challenges scoped by super, category and sub-category — all in one place.',
  portalLabel: 'Challenges Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['CHALLENGE_MANAGER'],
  tokenKey: 'challenge_token',
  colorModeKey: 'challenge_color_mode',
  accent: { light: '#fdba74', main: '#f97316', hover: '#ea580c', active: '#c2410c' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Challenges', to: '/challenges', icon: 'challenge' },
  ],
  modules: [],
};
