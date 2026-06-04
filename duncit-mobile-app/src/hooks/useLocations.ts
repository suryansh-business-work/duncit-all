import { useEffect } from 'react';

import { useLocationStore } from '@/stores/location.store';

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

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    locations: data?.locations ?? [],
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
