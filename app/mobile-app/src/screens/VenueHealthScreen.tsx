import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { HealthBreakdown, HealthMeter } from '@/components/health';
import { StackScreen } from '@/components/StackScreen';
import { useVenueHealth } from '@/hooks/useHealth';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Venue Health detail for an owned venue — meter + breakdown + admin remarks.
 * RN twin of mWeb's VenueHealthPage. */
export function VenueHealthScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VenueHealth'>>();
  const venueId = route.params?.venueId ?? '';
  const { health, isLoading, error } = useVenueHealth(venueId);

  return (
    <StackScreen title={health?.subject_label || 'Venue Health'} testID="venue-health-screen">
      {isLoading && !health ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="venue-health-loading" color="$primary" />
        </YStack>
      ) : error ? (
        <Text testID="venue-health-error" padding={24} color="$danger">
          {toErrorMessage(error)}
        </Text>
      ) : !health ? (
        <Text testID="venue-health-missing" padding={24} color="$muted">
          Venue health is not available for this venue.
        </Text>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 20 }}>
          <YStack alignItems="center">
            <HealthMeter score={health.total_score} band={health.band} label="Venue health" />
          </YStack>
          <HealthBreakdown score={health} />
        </ScrollView>
      )}
    </StackScreen>
  );
}
