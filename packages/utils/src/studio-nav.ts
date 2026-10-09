/**
 * The partner studio menu — ONE definition that mWeb and the native app both
 * render (rule 56), so the two can no longer drift the way their hand-kept
 * copies did. The Partner console reads the same way: every studio is
 * Dashboard · Pods · Requests · Withdrawal (+ Venues for a venue owner), and
 * every option a studio ever had is still a row under one of those heads.
 *
 * Framework-free data only: copy is a translation KEY (each app translates),
 * the destination is given in both shapes — an mWeb path and a native route —
 * the same way `@duncit/onboarding`'s EARN_JOURNEYS does, and the icon is a
 * semantic name each app maps onto its own icon set.
 */
import { STUDIO_OPTIONS, type StudioMode } from './studio-mode';

/** What a row looks like, by meaning — each app picks its own glyph. */
export type StudioNavIcon =
  | 'dashboard'
  | 'pods'
  | 'autopods'
  | 'requests'
  | 'change'
  | 'nearby'
  | 'wallet'
  | 'venue'
  | 'availability'
  | 'settings'
  | 'earnings'
  | 'calendar'
  | 'monitoring'
  | 'ecomm';

export interface StudioNavItem {
  key: string;
  labelKey: string;
  icon: StudioNavIcon;
  /** mWeb path. */
  path: string;
  /** Native route name (every studio row opens a screen that takes no params). */
  route: string;
  /** Shown only while the `auto_pods` feature flag is on. */
  autoPods?: boolean;
}

export type StudioNavGroupKey = 'dashboard' | 'pods' | 'venues' | 'requests' | 'withdrawal';

export interface StudioNavGroup {
  key: StudioNavGroupKey;
  labelKey: string;
  items: StudioNavItem[];
}

export type PartnerStudioMode = Exclude<StudioMode, 'USER'>;

const WITHDRAWAL: StudioNavGroup = {
  key: 'withdrawal',
  labelKey: 'mweb.studioNav.withdrawalGroup',
  items: [
    {
      key: 'withdrawal',
      labelKey: 'mweb.studioNav.withdrawal',
      icon: 'wallet',
      path: '/host/wallet',
      route: 'Wallet',
    },
  ],
};

const CHANGE_REQUESTS: StudioNavItem = {
  key: 'change-requests',
  labelKey: 'mweb.studioNav.changeRequests',
  icon: 'change',
  path: '/change-requests',
  route: 'ChangeRequests',
};

/** Every studio's menu, in the order it reads. */
export const STUDIO_NAV: Readonly<Record<PartnerStudioMode, readonly StudioNavGroup[]>> = {
  HOST: [
    {
      key: 'dashboard',
      labelKey: 'mweb.studioNav.dashboardGroup',
      items: [
        { key: 'host-dashboard', labelKey: 'mweb.studioNav.dashboard', icon: 'dashboard', path: '/host/dashboard', route: 'HostDashboard' },
      ],
    },
    {
      key: 'pods',
      labelKey: 'mweb.studioNav.podsGroup',
      items: [
        { key: 'host-pods', labelKey: 'mweb.studioNav.yourPods', icon: 'pods', path: '/host/manage', route: 'HostManage' },
        { key: 'host-auto-pods', labelKey: 'mweb.studioNav.autoPods', icon: 'autopods', path: '/host/auto-pods', route: 'HostAutoPods', autoPods: true },
      ],
    },
    {
      key: 'requests',
      labelKey: 'mweb.studioNav.requestsGroup',
      items: [
        {
          key: 'host-pod-requests',
          labelKey: 'mweb.studioNav.podRequests',
          icon: 'requests',
          path: '/host/pod-requests',
          route: 'HostPodRequests',
        },
        CHANGE_REQUESTS,
        { key: 'host-nearby', labelKey: 'mweb.studioNav.nearbyVenues', icon: 'nearby', path: '/host/nearby-venues', route: 'NearbyVenues' },
      ],
    },
    WITHDRAWAL,
  ],
  VENUE: [
    {
      key: 'dashboard',
      labelKey: 'mweb.studioNav.dashboardGroup',
      items: [
        { key: 'venue-dashboard', labelKey: 'mweb.studioNav.dashboard', icon: 'dashboard', path: '/venues/manage', route: 'VenueManage' },
      ],
    },
    {
      key: 'venues',
      labelKey: 'mweb.studioNav.venuesGroup',
      items: [
        { key: 'venue-availability', labelKey: 'mweb.venueMenu.availability', icon: 'availability', path: '/venues/availability', route: 'VenueAvailability' },
        { key: 'venue-settings', labelKey: 'mweb.venueMenu.settings', icon: 'settings', path: '/venues/settings', route: 'VenueSettings' },
        { key: 'venue-earnings', labelKey: 'mweb.studioNav.venueEarnings', icon: 'earnings', path: '/venues/earnings', route: 'VenueEarnings' },
      ],
    },
    {
      key: 'pods',
      labelKey: 'mweb.studioNav.podsGroup',
      items: [
        { key: 'venue-slot-requests', labelKey: 'mweb.studioNav.slotRequests', icon: 'calendar', path: '/venues/slot-requests', route: 'VenueSlotRequests' },
        { key: 'venue-auto-pods', labelKey: 'mweb.studioNav.autoPods', icon: 'autopods', path: '/venues/auto-pods', route: 'VenueAutoPods', autoPods: true },
      ],
    },
    {
      key: 'requests',
      labelKey: 'mweb.studioNav.requestsGroup',
      items: [
        {
          key: 'venue-pod-requests',
          labelKey: 'mweb.studioNav.podRequests',
          icon: 'requests',
          path: '/venues/pod-requests',
          route: 'VenuePodRequests',
        },
        CHANGE_REQUESTS,
        { key: 'venue-nearby', labelKey: 'mweb.studioNav.nearbyHosts', icon: 'nearby', path: '/venues/nearby-hosts', route: 'NearbyHosts' },
      ],
    },
    WITHDRAWAL,
  ],
  CLUB: [
    {
      key: 'dashboard',
      labelKey: 'mweb.studioNav.dashboardGroup',
      items: [
        { key: 'club-dashboard', labelKey: 'mweb.clubMenu.dashboard', icon: 'dashboard', path: '/clubs/dashboard', route: 'ClubAdminDashboard' },
      ],
    },
    {
      key: 'pods',
      labelKey: 'mweb.studioNav.clubsGroup',
      items: [
        { key: 'club-studio', labelKey: 'mweb.studioNav.yourClubs', icon: 'pods', path: '/clubs/manage', route: 'ClubManage' },
        { key: 'club-auto-pods', labelKey: 'mweb.studioNav.autoPods', icon: 'autopods', path: '/clubs/auto-pods', route: 'ClubAutoPods', autoPods: true },
        { key: 'club-monitoring', labelKey: 'mweb.clubMenu.monitoring', icon: 'monitoring', path: '/clubs/monitoring', route: 'ClubPodMonitoring' },
      ],
    },
    {
      key: 'requests',
      labelKey: 'mweb.studioNav.requestsGroup',
      items: [CHANGE_REQUESTS],
    },
    WITHDRAWAL,
  ],
  ECOMM: [
    {
      key: 'dashboard',
      labelKey: 'mweb.studioNav.dashboardGroup',
      items: [
        { key: 'products-dashboard', labelKey: 'mweb.studioNav.dashboard', icon: 'ecomm', path: '/products/manage', route: 'ProductsManage' },
      ],
    },
    WITHDRAWAL,
  ],
};

/**
 * The menu for the studio the user is switched into, or `[]` in User mode or
 * when they no longer hold the studio's role. Auto Pods rows drop out while the
 * `auto_pods` flag is off (every group holds other rows, so none empties).
 */
export function studioNavFor(
  mode: StudioMode,
  roles: readonly string[],
  options: { autoPods: boolean },
): StudioNavGroup[] {
  // The role is still checked: a revoked role must not keep a persisted mode's menu alive.
  const allowed = STUDIO_OPTIONS.some(
    (option) => option.mode === mode && option.role !== undefined && roles.includes(option.role),
  );
  if (mode === 'USER' || !allowed) return [];
  return STUDIO_NAV[mode].map((group) => ({
    ...group,
    items: group.items.filter((item) => options.autoPods || !item.autoPods),
  }));
}
