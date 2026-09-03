import type { AppNavItem } from '@duncit/shell';

/**
 * The four partner areas of this console. Each is an access the Onboarding
 * portal (on an approved application) or the Admin portal grants as a role, so
 * holding the role is the only thing that puts an area in the sidebar or lets
 * its routes render. Order here is sidebar order — and, via `landingPath()`,
 * which area `/` opens for somebody who holds more than one.
 */
export type PartnerRole = 'CLUB_ADMIN' | 'VENUE_OWNER' | 'HOST' | 'ECOMM_MANAGER';

export interface PartnerSection {
  role: PartnerRole;
  /** True for an area the `is_product_visible` system flag owns — with the flag
   * off it is not in the sidebar, its routes do not render, and `/` never lands
   * on it. E-Commerce Brand is the whole of it: listings, warehouses (ShipRocket
   * registration) and the brand dashboard. */
  products?: boolean;
  /** Route prefixes that belong to the area; `SectionGate` keeps them to the role. */
  paths: readonly string[];
  /** The sidebar group. Its first child is where `/` lands this role. */
  nav: AppNavItem;
  /** The area's Auto Pods route, for the sections that take part. */
  autoPodsTo?: string;
}

export const PARTNER_SECTIONS: readonly PartnerSection[] = [
  {
    role: 'CLUB_ADMIN',
    paths: ['/club-admin'],
    autoPodsTo: '/club-admin/auto-pods',
    nav: {
      label: 'Club Admin',
      icon: 'groups',
      children: [
        { label: 'Dashboard', to: '/club-admin/dashboard', icon: 'dashboard' },
        { label: 'Clubs', to: '/club-admin/clubs', icon: 'storefront' },
        {
          label: 'Change Requests',
          labelKey: 'changeRequest.sectionTitle',
          to: '/club-admin/change-requests',
          icon: 'rule',
        },
        { label: 'Pod Monitoring (AI)', to: '/club-admin/monitoring', icon: 'insights' },
      ],
    },
  },
  {
    role: 'VENUE_OWNER',
    paths: ['/venues', '/register-venue'],
    autoPodsTo: '/venues/auto-pods',
    nav: {
      label: 'Venue Owner',
      icon: 'storefront',
      children: [
        { label: 'Venue Dashboard', to: '/venues/dashboard', icon: 'analytics' },
        { label: 'Venue Management', to: '/register-venue', icon: 'storefront' },
        { label: 'Slot Requests', to: '/venues/requests', icon: 'calendar' },
        {
          label: 'Change Requests',
          labelKey: 'changeRequest.sectionTitle',
          to: '/venues/change-requests',
          icon: 'rule',
        },
        { label: 'Pods', to: '/venues/pods', icon: 'orders' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/venues/settings', icon: 'settings' },
      ],
    },
  },
  {
    role: 'HOST',
    paths: ['/host'],
    autoPodsTo: '/host/auto-pods',
    nav: {
      label: 'Host',
      icon: 'work',
      children: [
        { label: 'Dashboard', to: '/host/dashboard', icon: 'analytics' },
        { label: 'Your Pods', to: '/host/pods', icon: 'orders' },
        {
          label: 'Change Requests',
          labelKey: 'changeRequest.sectionTitle',
          to: '/host/change-requests',
          icon: 'rule',
        },
      ],
    },
  },
  {
    role: 'ECOMM_MANAGER',
    products: true,
    paths: ['/ecomm', '/ecomm-brand'],
    nav: {
      label: 'E-Commerce Brand',
      icon: 'marketplace',
      children: [
        { label: 'Dashboard', to: '/ecomm/dashboard', icon: 'analytics' },
        { label: 'Your Brands', to: '/ecomm-brand', icon: 'storefront' },
      ],
    },
  },
];

export const hasPartnerRole = (roles: readonly string[] | null | undefined, role: PartnerRole): boolean =>
  roles?.includes(role) ?? false;

const underPath = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The section a route belongs to, or `null` for the pages every signed-in user may open. */
export function sectionFor(pathname: string): PartnerSection | null {
  return PARTNER_SECTIONS.find((entry) => entry.paths.some((prefix) => underPath(pathname, prefix))) ?? null;
}

/** The role a route needs, or `null` for the pages every signed-in user may open. */
export function sectionRoleFor(pathname: string): PartnerRole | null {
  return sectionFor(pathname)?.role ?? null;
}

/** The partner areas a user may see: the ones they hold a role for, minus the
 * product area while the system flag is off. */
export function visibleSections(
  roles: readonly string[] | null | undefined,
  productsVisible: boolean,
): PartnerSection[] {
  return PARTNER_SECTIONS.filter(
    (section) => hasPartnerRole(roles, section.role) && (productsVisible || !section.products),
  );
}
