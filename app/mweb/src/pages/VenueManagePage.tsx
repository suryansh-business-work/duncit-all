import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import SimpleBarChart, { buildMonthlyCounts } from '../components/SimpleBarChart';
import { MY_VENUE_HEALTH, type HealthScore } from '../components/health/queries';
import { Card, CardContent, Chip, Stack } from '@mui/material';
import SectionHeader from '../components/SectionHeader';
import { emptyVenueOwnerStats, pickVenue, type VenueOwnerStats } from '@duncit/utils';
import UserVenuePanel from './profile-page/UserVenuePanel';
import VenueEarningsLinkCard from './venue-earnings-page/VenueEarningsLinkCard';
import VenueHealthCard from './venue-manage-page/VenueHealthCard';
import VenueListBody from './venue-manage-page/VenueListBody';
import VenueOwnerStatsStrip from './venue-manage-page/VenueOwnerStatsStrip';
import VenuePodsSection from './venue-manage-page/VenuePodsSection';
import StudioChangeRequests from '../components/studio-pods/StudioChangeRequests';
import VenueQuickActions from './venue-manage-page/VenueQuickActions';
import VenueStatTiles from './venue-manage-page/VenueStatTiles';
import VenueStudioHeader from './venue-manage-page/VenueStudioHeader';
import VenueSwitcher from './venue-manage-page/VenueSwitcher';
import { MY_VENUES_DETAILS, PODS_AT_VENUE, VENUE_OWNER_STATS } from './venue-manage-page/queries';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Venue Studio.
 *
 * The page reads every venue the partner owns and shows ONE of them — the one
 * the switcher at the top has selected. It used to read `myVenue`, so a partner
 * with three venues saw whichever one the server picked and had no way to reach
 * the other two.
 */
export default function VenueManagePage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, loading, error } = useQuery<any>(MY_VENUES_DETAILS, {
    fetchPolicy: 'cache-and-network',
  });
  const venues: any[] = data?.myVenues ?? [];
  const venue = pickVenue(venues, selectedId);
  const { data: healthData } = useQuery<{ myVenueHealth: HealthScore | null }>(MY_VENUE_HEALTH, {
    variables: { venue_id: venue?.id ?? '' },
    skip: !venue?.id,
    fetchPolicy: 'cache-and-network',
  });
  const health = healthData?.myVenueHealth ?? null;
  const podsQ = useQuery<any>(PODS_AT_VENUE, {
    variables: { venue_id: venue?.id ?? '' },
    skip: !venue?.id,
    fetchPolicy: 'cache-and-network',
  });
  const venuePods: any[] = podsQ.data?.pods ?? [];
  // The slot KPIs of the selected venue — the "Slot earnings" strip and the
  // pending count on the Slot requests action.
  const statsQ = useQuery<{ venueOwnerStats: VenueOwnerStats }>(VENUE_OWNER_STATS, {
    variables: { venue_id: venue?.id ?? '' },
    skip: !venue?.id,
    fetchPolicy: 'cache-and-network',
  });
  const stats = statsQ.data?.venueOwnerStats ?? emptyVenueOwnerStats;
  const capacity = typeof venue?.capacity === 'number' ? venue.capacity : 0;
  const isApproved = venue?.status === 'APPROVED';

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <VenueStudioHeader />

      <VenueSwitcher venues={venues} venueId={venue?.id ?? null} onChange={setSelectedId} />

      <VenueStatTiles listed={venues.length} capacity={capacity} status={venue?.status ?? 'New'} />

      {venue?.id && <VenueOwnerStatsStrip stats={stats} />}

      {venue?.id && <VenueQuickActions approved={isApproved} pendingRequests={stats.pending_requests} />}

      <VenueEarningsLinkCard />

      {venue?.id && <VenuePodsSection venueId={venue.id} onPodsChanged={() => statsQ.refetch()} />}

      <StudioChangeRequests role="VENUE" />

      <Stack spacing={1.5}>
        <SectionHeader title="Pods at your venue" />
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <SimpleBarChart data={buildMonthlyCounts(venuePods.map((p) => p.pod_date_time))} />
          </CardContent>
        </Card>
      </Stack>

      {health && venue?.id && <VenueHealthCard health={health} venueId={venue.id} />}

      <Stack spacing={1.5}>
        <SectionHeader title="Your application" />
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <UserVenuePanel venueId={venue?.id ?? null} />
          </CardContent>
        </Card>
      </Stack>

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <SectionHeader title={t('mweb.venueManagePage.yourVenues')} />
          </Stack>
          <Chip size="small" label={isApproved ? 'Live' : 'Draft'} color={isApproved ? 'success' : 'warning'} />
        </Stack>
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <VenueListBody showSpinner={loading && !data} error={error} venue={venue} />
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
