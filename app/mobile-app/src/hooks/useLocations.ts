import { useEffect } from 'react';

import { useLocationStore } from '@/stores/location.store';
import { useMeStore } from '@/stores/me.store';

/** Loads the active locations and exposes the selected city/zone + setters. */
export function useLocations() {
  const data = useLocationStore((s) => s.data);
  const isLoading = useLocationStore((s) => s.isLoading);
  const selectedId = useLocationStore((s) => s.selectedId);
  const zoneName = useLocationStore((s) => s.zoneName);
  const cityLabel = useLocationStore((s) => s.cityLabel);
  const countryCode = useLocationStore((s) => s.countryCode);
  const countryName = useLocationStore((s) => s.countryName);
  const fetch = useLocationStore((s) => s.fetch);
  const select = useLocationStore((s) => s.select);
  const clear = useLocationStore((s) => s.clear);
  const hydrateFromUser = useLocationStore((s) => s.hydrateFromUser);
  const savedLocationId = useMeStore((s) => s.data?.me?.selected_location_id);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Apply the user's saved header location once both it and the locations are
  // available (mWeb parity — its header hydrates from `me.selected_location_id`).
  useEffect(() => {
    hydrateFromUser(savedLocationId);
  }, [hydrateFromUser, savedLocationId, data]);

  return {
    locations: data?.locations ?? [],
    activeLocationIds: data?.activePodLocationIds ?? [],
    isLoading,
    selectedId,
    zoneName,
    cityLabel,
    countryCode,
    countryName,
    select,
    clear,
  };
}
