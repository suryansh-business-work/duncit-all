import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { HealthBreakdown, HealthMeter } from '@/components/health';
import { StackScreen } from '@/components/StackScreen';
import { useAccountHealth } from '@/hooks/useHealth';
import { toErrorMessage } from '@/utils/errors';

/** Account Health detail — meter + score breakdown + admin remarks.
 * RN twin of mWeb's AccountHealthPage. */
export function AccountHealthScreen() {
  const { health, isLoading, error } = useAccountHealth();

  return (
    <StackScreen title="Account Health" testID="account-health-screen">
      {isLoading && !health ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="account-health-loading" color="$primary" />
        </YStack>
      ) : error ? (
        <Text testID="account-health-error" padding={24} color="$danger">
          {toErrorMessage(error)}
        </Text>
      ) : !health ? (
        <Text testID="account-health-missing" padding={24} color="$muted">
          Account health is not available yet.
        </Text>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 20 }}>
          <YStack alignItems="center">
            <HealthMeter score={health.total_score} band={health.band} label="Account Health" />
          </YStack>
          <HealthBreakdown score={health} />
        </ScrollView>
      )}
    </StackScreen>
  );
}
