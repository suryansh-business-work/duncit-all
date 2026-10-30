import type { PodFormConfig } from '@duncit/pod-form';

/**
 * Shared `@duncit/pod-form` config for the partner + club-admin pod flows:
 * venue-slot picker on, products on, everything admin-only off (the host is
 * injected server-side, so hosts are off). The author is the pod's host, so a
 * FREE pod needs the free justification (`createPartnerPod` refuses one without).
 */
export const PARTNER_POD_CONFIG: PodFormConfig = {
  showVenueSlot: true,
  showProducts: true,
  showReel: true,
  requireFreeJustification: true,
  showHosts: false,
  showLocationZone: false,
  showPlaceCharges: false,
  showInventory: false,
  showFinance: false,
  showIsActive: false,
};
