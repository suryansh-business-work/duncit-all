import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SimpleBarChart, buildMonthlyCounts } from '@/components/SimpleBarChart';
import { SectionHeader } from '@/components/SectionHeader';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import {
  StatTile,
  VenueEarningsCard,
  VenueHealthTile,
  VenuePodFiguresCard,
  VenueSlotEarningsTiles,
  VenueSwitcher,
  useVenueStudioPods,
} from '@/components/studio';
import { UpcomingBookingsCard } from '@/components/venue-pricing/UpcomingBookingsCard';
import { useVenueDashboard } from '@/hooks/useStudioDashboards';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueOwnerStats } from '@/hooks/useVenueOwnerStats';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Venue studio dashboard — figures and charts only: venues, capacity, status,
 * the slot-earnings strip, the upcoming instant bookings, earnings, the pod
 * figures, the bookings chart and
 * the venue's health (B3-1). Every
 * action (workshop & event requests, pricing, publishing, pod and change
 * requests, the venue list)
 * has its own Venue Options screen.
 *
 * A partner with more than one venue picks which one the screen is about from
 * the switcher at the top; every figure below it belongs to that venue. Only
 * "Listed" counts them all. mWeb reads the identical shape (rule 27).
 */
export function VenueManageScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, podDates, isLoading } = useVenueDashboard();
  const podsState = useVenueStudioPods(venueId);
  const { stats } = useVenueOwnerStats(venueId);
  const capacity = venue?.capacity ?? 0;

  return (
    <StackScreen header title={t('mweb.venueManage.venueStudio')} testID="venue-manage-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={24} padding={16} paddingBottom={48}>
          {isLoading ? (
            <Spinner
              role="progressbar"
              aria-label={t('mweb.a11y.loading')}
              testID="venue-dashboard-loading"
              color="$primary"
            />
          ) : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          <XStack gap={10}>
            <StatTile label={t('mweb.venueManagePage.listed')} value={venues.length} size="lg" />
            <StatTile label={t('mweb.common.capacity')} value={capacity || '-'} size="lg" />
            <StatTile label={t('mweb.venueManagePage.status')} value={venue?.status ?? 'New'} />
          </XStack>
          {venue ? <VenueSlotEarningsTiles stats={stats} /> : null}
          {venue ? <UpcomingBookingsCard venueId={venue.id} /> : null}
          {venues.length > 0 ? <VenueEarningsCard /> : null}
          {/* Hidden when there is no venue at all: it would fire a needless
              authenticated round trip. mWeb gates it the same way (rule 27). */}
          {venues.length > 0 ? (
            <VenuePodFiguresCard state={podsState} testID="venue-studio-pods" />
          ) : null}
          <YStack gap={12}>
            <SectionHeader title="Pods at your venue" />
            <SurfaceCard>
              <SimpleBarChart testID="venue-pods-chart" data={buildMonthlyCounts(podDates)} />
            </SurfaceCard>
          </YStack>
          {venue ? <VenueHealthTile venueId={venue.id} /> : null}
          {!isLoading && venues.length === 0 ? (
            <Text testID="venue-dashboard-empty" fontSize={14} color="$muted" textAlign="center">
              No venues yet — register one to start hosting pods.
            </Text>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
