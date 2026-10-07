import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import { MY_POD_PARTNER_REQUESTS } from '../pod-requests/queries';
import { useTranslation } from '../../i18n/useTranslation';
import type { NearbyItem } from './NearbyCard';
import NearbySearchBody from './NearbySearchBody';
import {
  NEARBY_VENUES_FOR_HOST,
  POD_REQUEST_QUOTA,
  SEARCH_HOST_CATEGORIES,
  SEND_POD_PARTNER_REQUEST,
  type NearbyVenueRow,
} from './queries';
import { useNearbySearch } from './useNearbySearch';

const toItem = (venue: NearbyVenueRow): NearbyItem => ({
  id: venue.id,
  kind: 'VENUE',
  name: venue.venue_name,
  imageUrl: venue.cover_image_url,
  category: venue.category,
  place: [venue.locality, venue.city].filter(Boolean).join(', '),
  distanceKm: venue.distance_km,
  openStatus: venue.open_request_status,
});

/**
 * Host Studio → Search Nearby Venues: approved venues around the header's
 * location, filtered to the host's own categories to start. "Request Pod"
 * sends a HOST_TO_VENUE request.
 */
export default function NearbyVenuesPage() {
  const { t } = useTranslation();
  const hostQuery = useQuery(SEARCH_HOST_CATEGORIES, { fetchPolicy: 'cache-and-network' });
  const hostCategories = hostQuery.data?.myHost?.host_categories;
  const defaults = useMemo(
    () => [...new Set((hostCategories ?? []).map((row) => row.category_id ?? '').filter(Boolean))],
    [hostCategories]
  );
  const state = useNearbySearch(defaults);

  // Waits for the host's categories so the first search already carries them.
  const venuesQuery = useQuery(NEARBY_VENUES_FOR_HOST, {
    variables: { search: state.search },
    skip: !state.locationId || !hostQuery.data,
    fetchPolicy: 'cache-and-network',
  });
  const quotaQuery = useQuery(POD_REQUEST_QUOTA, { variables: { side: 'HOST' }, fetchPolicy: 'cache-and-network' });
  const [sendRequest, sendState] = useMutation(SEND_POD_PARTNER_REQUEST, {
    refetchQueries: [NEARBY_VENUES_FOR_HOST, POD_REQUEST_QUOTA, MY_POD_PARTNER_REQUESTS],
    awaitRefetchQueries: true,
  });

  const items = useMemo(() => (venuesQuery.data?.nearbyVenuesForHost ?? []).map(toItem), [venuesQuery.data]);
  const send = (item: NearbyItem, note: string) =>
    sendRequest({ variables: { input: { direction: 'HOST_TO_VENUE', venue_id: item.id, note: note || null } } });
  const waiting = (hostQuery.loading && !hostQuery.data) || (venuesQuery.loading && !venuesQuery.data);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="nearby-venues-page">
      <StudioPageHeader icon={<TravelExploreRoundedIcon fontSize="small" />} title={t('podRequests.searchVenuesTitle')} />
      <NearbySearchBody
        kind="VENUE"
        state={state}
        items={items}
        loading={waiting}
        error={hostQuery.error?.message ?? venuesQuery.error?.message ?? quotaQuery.error?.message ?? null}
        quota={quotaQuery.data?.podPartnerRequestQuota ?? null}
        sending={sendState.loading}
        send={send}
      />
    </Stack>
  );
}
