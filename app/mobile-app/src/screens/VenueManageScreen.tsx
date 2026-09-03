import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import { venueSubLabel } from '@duncit/utils';

import { SimpleBarChart, buildMonthlyCounts } from '@/components/SimpleBarChart';
import { StackScreen } from '@/components/StackScreen';
import { StudioPodsSection, VenueSwitcher, useVenueStudioPods } from '@/components/studio';
import { useVenueDashboard } from '@/hooks/useStudioDashboards';
import { useTranslation } from '@/hooks/useTranslation';

/** Stat tile shared by the studio dashboards. */
export function StatTile({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <YStack
      flex={1}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={11} fontWeight="700" color="$primary">
        {label}
      </Text>
      <Text fontSize={17} fontWeight="700" color="$color" numberOfLines={1}>
        {value}
      </Text>
    </YStack>
  );
}

/**
 * Venue studio dashboard — venues, capacity, status + bookings chart (B3-1).
 *
 * A partner with more than one venue picks which one the screen is about from
 * the switcher at the top; every figure below it belongs to that venue. Only
 * "Listed" counts them all. mWeb reads the identical shape (rule 27).
 */
export function VenueManageScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, podDates, isLoading } = useVenueDashboard();
  const podsState = useVenueStudioPods(venueId);
  const capacity = venue?.capacity ?? 0;

  return (
    <StackScreen header title={t('mweb.venueManage.venueStudio')} testID="venue-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-dashboard-loading" color="$primary" /> : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          <XStack gap={10}>
            <StatTile label={t('mweb.venueManagePage.listed')} value={venues.length} />
            <StatTile label={t('mweb.common.capacity')} value={capacity || '-'} />
            <StatTile label={t('mweb.venueManagePage.status')} value={venue?.status ?? 'New'} />
          </XStack>
          <YStack
            gap={4}
            padding={14}
            borderRadius={14}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <Text fontSize={15} fontWeight="700" color="$color">
              Pods at your venue
            </Text>
            <Text fontSize={11.5} color="$muted">
              Bookings over the last 2 and next 3 months
            </Text>
            <SimpleBarChart testID="venue-pods-chart" data={buildMonthlyCounts(podDates)} />
          </YStack>
          {/* The bookings behind that chart, pod by pod, with their figures.
              Hidden when there is no venue at all: the empty copy says "no pods
              have been booked at your venue", which asserts a venue they do not
              have — and it fired a needless authenticated round trip. mWeb
              gates it the same way (rule 27). */}
          {venues.length > 0 ? (
            <StudioPodsSection variant="VENUE" state={podsState} testID="venue-studio-pods" />
          ) : null}
          {!isLoading && venues.length === 0 ? (
            <Text testID="venue-dashboard-empty" fontSize={13} color="$muted">
              No venues yet — register one to start hosting pods.
            </Text>
          ) : null}
          {venue ? (
            <XStack
              testID={`venue-row-${venue.id}`}
              alignItems="center"
              gap={10}
              padding={12}
              borderRadius={12}
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$surface"
            >
              <YStack flex={1}>
                <Text fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
                  {venue.venue_name}
                </Text>
                <Text fontSize={12} color="$muted" numberOfLines={1}>
                  {venueSubLabel(venue)}
                </Text>
              </YStack>
            </XStack>
          ) : null}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
