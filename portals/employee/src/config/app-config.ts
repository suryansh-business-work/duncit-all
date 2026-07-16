/**
 * Per-app configuration for the Duncit Employee console. Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
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
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['EMPLOYEE']),
  tokenKey: 'employee_token',
  colorModeKey: 'employee_color_mode',
  accent: { light: '#5eead4', main: '#14b8a6', hover: '#0d9488', active: '#0f766e' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
} satisfies AppConfig;
