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
    {
      label: 'E-Commerce Brand',
      icon: 'marketplace',
      children: [
        { label: 'Dashboard', to: '/ecomm/dashboard', icon: 'analytics' },
        { label: 'Your Brands', to: '/ecomm-brand', icon: 'storefront' },
      ],
    },
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
    { label: 'Pod Monitoring (AI)', to: '/club-admin/monitoring', icon: 'insights' },
  ],
};

/** Wallet/Withdrawal is shown to partner roles that can earn payouts. */
const WALLET_NAV: AppNavItem = { label: 'Wallet', to: '/wallet', icon: 'wallet' };
const EARNING_ROLES = new Set(['HOST', 'VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER']);

/** Sidebar nav for the signed-in user — appends Club Admin tools when entitled
 * and a Wallet entry for roles that can earn payouts. Both slot in before Help
 * (FAQs), keeping the partner tools grouped together. */
export function buildNav(roles?: readonly string[] | null): AppNavItem[] {
  const isClubAdmin = roles?.includes('CLUB_ADMIN') ?? false;
  const isEarner = roles?.some((role) => EARNING_ROLES.has(role)) ?? false;
  if (!isClubAdmin && !isEarner) return appConfig.nav;
  const nav = [...appConfig.nav];
  const helpIndex = () => {
    const index = nav.findIndex((item) => item.to === '/faqs');
    return index === -1 ? nav.length : index;
  };
  if (isClubAdmin) nav.splice(helpIndex(), 0, CLUB_ADMIN_NAV);
  if (isEarner) nav.splice(helpIndex(), 0, WALLET_NAV);
  return nav;
}
