import type { AppNavItem } from '@duncit/shell';

/**
 * Per-app configuration for the Duncit Partners console. Reusable configuration
 * only — no dynamic business data. The `key` is the stable portal identifier
 * sent as `portal_key` on login and used by the shared shell.
 */
export type { AppNavItem } from '@duncit/shell';

export interface AppConfig {
  key: string;
  name: string;
  fullName: string;
  tokenKey: string;
  colorModeKey: string;
  requiredRoles: string[];
  nav: AppNavItem[];
}

export const appConfig: AppConfig = {
  key: 'partners',
  name: 'Partners',
  fullName: 'Duncit Partners',
  tokenKey: 'token',
  colorModeKey: 'partners_color_mode',
  // Partners is a portal-gate-exempt surface: any authenticated user may sign in
  // (e.g. to apply as a host / venue / brand), so there is no client-side role gate.
  requiredRoles: [],
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Venues',
      icon: 'storefront',
      children: [
        { label: 'Venue Dashboard', to: '/venues/dashboard', icon: 'analytics' },
        { label: 'Venue Management', to: '/register-venue', icon: 'storefront' },
        { label: 'Slot Requests', to: '/venues/requests', icon: 'calendar' },
      ],
    },
    { label: 'Host', to: '/become-host', icon: 'work' },
    { label: 'E-Commerce Brand', to: '/ecomm-brand', icon: 'marketplace' },
    { label: 'FAQs', to: '/faqs', icon: 'help' },
    { label: 'Support', to: '/support', icon: 'support' },
    { label: 'Policies', to: '/policies', icon: 'policy' },
  ],
};

/** Club Admin tools are shown only to users holding the CLUB_ADMIN role. */
const CLUB_ADMIN_NAV: AppNavItem = {
  label: 'Club Admin',
  icon: 'groups',
  children: [
    { label: 'Dashboard', to: '/club-admin/dashboard', icon: 'dashboard' },
    { label: 'Clubs', to: '/club-admin/clubs', icon: 'storefront' },
  ],
};

/** Sidebar nav for the signed-in user — appends Club Admin tools when entitled. */
export function buildNav(roles?: readonly string[] | null): AppNavItem[] {
  if (!roles?.includes('CLUB_ADMIN')) return appConfig.nav;
  const nav = [...appConfig.nav];
  // Keep Club Admin with the partner tools, before Help (FAQs).
  const helpIndex = nav.findIndex((item) => item.to === '/faqs');
  nav.splice(helpIndex === -1 ? nav.length : helpIndex, 0, CLUB_ADMIN_NAV);
  return nav;
}
