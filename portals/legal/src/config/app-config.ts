import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'legal',
  name: 'Legal',
  fullName: 'Duncit Legal',
  tagline: 'Manage contracts, policies and compliance.',
  promoTitle: "Compliance, organized",
  promoText: "Policies, agreements and legal records — one place.",
  portalLabel: 'Legal Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7841459/pexels-photo-7841459.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['LEGAL_MANAGER']),
  tokenKey: 'legal_token',
  colorModeKey: 'legal_color_mode',
  accent: { light: '#c4b5fd', main: '#7c3aed', hover: '#6d28d9', active: '#5b21b6' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Documents', to: '/documents', icon: 'document' },
    { label: 'Policies', to: '/policies', icon: 'policy' },
  ],
  modules: [],
} satisfies AppConfig;
