/**
 * Per-app configuration for the Duncit HR console. Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
export interface AppNavItem { label: string; to: string; icon: string; }
export interface AppModule { title: string; description: string; icon: string; }
export interface AccentColors { light: string; main: string; hover: string; active: string; }

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
  key: 'hr',
  name: 'HR',
  fullName: 'Duncit HR',
  tagline: 'Manage people, attendance and HR operations.',
  promoTitle: 'People, organised',
  promoText: 'Directory, leave and HR operations in one console.',
  portalLabel: 'HR Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['HR_MANAGER'],
  tokenKey: 'hr_token',
  colorModeKey: 'hr_color_mode',
  accent: { light: '#d8b4fe', main: '#9333ea', hover: '#7e22ce', active: '#6b21a8' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
};
