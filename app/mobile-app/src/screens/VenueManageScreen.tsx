import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { venueSubLabel } from '@duncit/utils';

import { SimpleBarChart, buildMonthlyCounts } from '@/components/SimpleBarChart';
import { StudioChangeRequests } from '@/components/change-requests/StudioChangeRequests';
import { SectionHeader } from '@/components/SectionHeader';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import {
  StatTile,
  VenueQuickActions,
  VenueSlotEarningsTiles,
  VenueStudioPods,
  VenueSwitcher,
  useVenueStudioPods,
} from '@/components/studio';
import { useVenueDashboard } from '@/hooks/useStudioDashboards';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueOwnerStats } from '@/hooks/useVenueOwnerStats';
import type { MenuRoute, RootStackParamList } from '@/navigation/types';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Venue studio dashboard — venues, capacity, status, the slot-earnings strip,
 * the doors to the calendar / settings / requests, the bookings chart and the
 * pods booked here (B3-1).
 *
 * A partner with more than one venue picks which one the screen is about from
 * the switcher at the top; every figure below it belongs to that venue. Only
 * "Listed" counts them all. mWeb reads the identical shape (rule 27).
 */
export function VenueManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // MenuRoute is a union of param-less screens; RN v7's distributive
  // `navigate` needs the narrower signature spelled out.
  const navigate: (screen: MenuRoute) => void = navigation.navigate;
  const { venues, venue, venueId, selectVenue, podDates, isLoading } = useVenueDashboard();
  const podsState = useVenueStudioPods(venueId);
  const { stats } = useVenueOwnerStats(venueId);
  const capacity = venue?.capacity ?? 0;

  return (
    <StackScreen header title={t('mweb.venueManage.venueStudio')} testID="venue-manage-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={24} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-dashboard-loading" color="$primary" /> : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          <XStack gap={10}>
            <StatTile label={t('mweb.venueManagePage.listed')} value={venues.length} size="lg" />
            <StatTile label={t('mweb.common.capacity')} value={capacity || '-'} size="lg" />
            <StatTile label={t('mweb.venueManagePage.status')} value={venue?.status ?? 'New'} />
          </XStack>
          {venue ? (
            <>
              <VenueSlotEarningsTiles stats={stats} />
              <VenueQuickActions
                approved={venue.status === 'APPROVED'}
                pendingRequests={stats.pending_requests}
                onNavigate={navigate}
              />
            </>
          ) : null}
          <YStack gap={12}>
            <SectionHeader title="Pods at your venue" />
            <SurfaceCard>
              <SimpleBarChart testID="venue-pods-chart" data={buildMonthlyCounts(podDates)} />
            </SurfaceCard>
          </YStack>
          {/* The bookings behind that chart, pod by pod, with their figures and
              the owner's per-pod actions. Hidden when there is no venue at all:
              the empty copy says "no pods have been booked at your venue",
              which asserts a venue they do not have — and it fired a needless
              authenticated round trip. mWeb gates it the same way (rule 27). */}
          {venues.length > 0 ? (
            <VenueStudioPods state={podsState} testID="venue-studio-pods" />
          ) : null}
          {venues.length > 0 ? <StudioChangeRequests role="VENUE" /> : null}
          {!isLoading && venues.length === 0 ? (
            <Text testID="venue-dashboard-empty" fontSize={14} color="$muted" textAlign="center">
              No venues yet — register one to start hosting pods.
            </Text>
          ) : null}
          {venue ? (
            <YStack gap={12}>
              <SectionHeader title={t('mweb.venueManagePage.yourVenues')} />
              <SurfaceCard testID={`venue-row-${venue.id}`}>
                <XStack alignItems="center" gap={10}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
                      {venue.venue_name}
                    </Text>
                    <Text fontSize={12} color="$muted" numberOfLines={1}>
                      {venueSubLabel(venue)}
                    </Text>
                  </YStack>
                </XStack>
              </SurfaceCard>
            </YStack>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
