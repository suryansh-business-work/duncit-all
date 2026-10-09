import type { AppNavItem } from '@duncit/shell';

/**
 * The four partner areas of this console. Each is an access the Onboarding
 * portal (on an approved application) or the Admin portal grants as a role, so
 * holding the role is the only thing that lets an area's ROUTES render, and the
 * only thing that puts its own entries in the sidebar.
 *
 * Two of them (Host, E-Commerce Brand) also keep their sidebar group for
 * somebody who holds no role yet — see `onboarding` — because being invited in
 * is the point of this console for a not-yet-partner. Order here is sidebar
 * order — and, via `landingPath()`, which area `/` opens for somebody who holds
 * more than one.
 */
export type PartnerRole =
  | 'CLUB_ADMIN'
  | 'VENUE_OWNER'
  | 'HOST'
  | 'ECOMM_MANAGER';

export interface PartnerSection {
  role: PartnerRole;
  /** True for an area the `is_product_visible` system flag owns — with the flag
   * off it is not in the sidebar, its routes do not render, and `/` never lands
   * on it. E-Commerce Brand is the whole of it: listings, warehouses (ShipRocket
   * registration) and the brand dashboard. */
  products?: boolean;
  /** Route prefixes that belong to the area; `SectionGate` keeps them to the role. */
  paths: readonly string[];
  /** The studio: its name and icon (the switcher) and its short list of
   * entries (the sidebar while it is the active studio). Its first child is
   * where `/` and the switcher land this role. */
  nav: AppNavItem;
  /**
   * The ONE entry the group shows to somebody who does not hold the role yet.
   *
   * A section without it is simply absent until it is granted (Club Admin and
   * Venue Owner are reached from Earn with Duncit). Host and E-Commerce Brand
   * keep their dropdown either way, so the sidebar reads the same for a partner
   * and a not-yet-partner and the way IN is where the area itself is — the
   * entry opens the matching Earn with Duncit journey, not a dashboard with no
   * data behind it.
   */
  onboarding?: AppNavItem;
}

export const PARTNER_SECTIONS: readonly PartnerSection[] = [
  // Regional Club Admin used to be the first section here. It is its own
  // console now (regional-club-admin.duncit.com), because it was the one area
  // with no onboarding journey behind it: the role is an internal appointment
  // the Admin portal grants, not a partner application.
  //
  // Each studio reads the same way — Dashboard, Pods, Requests, Withdrawal —
  // with every option it ever had still in the menu, grouped under those
  // heads instead of listed flat. A group is also ONE page with tabs (see
  // pages/studio-hubs), and every option keeps its own route.
  {
    role: 'CLUB_ADMIN',
    paths: ['/club-admin'],
    nav: {
      label: 'Club Admin Studio',
      labelKey: 'shell.nav.clubAdminStudio',
      icon: 'groups',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/club-admin/dashboard', icon: 'dashboard' },
        {
          label: 'Clubs',
          labelKey: 'shell.nav.clubs',
          icon: 'groups',
          children: [
            { label: 'Clubs', labelKey: 'shell.nav.clubs', to: '/club-admin/clubs', icon: 'storefront' },
            { label: 'Auto Pods', labelKey: 'shell.nav.autoPods', to: '/club-admin/auto-pods', icon: 'handshake' },
            { label: 'Pod Monitoring (AI)', labelKey: 'shell.nav.podMonitoringAi', to: '/club-admin/monitoring', icon: 'insights' },
          ],
        },
        {
          label: 'Requests',
          labelKey: 'shell.nav.requests',
          icon: 'host-request',
          children: [
            { label: 'Change Requests', labelKey: 'changeRequest.sectionTitle', to: '/club-admin/change-requests', icon: 'rule' },
          ],
        },
        { label: 'Withdrawal', labelKey: 'shell.nav.withdrawal', to: '/wallet', icon: 'wallet' },
      ],
    },
  },
  {
    role: 'VENUE_OWNER',
    paths: ['/venues', '/register-venue'],
    nav: {
      label: 'Venue Studio',
      labelKey: 'shell.nav.venueStudio',
      icon: 'storefront',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/venues/dashboard', icon: 'dashboard' },
        {
          label: 'Venues',
          labelKey: 'shell.nav.venues',
          icon: 'storefront',
          children: [
            { label: 'Venue Management', labelKey: 'shell.nav.venueManagement', to: '/register-venue', icon: 'storefront' },
            { label: 'Settings', labelKey: 'shell.nav.settings', to: '/venues/settings', icon: 'settings' },
          ],
        },
        {
          label: 'Pods',
          labelKey: 'shell.nav.pods',
          icon: 'orders',
          children: [
            { label: 'Pods', labelKey: 'shell.nav.pods', to: '/venues/pods', icon: 'orders' },
            { label: 'Slot Requests', labelKey: 'shell.nav.slotRequests', to: '/venues/requests', icon: 'calendar' },
          ],
        },
        {
          label: 'Requests',
          labelKey: 'shell.nav.requests',
          icon: 'host-request',
          children: [
            { label: 'Pod Requests', labelKey: 'podRequests.navTitle', to: '/venues/pod-requests', icon: 'host-request' },
            { label: 'Change Requests', labelKey: 'changeRequest.sectionTitle', to: '/venues/change-requests', icon: 'rule' },
            { label: 'Auto Pods', labelKey: 'shell.nav.autoPods', to: '/venues/auto-pods', icon: 'handshake' },
            { label: 'Search Nearby Hosts', labelKey: 'podRequests.searchHostsTitle', to: '/venues/nearby-hosts', icon: 'user-search' },
          ],
        },
        { label: 'Withdrawal', labelKey: 'shell.nav.withdrawal', to: '/wallet', icon: 'wallet' },
      ],
    },
  },
  {
    role: 'HOST',
    paths: ['/host'],
    // Deliberately NOT `/become-host`: that is the application FORM, the half
    // of hosting that follows the onboarding meeting. The way in is the journey.
    onboarding: { label: 'Be a Host', labelKey: 'shell.nav.beAHost', to: '/be-a-host', icon: 'volunteer-activism' },
    nav: {
      label: 'Host Studio',
      labelKey: 'shell.nav.hostStudio',
      icon: 'work',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/host/dashboard', icon: 'dashboard' },
        {
          label: 'Pods',
          labelKey: 'shell.nav.pods',
          icon: 'orders',
          children: [
            { label: 'Your Pods', labelKey: 'shell.nav.yourPods', to: '/host/pods', icon: 'orders' },
            { label: 'Auto Pods', labelKey: 'shell.nav.autoPods', to: '/host/auto-pods', icon: 'handshake' },
          ],
        },
        {
          label: 'Requests',
          labelKey: 'shell.nav.requests',
          icon: 'host-request',
          children: [
            { label: 'Pod Requests', labelKey: 'podRequests.navTitle', to: '/host/pod-requests', icon: 'host-request' },
            { label: 'Change Requests', labelKey: 'changeRequest.sectionTitle', to: '/host/change-requests', icon: 'rule' },
            { label: 'Search Nearby Venues', labelKey: 'podRequests.searchVenuesTitle', to: '/host/nearby-venues', icon: 'location' },
          ],
        },
        { label: 'Withdrawal', labelKey: 'shell.nav.withdrawal', to: '/wallet', icon: 'wallet' },
      ],
    },
  },
  {
    role: 'ECOMM_MANAGER',
    products: true,
    paths: ['/ecomm', '/ecomm-brand'],
    onboarding: {
      label: 'Become an E-Commerce Brand Partner',
      labelKey: 'shell.nav.becomeAnECommerceBrandPartner',
      to: '/become-a-brand-partner',
      icon: 'volunteer-activism',
    },
    nav: {
      label: 'Brand Studio',
      labelKey: 'shell.nav.brandStudio',
      icon: 'marketplace',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/ecomm/dashboard', icon: 'dashboard' },
        {
          label: 'Brands',
          labelKey: 'shell.nav.brands',
          icon: 'marketplace',
          children: [
            { label: 'Your Brands', labelKey: 'shell.nav.yourBrands', to: '/ecomm-brand', icon: 'storefront' },
            // Razorpay / ShipRocket accounts saved once, then picked in each brand's wizard.
            { label: 'Integrations', labelKey: 'shell.nav.integrations', to: '/ecomm-brand/integrations', icon: 'hub' },
          ],
        },
        {
          label: 'Orders',
          labelKey: 'shell.nav.orders',
          icon: 'shipping',
          children: [
            // Buyer returns on the partner's brands: approve/reject, pickup, refund.
            { label: 'Product Returns', labelKey: 'shell.nav.productReturns', to: '/ecomm-brand/returns', icon: 'compare' },
          ],
        },
        { label: 'Withdrawal', labelKey: 'shell.nav.withdrawal', to: '/wallet', icon: 'wallet' },
      ],
    },
  },
];

export const hasPartnerRole = (roles: readonly string[] | null | undefined, role: PartnerRole): boolean =>
  roles?.includes(role) ?? false;

const underPath = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The Auto Pods options — in the menu only while the `auto_pods` flag is on. */
export const AUTO_POD_PATHS: readonly string[] = ['/club-admin/auto-pods', '/venues/auto-pods', '/host/auto-pods'];

/** The section a role names, or `null`. */
export function sectionByRole(role: string | null | undefined): PartnerSection | null {
  return PARTNER_SECTIONS.find((entry) => entry.role === role) ?? null;
}

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
