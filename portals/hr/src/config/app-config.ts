/**
 * Per-app configuration for the Duncit HR console. Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
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
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['HR_MANAGER']),
  tokenKey: 'hr_token',
  colorModeKey: 'hr_color_mode',
  accent: { light: '#d8b4fe', main: '#9333ea', hover: '#7e22ce', active: '#6b21a8' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [],
} satisfies AppConfig;
