import { useQuery } from '@apollo/client/react';
import SimpleBarChart, { buildMonthlyCounts } from '../components/SimpleBarChart';
import { MY_VENUE_HEALTH, type HealthScore } from '../components/health/queries';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import SectionHeader from '../components/SectionHeader';
import { emptyVenueOwnerStats, type VenueOwnerStats } from '@duncit/utils';
import { UpcomingBookings } from '@duncit/availability-calendar';
import VenueEarningsLinkCard from './venue-earnings-page/VenueEarningsLinkCard';
import VenueHealthCard from './venue-manage-page/VenueHealthCard';
import NoVenuesAlert from './venue-manage-page/NoVenuesAlert';
import VenueOwnerStatsStrip from './venue-manage-page/VenueOwnerStatsStrip';
import VenuePodsFigures from './venue-manage-page/VenuePodsFigures';
import VenueStatTiles from './venue-manage-page/VenueStatTiles';
import VenueStudioHeader from './venue-manage-page/VenueStudioHeader';
import VenueSwitcher from './venue-manage-page/VenueSwitcher';
import { MY_VENUES_DETAILS, PODS_AT_VENUE, VENUE_OWNER_STATS } from './venue-manage-page/queries';
import { useTranslation } from '../i18n/useTranslation';
import { useSelectedVenue } from '../hooks/useSelectedVenue';

/**
 * Venue Studio dashboard — figures and charts only. Every action (slot
 * requests, publishing, pod and change requests, the venue list) has its own
 * page under Venue Options.
 *
 * The page reads every venue the partner owns and shows ONE of them — the one
 * the switcher at the top has selected. It used to read `myVenue`, so a partner
 * with three venues saw whichever one the server picked and had no way to reach
 * the other two.
 */
export default function VenueManagePage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_VENUES_DETAILS, {
    fetchPolicy: 'cache-and-network',
  });
  const venues: any[] = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);
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
  // The slot KPIs of the selected venue — the "Slot earnings" strip.
  const statsQ = useQuery<{ venueOwnerStats: VenueOwnerStats }>(VENUE_OWNER_STATS, {
    variables: { venue_id: venue?.id ?? '' },
    skip: !venue?.id,
    fetchPolicy: 'cache-and-network',
  });
  const stats = statsQ.data?.venueOwnerStats ?? emptyVenueOwnerStats;
  const capacity = typeof venue?.capacity === 'number' ? venue.capacity : 0;

  if (loading && !data) {
    return (
      <Stack data-testid="venue-manage-loading" sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} size={22} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="venue-manage-screen">
      <VenueStudioHeader />

      {error && !data && (
        <Alert severity="error" data-testid="venue-manage-error">{error.message}</Alert>
      )}

      {data && !venue && <NoVenuesAlert message={t('mweb.studioOptions.noVenuesYet')} />}

      <VenueSwitcher venues={venues} venueId={venue?.id ?? null} onChange={selectVenue} />

      <VenueStatTiles listed={venues.length} capacity={capacity} status={venue?.status ?? 'New'} />

      {venue?.id && <VenueOwnerStatsStrip stats={stats} />}

      {venue?.id && (
        <Stack spacing={1.5}>
          <SectionHeader testId="venue-manage-bookings-header" title={t('venuePricing.bookings.title')} />
          <Card>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <UpcomingBookings venueId={venue.id} />
            </CardContent>
          </Card>
        </Stack>
      )}

      <VenueEarningsLinkCard />

      {venue?.id && <VenuePodsFigures venueId={venue.id} />}

      <Stack spacing={1.5}>
        <SectionHeader testId="venue-manage-pods-header" title="Pods at your venue" />
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <SimpleBarChart
              data={buildMonthlyCounts(venuePods.map((p) => p.pod_date_time))}
              testId="venue-pods-chart"
            />
          </CardContent>
        </Card>
      </Stack>

      {health && venue?.id && <VenueHealthCard health={health} venueId={venue.id} />}
    </Stack>
  );
}
