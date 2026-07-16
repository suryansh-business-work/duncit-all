import type { PodFormConfig } from './types';

/**
 * Portal config mirroring the native app's create-pod flow: venue slots drive
 * the date/time, place charges and the Explore reel are on, and hosts are
 * assignable (optional — the server injects the actor when none is supplied).
 * Products follow the caller's feature flag.
 *
 * Club-admin uses it as-is; Admin spreads its extras on top
 * (finance/inventory/is_active + required hosts).
 */
export function makeNativeParityPodConfig({
  showProducts,
}: Readonly<{ showProducts: boolean }>): PodFormConfig {
  return {
    showHosts: true,
    requireHosts: false,
    showLocationZone: false,
    showVenueSlot: true,
    showPlaceCharges: true,
    showInventory: false,
    showFinance: false,
    showIsActive: false,
    showProducts,
    showReel: true,
  };
}
