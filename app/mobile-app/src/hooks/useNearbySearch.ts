import { useMemo, useState } from 'react';
import { POD_REQUEST_DEFAULT_RADIUS_KM, clampPodRequestRadius } from '@duncit/utils';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLocationStore } from '@/stores/location.store';

/**
 * A nearby search's own state: the radius (5 km to start) and the category
 * filter. Until the partner touches the chips the filter is `defaults` — the
 * venue's category or the host's categories; after that it is theirs,
 * including "All categories" (empty). The centre is the city + area picked in
 * the app's location picker. The slider moves freely; the search only re-runs
 * once it rests. mWeb twin: nearby-partners-page/useNearbySearch.
 */
export function useNearbySearch(defaults: readonly string[]) {
  const locationId = useLocationStore((s) => s.selectedId);
  const zoneName = useLocationStore((s) => s.zoneName);
  const cityLabel = useLocationStore((s) => s.cityLabel);
  const [radiusKm, setRadiusKm] = useState(POD_REQUEST_DEFAULT_RADIUS_KM);
  const searchKm = useDebouncedValue(radiusKm, 400);
  const [picked, setPicked] = useState<string[] | null>(null);
  const categoryIds = useMemo(() => picked ?? [...defaults], [picked, defaults]);

  const search = useMemo(
    () => ({
      location_id: locationId,
      zone_name: zoneName || null,
      radius_km: searchKm,
      category_ids: categoryIds,
    }),
    [locationId, zoneName, searchKm, categoryIds],
  );

  return {
    locationId,
    placeName: [zoneName, cityLabel].filter(Boolean).join(', '),
    radiusKm,
    setRadiusKm: (km: number) => setRadiusKm(clampPodRequestRadius(km)),
    categoryIds,
    setCategoryIds: setPicked,
    /** A different venue brings its own default category back. */
    resetCategories: () => setPicked(null),
    search,
  };
}

export type NearbySearchState = ReturnType<typeof useNearbySearch>;
