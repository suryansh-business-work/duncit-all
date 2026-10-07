import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useTranslation } from '@duncit/shell';
import { useUserData } from '@duncit/user-context';
import { POD_REQUEST_DEFAULT_RADIUS_KM, parseApiError } from '@duncit/utils';
import { NEARBY_SEARCH_HOST, NEARBY_VENUES, type NearbyVenueResult } from '../queries';
import { podRequestsPath } from '../side';
import type { NearbyCardData } from './NearbyResultCard';
import NearbyResults from './NearbyResults';
import NearbySearchLayout from './NearbySearchLayout';
import { usePodRequestQuota } from './QuotaLine';
import { useRequestPod } from './useRequestPod';

interface SearchHost {
  id: string;
  host_categories: { category_id?: string | null }[];
}

const toCard = (venue: NearbyVenueResult): NearbyCardData => ({
  id: venue.id,
  name: venue.venue_name,
  image: venue.cover_image_url,
  lines: [venue.category, [venue.locality, venue.city].filter(Boolean).join(', ')],
  distanceKm: venue.distance_km,
  openStatus: venue.open_request_status,
  round: false,
});

/**
 * Host → Search Nearby Venues. Centred on the city the host picked in the
 * app's location picker; the host's own categories are the starting filter.
 */
export default function NearbyVenuesPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const locationId = user?.selected_location_id ?? '';
  const hostQ = useQuery<{ myHost: SearchHost | null }>(NEARBY_SEARCH_HOST, { fetchPolicy: 'cache-first' });
  const [radiusKm, setRadiusKm] = useState(POD_REQUEST_DEFAULT_RADIUS_KM);
  const [categoryIds, setCategoryIds] = useState<string[] | null>(null);
  const hostDefaults = useMemo(
    () => [...new Set((hostQ.data?.myHost?.host_categories ?? []).flatMap((c) => (c.category_id ? [c.category_id] : [])))],
    [hostQ.data],
  );
  // Until the host touches the chips, the filter is their own categories.
  const activeCategories = categoryIds ?? hostDefaults;

  const venuesQ = useQuery<{ nearbyVenuesForHost: NearbyVenueResult[] }>(NEARBY_VENUES, {
    variables: { search: { location_id: locationId, radius_km: radiusKm, category_ids: activeCategories } },
    skip: !locationId || (hostQ.loading && !hostQ.data),
    fetchPolicy: 'cache-and-network',
  });
  const quota = usePodRequestQuota('HOST', null);
  const request = useRequestPod({
    search: NEARBY_VENUES,
    toInput: (item, note) => ({ direction: 'HOST_TO_VENUE', venue_id: item.id, note }),
  });
  const items = useMemo(() => (venuesQ.data?.nearbyVenuesForHost ?? []).map(toCard), [venuesQ.data]);

  return (
    <NearbySearchLayout
      title={t('podRequests.searchVenuesTitle')}
      backTo={podRequestsPath('HOST')}
      blocked={locationId ? null : t('podRequests.pickLocation')}
      quota={quota}
      radiusKm={radiusKm}
      onRadius={setRadiusKm}
      categoryIds={activeCategories}
      onCategories={setCategoryIds}
      request={request}
    >
      <NearbyResults
        loading={(venuesQ.loading && !venuesQ.data) || (hostQ.loading && !hostQ.data)}
        error={venuesQ.error ? parseApiError(venuesQ.error) : null}
        items={items}
        radiusKm={radiusKm}
        filtered={activeCategories.length > 0}
        searching={{
          title: t('podRequests.searchingVenues'),
          hint: t('podRequests.radiusValue', { vars: { km: radiusKm } }),
          icon: <StorefrontRoundedIcon fontSize="large" />,
        }}
        emptyText={t('podRequests.noVenuesFound', { vars: { km: radiusKm } })}
        canRequest={(quota?.remaining ?? 1) > 0}
        onRequest={request.open}
        onRadius={setRadiusKm}
        onAllCategories={() => setCategoryIds([])}
      />
    </NearbySearchLayout>
  );
}
