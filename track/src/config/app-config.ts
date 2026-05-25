/**
 * Per-app configuration. This is the single source of truth that makes the
 * shared shell (layout, login gating, theme accent, dashboard modules) behave
 * differently for each Duncit console. Everything here is reusable
 * configuration — no dynamic business data lives in this file.
 *
 * `requiredRoles` can be overridden at build/runtime via `VITE_REQUIRED_ROLES`
 * (comma separated) so access control stays dynamic without a code change.
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
  key: 'track',
  name: 'Track',
  fullName: 'Duncit Track',
  tagline: 'Follow orders, shipments and live delivery status end to end.',
  requiredRoles: envRoles.length ? envRoles : ['TRACK_MANAGER'],
  tokenKey: 'track_token',
  colorModeKey: 'track_color_mode',
  accent: { light: '#5eead4', main: '#0d9488', hover: '#0f766e', active: '#115e59' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [
    { title: 'Orders', description: 'Review incoming orders and their fulfilment status.', icon: 'orders' },
    { title: 'Shipments', description: 'Create, dispatch and manage shipments.', icon: 'shipping' },
    { title: 'Live Tracking', description: 'Monitor real-time location and delivery ETAs.', icon: 'location' },
    { title: 'Analytics', description: 'Measure delivery performance and SLAs.', icon: 'analytics' },
  ],
};
