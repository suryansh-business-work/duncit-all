import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useTranslation } from '@duncit/shell';
import { POD_REQUEST_DEFAULT_RADIUS_KM, parseApiError } from '@duncit/utils';
import { NEARBY_HOSTS, NEARBY_SEARCH_VENUES, type NearbyHostResult, type SearchVenue } from '../queries';
import { podRequestsPath } from '../side';
import type { NearbyCardData } from './NearbyResultCard';
import NearbyResults from './NearbyResults';
import NearbySearchLayout from './NearbySearchLayout';
import { usePodRequestQuota } from './QuotaLine';
import { useRequestPod } from './useRequestPod';

const defaultCategories = (venue: SearchVenue | null) =>
  venue?.venue_category.category_id ? [venue.venue_category.category_id] : [];

const toCard = (host: NearbyHostResult): NearbyCardData => ({
  id: host.user_id,
  name: host.name,
  image: host.photo_url,
  lines: [host.categories.join(', ')],
  distanceKm: host.distance_km,
  openStatus: host.open_request_status,
  round: true,
});

/**
 * Venue Owner → Search Nearby Hosts. Centred on the chosen venue's own city and
 * area; the venue's category is the starting filter.
 */
export default function NearbyHostsPage() {
  const { t } = useTranslation();
  const venuesQ = useQuery<{ myVenues: SearchVenue[] }>(NEARBY_SEARCH_VENUES, { fetchPolicy: 'cache-and-network' });
  const venues = useMemo(
    () => (venuesQ.data?.myVenues ?? []).filter((venue) => venue.status === 'APPROVED' && venue.is_active),
    [venuesQ.data],
  );
  const [picked, setPicked] = useState('');
  const venue = venues.find((v) => v.id === picked) ?? venues[0] ?? null;
  const [radiusKm, setRadiusKm] = useState(POD_REQUEST_DEFAULT_RADIUS_KM);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  // The filter starts from each venue's own category whenever the venue changes.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (venue && seededFor !== venue.id) {
    setSeededFor(venue.id);
    setCategoryIds(defaultCategories(venue));
  }

  const locationId = venue?.location_id ?? '';
  const hostsQ = useQuery<{ nearbyHostsForVenue: NearbyHostResult[] }>(NEARBY_HOSTS, {
    variables: {
      venue_id: venue?.id ?? '',
      search: { location_id: locationId, zone_name: venue?.locality || null, radius_km: radiusKm, category_ids: categoryIds },
    },
    skip: !venue || !locationId,
    fetchPolicy: 'cache-and-network',
  });
  const quota = usePodRequestQuota('VENUE', venue?.id ?? null);
  const request = useRequestPod({
    search: NEARBY_HOSTS,
    toInput: (item, note) => ({ direction: 'VENUE_TO_HOST', venue_id: venue?.id ?? '', host_user_id: item.id, note }),
  });
  const items = useMemo(() => (hostsQ.data?.nearbyHostsForVenue ?? []).map(toCard), [hostsQ.data]);

  if (venuesQ.loading && !venuesQ.data) return <Skeleton variant="rounded" height={260} />;

  let blocked: string | null = null;
  if (venuesQ.error) blocked = parseApiError(venuesQ.error);
  else if (!venue) blocked = t('podRequests.noApprovedVenue');
  else if (!locationId) blocked = t('podRequests.venueUnplaced');

  const picker = venues.length > 1 && (
    <TextField
      select
      size="small"
      label={t('podRequests.venueLabel')}
      value={venue?.id ?? ''}
      onChange={(event) => setPicked(event.target.value)}
      sx={{ maxWidth: 360 }}
    >
      {venues.map((v) => (
        <MenuItem key={v.id} value={v.id}>
          {v.venue_name}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <NearbySearchLayout
      title={t('podRequests.searchHostsTitle')}
      backTo={podRequestsPath('VENUE')}
      picker={picker}
      blocked={blocked}
      quota={quota}
      radiusKm={radiusKm}
      onRadius={setRadiusKm}
      categoryIds={categoryIds}
      onCategories={setCategoryIds}
      request={request}
    >
      <NearbyResults
        loading={hostsQ.loading && !hostsQ.data}
        error={hostsQ.error ? parseApiError(hostsQ.error) : null}
        items={items}
        radiusKm={radiusKm}
        filtered={categoryIds.length > 0}
        searching={{
          title: t('podRequests.searchingHosts'),
          hint: t('podRequests.searchingHint', { vars: { km: radiusKm, place: venue?.locality || venue?.venue_name || '' } }),
          icon: <GroupsRoundedIcon fontSize="large" />,
        }}
        emptyText={t('podRequests.noHostsFound', { vars: { km: radiusKm } })}
        canRequest={(quota?.remaining ?? 1) > 0}
        onRequest={request.open}
        onRadius={setRadiusKm}
        onAllCategories={() => setCategoryIds([])}
      />
    </NearbySearchLayout>
  );
}
