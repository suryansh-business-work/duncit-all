import { useQuery } from '@apollo/client';
import { AUTO_POD_LOCATIONS } from '@duncit/auto-pods';

interface AutoPodLocationRow {
  id: string;
  location_name: string;
}

/**
 * Names the selected location so an Auto Pod queue's location bar (and the
 * host's "will be set to" line) can say which city it is. Same root field the
 * header already fetched, so cache-first resolves it without a second call.
 */
export function useAutoPodCityLabel(locationId: string): string | undefined {
  const { data } = useQuery<{ locations: AutoPodLocationRow[] }>(AUTO_POD_LOCATIONS, {
    fetchPolicy: 'cache-first',
  });
  if (!locationId) return undefined;
  return data?.locations.find((row) => row.id === locationId)?.location_name;
}
