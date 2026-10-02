import { showsWaitlist } from '@duncit/utils';

import { useLocationStore } from '@/stores/location.store';

/**
 * Whether the selected city is not launched yet — Home then shows its
 * waitlist in the feed's place and drops the bottom nav and the
 * super-category switch: neither leads anywhere until the city launches.
 * Reads the store only; `useLocations` owns loading it. mWeb twin:
 * useComingSoonPage.
 */
export function useComingSoonCity(): boolean {
  return useLocationStore((s) => {
    const selected = s.data?.locations.find((loc) => loc.id === s.selectedId);
    return !!selected && showsWaitlist(selected);
  });
}
