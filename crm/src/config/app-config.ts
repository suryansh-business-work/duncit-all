/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). Reusable configuration only.
 * `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
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
  key: 'crm',
  name: 'CRM',
  fullName: 'Duncit CRM',
  tagline: 'Capture, qualify and convert venue and host leads.',
  requiredRoles: envRoles.length ? envRoles : ['CRM_MANAGER'],
  tokenKey: 'crm_token',
  colorModeKey: 'crm_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Venue Leads', to: '/', icon: 'location' },
    { label: 'Host Leads', to: '/host-leads', icon: 'groups' },
  ],
  modules: [],
};
