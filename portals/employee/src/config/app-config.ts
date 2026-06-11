/**
 * Per-app configuration for the Duncit Employee console. Reusable configuration only —
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
  key: 'employee',
  name: 'Employee',
  fullName: 'Duncit Employee',
  tagline: 'Your profile, requests and workplace tools.',
  promoTitle: 'Your workday, simpler',
  promoText: 'Profile, payslips and requests in one place.',
  portalLabel: 'Employee Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/4974915/pexels-photo-4974915.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['EMPLOYEE'],
  tokenKey: 'employee_token',
  colorModeKey: 'employee_color_mode',
  accent: { light: '#5eead4', main: '#14b8a6', hover: '#0d9488', active: '#0f766e' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
};
