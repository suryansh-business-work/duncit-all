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
  key: 'crm',
  name: 'CRM',
  fullName: 'Duncit CRM',
  tagline: 'Track leads, manage contacts and move deals through the pipeline.',
  requiredRoles: envRoles.length ? envRoles : ['CRM_MANAGER'],
  tokenKey: 'crm_token',
  colorModeKey: 'crm_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  modules: [
    { title: 'Leads', description: 'Capture, qualify and assign inbound leads.', icon: 'groups' },
    { title: 'Contacts', description: 'Maintain a single view of every customer and company.', icon: 'contacts' },
    { title: 'Pipeline', description: 'Move opportunities through stages to close.', icon: 'timeline' },
    { title: 'Activity', description: 'Log calls, emails and follow-up tasks.', icon: 'support' },
  ],
};
