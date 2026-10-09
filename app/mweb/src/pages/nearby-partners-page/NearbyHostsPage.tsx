import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import { MY_POD_PARTNER_REQUESTS } from '../pod-requests/queries';
import { useTranslation } from '../../i18n/useTranslation';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import type { NearbyItem } from './NearbyCard';
import NearbySearchBody from './NearbySearchBody';
import {
  NEARBY_HOSTS_FOR_VENUE,
  POD_REQUEST_QUOTA,
  SEARCH_OWNER_VENUES,
  SEND_POD_PARTNER_REQUEST,
  type NearbyHostRow,
} from './queries';
import { useNearbySearch } from './useNearbySearch';

const toItem = (host: NearbyHostRow): NearbyItem => ({
  id: host.user_id,
  kind: 'HOST',
  name: host.name,
  imageUrl: host.photo_url,
  category: host.categories.join(' · '),
  place: '',
  distanceKm: host.distance_km,
  openStatus: host.open_request_status,
});

/**
 * Venue Studio → Search Nearby Hosts: approved hosts around the header's
 * location, for one of the owner's approved venues, filtered to the venue's
 * category to start. "Request Pod" sends a VENUE_TO_HOST request.
 */
export default function NearbyHostsPage() {
  const { t } = useTranslation();
  const venuesQuery = useQuery(SEARCH_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const venues = useMemo(
    () => (venuesQuery.data?.myVenues ?? []).filter((row) => row.status === 'APPROVED'),
    [venuesQuery.data]
  );
  const { venue, selectVenue } = useSelectedVenue(venues);
  const venueId = venue?.id ?? '';
  const venueCategory = venue?.venue_category.category_id ?? '';
  const defaults = useMemo(() => (venueCategory ? [venueCategory] : []), [venueCategory]);
  const state = useNearbySearch(defaults);

  const hostsQuery = useQuery(NEARBY_HOSTS_FOR_VENUE, {
    variables: { venue_id: venueId, search: state.search },
    skip: !venueId || !state.locationId,
    fetchPolicy: 'cache-and-network',
  });
  const quotaQuery = useQuery(POD_REQUEST_QUOTA, {
    variables: { side: 'VENUE', venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const [sendRequest, sendState] = useMutation(SEND_POD_PARTNER_REQUEST, {
    refetchQueries: [NEARBY_HOSTS_FOR_VENUE, POD_REQUEST_QUOTA, MY_POD_PARTNER_REQUESTS],
    awaitRefetchQueries: true,
  });

  const items = useMemo(() => (hostsQuery.data?.nearbyHostsForVenue ?? []).map(toItem), [hostsQuery.data]);
  const send = (item: NearbyItem, note: string) =>
    sendRequest({
      variables: { input: { direction: 'VENUE_TO_HOST', venue_id: venueId, host_user_id: item.id, note: note || null } },
    });

  return (
    <VenuePageFrame
      icon={<PersonSearchRoundedIcon fontSize="small" />}
      title={t('podRequests.searchHostsTitle')}
      venues={venues}
      venue={venue}
      onSelect={(id) => {
        selectVenue(id);
        state.resetCategories();
      }}
      loading={venuesQuery.loading && !venuesQuery.data}
      error={venuesQuery.error}
      noVenuesMessage={t('podRequests.noApprovedVenue')}
    >
      <NearbySearchBody
        kind="HOST"
        state={state}
        items={items}
        loading={hostsQuery.loading && !hostsQuery.data}
        error={hostsQuery.error?.message ?? quotaQuery.error?.message ?? null}
        quota={quotaQuery.data?.podPartnerRequestQuota ?? null}
        sending={sendState.loading}
        send={send}
      />
    </VenuePageFrame>
  );
}
