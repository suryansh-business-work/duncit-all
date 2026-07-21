import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';

/** "Backout in process": replacement search running — offer Keep My Spot.
 * Once a replacement is confirmed the backout is locked (no restore). */
export function BackoutInProcessBar({
  canCancel,
  onKeepSpot,
}: Readonly<{ canCancel: boolean; onKeepSpot: () => void }>) {
  if (!canCancel) {
    return (
      <XStack flex={1} alignItems="center" gap={8} testID="pod-backout-locked">
        <MaterialIcons name="lock-clock" size={20} color={semantic.warning} />
        <Text flex={1} fontSize={13} fontWeight="800" color="$muted">
          A replacement has been confirmed — this Backout can no longer be cancelled.
        </Text>
      </XStack>
    );
  }
  return (
    <>
      <XStack flex={1} alignItems="center" gap={8}>
        <MaterialIcons name="hourglass-top" size={22} color={semantic.warning} />
        <YStack flex={1}>
          <Text fontSize={11} color="$muted">
            Searching for a replacement
          </Text>
          <Text fontSize={15} fontWeight="900" color="$color" testID="pod-backout-in-process">
            Backout in process
          </Text>
        </YStack>
      </XStack>
      <XStack
        testID="pod-keep-spot"
        role="button"
        aria-label="Keep my spot"
        onPress={onKeepSpot}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={20}
        height={48}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <KeepSpotLabel />
      </XStack>
    </>
  );
}

/** Hoisted so the themed label doesn't create a branch inside the bar. */
function KeepSpotLabel() {
  const { onPrimary } = useThemeColors();
  return (
    <Text fontSize={14} fontWeight="900" color={onPrimary}>
      Keep My Spot
    </Text>
  );
}
