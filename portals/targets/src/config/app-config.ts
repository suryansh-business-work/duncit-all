import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'targets',
  name: 'Targets',
  fullName: 'Duncit Targets',
  tagline: 'Every goal Duncit is chasing, in one place.',
  taglineKey: 'shell.portal.targets.tagline',
  promoTitle: 'Every target, one console',
  promoTitleKey: 'shell.portal.targets.promoTitle',
  promoText: 'Set the numbers each team is working towards and see how close they are.',
  promoTextKey: 'shell.portal.targets.promoText',
  portalLabel: 'Targets Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['TARGETS_MANAGER']),
  tokenKey: 'targets_token',
  colorModeKey: 'targets_color_mode',
  // Duncit's brand red, as Marketing uses it; the theme corrects it for AA contrast wherever it is text.
  accent: { light: '#fecaca', main: '#f82c2e', hover: '#d91f21', active: '#b51719' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Growth Calculator',
      labelKey: 'shell.nav.growthCalculator',
      to: '/growth-calculator',
      icon: 'insights',
    },
    { label: 'Employee Targets', labelKey: 'shell.nav.employeeTargets', to: '/employee-targets', icon: 'flag' },
    { label: 'Settings', labelKey: 'shell.nav.settings', to: '/settings', icon: 'settings' },
  ],
  modules: [],
} satisfies AppConfig;
