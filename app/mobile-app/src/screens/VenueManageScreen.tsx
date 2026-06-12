import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { SimpleBarChart, buildMonthlyCounts } from '@/components/SimpleBarChart';
import { StackScreen } from '@/components/StackScreen';
import { useVenueDashboard } from '@/hooks/useStudioDashboards';

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
      <Text fontSize={11} fontWeight="900" color="$primary">
        {label}
      </Text>
      <Text fontSize={17} fontWeight="900" color="$color" numberOfLines={1}>
        {value}
      </Text>
    </YStack>
  );
}

/** Venue studio dashboard — venues, capacity, status + bookings chart (B3-1). */
export function VenueManageScreen() {
  const { venues, podDates, isLoading } = useVenueDashboard();
  const approved = venues.filter((venue) => venue.status === 'APPROVED' && venue.is_active);
  const capacity = venues.reduce((sum, venue) => sum + (venue.capacity ?? 0), 0);

  return (
    <StackScreen header title="Venue Studio" testID="venue-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-dashboard-loading" color="$primary" /> : null}
          <XStack gap={10}>
            <StatTile label="Venues" value={venues.length} />
            <StatTile label="Approved" value={approved.length} />
            <StatTile label="Capacity" value={capacity || '-'} />
          </XStack>
          <YStack
            gap={4}
            padding={14}
            borderRadius={14}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <Text fontSize={15} fontWeight="900" color="$color">
              Pods at your venue
            </Text>
            <Text fontSize={11.5} color="$muted">
              Bookings over the last 2 and next 3 months
            </Text>
            <SimpleBarChart testID="venue-pods-chart" data={buildMonthlyCounts(podDates)} />
          </YStack>
          {!isLoading && venues.length === 0 ? (
            <Text testID="venue-dashboard-empty" fontSize={13} color="$muted">
              No venues yet — register one to start hosting pods.
            </Text>
          ) : null}
          {venues.map((venue) => (
            <XStack
              key={venue.id}
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
                <Text fontSize={14.5} fontWeight="800" color="$color" numberOfLines={1}>
                  {venue.venue_name}
                </Text>
                <Text fontSize={12} color="$muted" numberOfLines={1}>
                  {venue.city ?? '—'} · {venue.status}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
