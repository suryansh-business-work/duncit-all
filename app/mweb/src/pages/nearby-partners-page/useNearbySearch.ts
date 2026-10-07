import { useMemo, useState } from 'react';
import { POD_REQUEST_DEFAULT_RADIUS_KM, clampPodRequestRadius } from '@duncit/utils';
import { useAppLocation } from '../../app/AppLocationContext';
import type { NearbySearchInput } from './queries';

/**
 * The search's own state: the radius (5 km to start) and the category filter.
 * Until the partner touches the chips the filter is `defaults` — the venue's
 * category or the host's categories; after that it is theirs, including
 * "All categories" (empty). The centre is the header's city + area.
 */
export function useNearbySearch(defaults: readonly string[]) {
  const { locationId, zoneName } = useAppLocation();
  const [radiusKm, setRadiusKm] = useState(POD_REQUEST_DEFAULT_RADIUS_KM);
  const [picked, setPicked] = useState<string[] | null>(null);
  const categoryIds = useMemo(() => picked ?? [...defaults], [picked, defaults]);

  const search = useMemo<NearbySearchInput>(
    () => ({ location_id: locationId, zone_name: zoneName || null, radius_km: radiusKm, category_ids: categoryIds }),
    [locationId, zoneName, radiusKm, categoryIds]
  );

  return {
    locationId,
    zoneName,
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
