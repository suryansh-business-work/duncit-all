import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import type { AccountHealth } from '@/hooks/useAccount';

const BAND_COLOR: Record<string, string> = {
  GREEN: semantic.success,
  YELLOW: semantic.warning,
  RED: semantic.error,
};

const BAND_MESSAGE: Record<string, string> = {
  GREEN: 'You’re in great shape.',
  YELLOW: 'A few things to tighten up.',
  RED: 'Needs attention.',
};

/** Account-health summary — score ring + band message + base/admin breakdown.
 * RN twin of the AccountPage health card (HealthMeter). Tappable to open the
 * full Account Health detail. */
export function AccountHealthCard({
  health,
  onPress,
}: Readonly<{
  health: AccountHealth;
  onPress?: () => void;
}>) {
  const bandColor = BAND_COLOR[health.band] ?? semantic.info;
  const remarks = health.adjustments.length;
  const deltaText = health.delta_sum > 0 ? `+${health.delta_sum}` : `${health.delta_sum}`;
  const adjustment = health.delta_sum === 0 ? '' : ` · Admin adjustment: ${deltaText}`;

  return (
    <YStack
      testID="account-health"
      role={onPress ? 'button' : undefined}
      aria-label={onPress ? 'Open account health' : undefined}
      onPress={onPress}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      pressStyle={onPress ? { opacity: 0.85 } : undefined}
    >
      <XStack alignItems="center" gap={16}>
        <YStack
          width={84}
          height={84}
          borderRadius={42}
          borderWidth={6}
          borderColor={bandColor}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={24} fontWeight="900" color="$color">
            {health.total_score}
          </Text>
          <Text fontSize={10} fontWeight="700" color="$muted">
            Health
          </Text>
        </YStack>
        <YStack flex={1} gap={4}>
          <Text fontSize={16} fontWeight="900" color="$color">
            {BAND_MESSAGE[health.band] ?? 'Account health'}
          </Text>
          <Text fontSize={13} color="$muted">
            Base score: {health.base_score}
            {adjustment}
          </Text>
          {remarks > 0 ? (
            <Text fontSize={12} color="$muted">
              {remarks} admin remark{remarks === 1 ? '' : 's'}.
            </Text>
          ) : null}
          {onPress ? (
            <Text fontSize={12} fontWeight="800" color="$primary">
              Tap for details
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  );
}
