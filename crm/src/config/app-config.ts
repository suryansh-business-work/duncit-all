/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). Reusable configuration only.
 * `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
export interface AppNavItem {
  label: string;
  /** Route the item links to. Optional when the item is purely a group header. */
  to?: string;
  icon: string;
  /** Optional nested children (one level deep) — rendered as a collapsible group. */
  children?: AppNavItem[];
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
  key: 'crm',
  name: 'CRM',
  fullName: 'Duncit CRM',
  tagline: 'Capture, qualify and convert venue and host leads.',
  portalLabel: 'CRM Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7658434/pexels-photo-7658434.jpeg',
  requiredRoles: envRoles.length ? envRoles : ['CRM_MANAGER'],
  tokenKey: 'crm_token',
  colorModeKey: 'crm_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Venue Leads',
      to: '/venue-leads',
      icon: 'location',
      children: [
        { label: 'All Venue Leads', to: '/venue-leads', icon: 'location' },
        { label: 'Manage Venue Services', to: '/venue-leads/services', icon: 'analytics' },
      ],
    },
    {
      label: 'Host Leads',
      to: '/host-leads',
      icon: 'groups',
      children: [
        { label: 'All Host Leads', to: '/host-leads', icon: 'groups' },
        { label: 'Manage Host Services', to: '/host-leads/services', icon: 'analytics' },
      ],
    },
  ],
  modules: [],
};
