/**
 * The partner studio OPTIONS — one catalogue that mWeb, the native app and the
 * Partner console all render (rule 56). Switching into a studio puts ONE
 * highlighted entry in the sidebar ("Venue Options", "Host Options", …); it
 * opens the studio's Options page, a list of every option below with its hint.
 *
 * Framework-free data only: copy is a translation KEY, the icon is a semantic
 * name each app maps to its own glyph, and each destination is given in every
 * shape it has — an mWeb path, a native route, a Partner console path. An
 * option an app has no screen for (a brand's products in the app, say) opens
 * the Partner console there instead.
 */
import { STUDIO_OPTIONS as STUDIO_MODES, type StudioMode } from './studio-mode';

export type PartnerStudioMode = Exclude<StudioMode, 'USER'>;

/** What an option is, by meaning — each app picks its own glyph. */
export type StudioOptionIcon =
  | 'dashboard'
  | 'venue'
  | 'pods'
  | 'create'
  | 'autopods'
  | 'calendar'
  | 'availability'
  | 'settings'
  | 'earnings'
  | 'publish'
  | 'change'
  | 'requests'
  | 'nearby'
  | 'verification'
  | 'wallet'
  | 'clubs'
  | 'monitoring'
  | 'brands'
  | 'integrations'
  | 'returns'
  | 'orders'
  | 'warehouses';

export interface StudioOptionItem {
  key: string;
  labelKey: string;
  /** The one-line hint under the title — what the option is for. */
  hintKey: string;
  icon: StudioOptionIcon;
  /** mWeb path; absent → the option opens the Partner console (`portal`). */
  path?: string;
  /** Native route name (no params); absent → the option opens `portal`. */
  route?: string;
  /** Partner console path. */
  portal: string;
  /** Shown only while the `auto_pods` feature flag is on. */
  autoPods?: boolean;
}

/** Every studio's Options page entry — the ONE highlighted sidebar row. */
export interface StudioOptionsEntry {
  labelKey: string;
  hintKey: string;
  path: string;
  route: string;
  portal: string;
}

const VERIFICATION: StudioOptionItem = {
  key: 'verification',
  labelKey: 'mweb.studioOptions.verification',
  hintKey: 'mweb.studioOptions.verificationHint',
  icon: 'verification',
  path: '/verification',
  route: 'Verification',
  portal: '/verification',
};

const WITHDRAWAL: StudioOptionItem = {
  key: 'withdrawal',
  labelKey: 'mweb.studioOptions.withdrawal',
  hintKey: 'mweb.studioOptions.withdrawalHint',
  icon: 'wallet',
  path: '/host/wallet',
  route: 'Wallet',
  portal: '/wallet',
};

export const STUDIO_OPTIONS_ENTRY: Readonly<Record<PartnerStudioMode, StudioOptionsEntry>> = {
  VENUE: {
    labelKey: 'mweb.studioOptions.venueEntry',
    hintKey: 'mweb.studioOptions.venueEntryHint',
    path: '/venues/options',
    route: 'VenueOptions',
    portal: '/venues/options',
  },
  HOST: {
    labelKey: 'mweb.studioOptions.hostEntry',
    hintKey: 'mweb.studioOptions.hostEntryHint',
    path: '/host/options',
    route: 'HostOptions',
    portal: '/host/options',
  },
  CLUB: {
    labelKey: 'mweb.studioOptions.clubEntry',
    hintKey: 'mweb.studioOptions.clubEntryHint',
    path: '/clubs/options',
    route: 'ClubOptions',
    portal: '/club-admin/options',
  },
  ECOMM: {
    labelKey: 'mweb.studioOptions.brandEntry',
    hintKey: 'mweb.studioOptions.brandEntryHint',
    path: '/products/options',
    route: 'BrandOptions',
    portal: '/ecomm/options',
  },
};

/** Every studio's options, in the order its Options page lists them. */
export const STUDIO_OPTION_LIST: Readonly<Record<PartnerStudioMode, readonly StudioOptionItem[]>> = {
  VENUE: [
    { key: 'dashboard', labelKey: 'mweb.studioOptions.dashboard', hintKey: 'mweb.studioOptions.venueDashboardHint', icon: 'dashboard', path: '/venues/manage', route: 'VenueManage', portal: '/venues/dashboard' },
    { key: 'venues', labelKey: 'mweb.studioOptions.yourVenues', hintKey: 'mweb.studioOptions.yourVenuesHint', icon: 'venue', path: '/venues/list', route: 'VenueList', portal: '/register-venue' },
    { key: 'slot-requests', labelKey: 'mweb.studioOptions.slotRequests', hintKey: 'mweb.studioOptions.slotRequestsHint', icon: 'calendar', path: '/venues/slot-requests', route: 'VenueSlotRequests', portal: '/venues/requests' },
    { key: 'auto-pods', labelKey: 'mweb.studioOptions.autoPods', hintKey: 'mweb.studioOptions.venueAutoPodsHint', icon: 'autopods', path: '/venues/auto-pods', route: 'VenueAutoPods', portal: '/venues/auto-pods', autoPods: true },
    { key: 'availability', labelKey: 'mweb.studioOptions.availability', hintKey: 'mweb.studioOptions.availabilityHint', icon: 'availability', path: '/venues/availability', route: 'VenueAvailability', portal: '/venues/availability' },
    { key: 'settings', labelKey: 'mweb.studioOptions.venueSettings', hintKey: 'mweb.studioOptions.venueSettingsHint', icon: 'settings', path: '/venues/settings', route: 'VenueSettings', portal: '/venues/settings' },
    { key: 'earnings', labelKey: 'mweb.studioOptions.venueEarnings', hintKey: 'mweb.studioOptions.venueEarningsHint', icon: 'earnings', path: '/venues/earnings', route: 'VenueEarnings', portal: '/venues/earnings' },
    { key: 'publish', labelKey: 'mweb.studioOptions.publishVenue', hintKey: 'mweb.studioOptions.publishVenueHint', icon: 'publish', path: '/venues/publish', route: 'VenuePublish', portal: '/venues/publish' },
    { key: 'pods', labelKey: 'mweb.studioOptions.venuePods', hintKey: 'mweb.studioOptions.venuePodsHint', icon: 'pods', path: '/venues/pods', route: 'VenuePods', portal: '/venues/pods' },
    { key: 'change-requests', labelKey: 'mweb.studioOptions.changeRequests', hintKey: 'mweb.studioOptions.changeRequestsHint', icon: 'change', path: '/change-requests', route: 'ChangeRequests', portal: '/venues/change-requests' },
    { key: 'pod-requests', labelKey: 'mweb.studioOptions.podRequestsFromHosts', hintKey: 'mweb.studioOptions.podRequestsFromHostsHint', icon: 'requests', path: '/venues/pod-requests', route: 'VenuePodRequests', portal: '/venues/pod-requests' },
    { key: 'nearby', labelKey: 'mweb.studioOptions.nearbyHosts', hintKey: 'mweb.studioOptions.nearbyHostsHint', icon: 'nearby', path: '/venues/nearby-hosts', route: 'NearbyHosts', portal: '/venues/nearby-hosts' },
    VERIFICATION,
    WITHDRAWAL,
  ],
  HOST: [
    { key: 'dashboard', labelKey: 'mweb.studioOptions.dashboard', hintKey: 'mweb.studioOptions.hostDashboardHint', icon: 'dashboard', path: '/host/dashboard', route: 'HostDashboard', portal: '/host/dashboard' },
    { key: 'pods', labelKey: 'mweb.studioOptions.yourPods', hintKey: 'mweb.studioOptions.yourPodsHint', icon: 'pods', path: '/host/manage', route: 'HostManage', portal: '/host/pods' },
    { key: 'create', labelKey: 'mweb.studioOptions.createPod', hintKey: 'mweb.studioOptions.createPodHint', icon: 'create', path: '/create-pod', route: 'CreatePod', portal: '/host/pods?new=1' },
    { key: 'auto-pods', labelKey: 'mweb.studioOptions.autoPods', hintKey: 'mweb.studioOptions.hostAutoPodsHint', icon: 'autopods', path: '/host/auto-pods', route: 'HostAutoPods', portal: '/host/auto-pods', autoPods: true },
    { key: 'pod-requests', labelKey: 'mweb.studioOptions.podRequestsFromVenues', hintKey: 'mweb.studioOptions.podRequestsFromVenuesHint', icon: 'requests', path: '/host/pod-requests', route: 'HostPodRequests', portal: '/host/pod-requests' },
    { key: 'nearby', labelKey: 'mweb.studioOptions.nearbyVenues', hintKey: 'mweb.studioOptions.nearbyVenuesHint', icon: 'nearby', path: '/host/nearby-venues', route: 'NearbyVenues', portal: '/host/nearby-venues' },
    { key: 'change-requests', labelKey: 'mweb.studioOptions.changeRequests', hintKey: 'mweb.studioOptions.changeRequestsHint', icon: 'change', path: '/change-requests', route: 'ChangeRequests', portal: '/host/change-requests' },
    { key: 'publish', labelKey: 'mweb.studioOptions.publishHost', hintKey: 'mweb.studioOptions.publishHostHint', icon: 'publish', path: '/host/publish', route: 'HostPublish', portal: '/host/publish' },
    VERIFICATION,
    WITHDRAWAL,
  ],
  CLUB: [
    { key: 'dashboard', labelKey: 'mweb.studioOptions.dashboard', hintKey: 'mweb.studioOptions.clubDashboardHint', icon: 'dashboard', path: '/clubs/dashboard', route: 'ClubAdminDashboard', portal: '/club-admin/dashboard' },
    { key: 'clubs', labelKey: 'mweb.studioOptions.yourClubs', hintKey: 'mweb.studioOptions.yourClubsHint', icon: 'clubs', path: '/clubs/manage', route: 'ClubManage', portal: '/club-admin/clubs' },
    { key: 'auto-pods', labelKey: 'mweb.studioOptions.autoPods', hintKey: 'mweb.studioOptions.clubAutoPodsHint', icon: 'autopods', path: '/clubs/auto-pods', route: 'ClubAutoPods', portal: '/club-admin/auto-pods', autoPods: true },
    { key: 'monitoring', labelKey: 'mweb.studioOptions.podMonitoring', hintKey: 'mweb.studioOptions.podMonitoringHint', icon: 'monitoring', path: '/clubs/monitoring', route: 'ClubPodMonitoring', portal: '/club-admin/monitoring' },
    { key: 'change-requests', labelKey: 'mweb.studioOptions.changeRequests', hintKey: 'mweb.studioOptions.changeRequestsHint', icon: 'change', path: '/change-requests', route: 'ChangeRequests', portal: '/club-admin/change-requests' },
    VERIFICATION,
    WITHDRAWAL,
  ],
  ECOMM: [
    { key: 'dashboard', labelKey: 'mweb.studioOptions.dashboard', hintKey: 'mweb.studioOptions.brandDashboardHint', icon: 'dashboard', path: '/products/manage', route: 'ProductsManage', portal: '/ecomm/dashboard' },
    // The brand catalogue, its integrations and returns are Partner console
    // screens — the apps open them there. Orders and warehouses are worked in
    // the app too, so a brand can ship from wherever it is.
    { key: 'brands', labelKey: 'mweb.studioOptions.yourBrands', hintKey: 'mweb.studioOptions.yourBrandsHint', icon: 'brands', portal: '/ecomm-brand' },
    { key: 'integrations', labelKey: 'mweb.studioOptions.integrations', hintKey: 'mweb.studioOptions.integrationsHint', icon: 'integrations', portal: '/ecomm-brand/integrations' },
    { key: 'orders', labelKey: 'mweb.studioOptions.brandOrders', hintKey: 'mweb.studioOptions.brandOrdersHint', icon: 'orders', path: '/products/orders', route: 'BrandOrders', portal: '/ecomm-brand/orders' },
    { key: 'warehouses', labelKey: 'mweb.studioOptions.brandWarehouses', hintKey: 'mweb.studioOptions.brandWarehousesHint', icon: 'warehouses', path: '/products/warehouses', route: 'BrandWarehouses', portal: '/ecomm-brand/warehouses' },
    { key: 'returns', labelKey: 'mweb.studioOptions.productReturns', hintKey: 'mweb.studioOptions.productReturnsHint', icon: 'returns', portal: '/ecomm-brand/returns' },
    VERIFICATION,
    WITHDRAWAL,
  ],
};

/** The studio a role-holder may be in: the mode's role must still be held. */
function holdsStudio(mode: StudioMode, roles: readonly string[]): mode is PartnerStudioMode {
  return STUDIO_MODES.some(
    (option) => option.mode === mode && option.role !== undefined && roles.includes(option.role),
  );
}

/** The highlighted sidebar entry for the studio the user is in, or `null`. */
export function studioOptionsEntryFor(
  mode: StudioMode,
  roles: readonly string[],
): StudioOptionsEntry | null {
  return holdsStudio(mode, roles) ? STUDIO_OPTIONS_ENTRY[mode] : null;
}

/** The studio's options, minus Auto Pods while its flag is off; `[]` when the
 * user is not in a studio they hold. */
export function studioOptionsFor(
  mode: StudioMode,
  roles: readonly string[],
  options: { autoPods: boolean },
): StudioOptionItem[] {
  if (!holdsStudio(mode, roles)) return [];
  return STUDIO_OPTION_LIST[mode].filter((option) => options.autoPods || !option.autoPods);
}

