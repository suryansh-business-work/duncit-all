import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { autoPodTimeLeft, type AutoPodLabels } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** `row.venue_expires_at` — null draws nothing. */
  expiresAt: string | null | undefined;
  /** The admin-configured clock's "now" (rule 11), not the device's. */
  nowMs: number;
  labels: AutoPodLabels;
}

/**
 * "Removed from your list in 5h 12m" — the venue card's countdown to the
 * offer leaving their queue (Pod Settings decides the window). Nothing once
 * the deadline has passed. The Tamagui twin of `@duncit/auto-pods`'
 * `AutoPodExpiryNote` (rule 27).
 */
export function AutoPodExpiryNote({ expiresAt, nowMs, labels }: Readonly<Props>) {
  const { warning } = useThemeColors();
  const left = autoPodTimeLeft(expiresAt, nowMs);
  if (!left) return null;
  return (
    <XStack testID="auto-pod-expiry" alignItems="center" gap={4}>
      <MaterialIcons name="timer" size={14} color={warning} />
      <Text fontSize={11.5} fontWeight="600" color={warning}>
        {labels.removedIn(left.hours, left.minutes)}
      </Text>
    </XStack>
  );
}
