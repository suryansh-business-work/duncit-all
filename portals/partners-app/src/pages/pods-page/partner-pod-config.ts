import type { PodFormConfig } from '@duncit/pod-form';

/**
 * Shared `@duncit/pod-form` config for the partner + club-admin pod flows:
 * venue-slot picker on, products on, everything admin-only off (the host is
 * injected server-side, so hosts are off).
 */
export const PARTNER_POD_CONFIG: PodFormConfig = {
  showVenueSlot: true,
  showProducts: true,
  showReel: true,
  showHosts: false,
  showLocationZone: false,
  showPlaceCharges: false,
  showInventory: false,
  showFinance: false,
  showIsActive: false,
};

/** Partner clubs expose their linked venue ids directly on `meetup_venues_id`. */
export const getClubVenueIds = (club: any): string[] => club?.meetup_venues_id ?? [];
