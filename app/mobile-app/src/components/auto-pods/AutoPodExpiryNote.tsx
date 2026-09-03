import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { autoPodTimeLeft, type AutoPodLabels } from '@duncit/utils';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** `row.expires_at` — null draws nothing. */
  expiresAt: string | null | undefined;
  labels: AutoPodLabels;
}

/** The admin-configured clock's "now" (rule 11), re-read once a second while
 * there is a deadline to count. */
function useClockNow(counting: boolean): number {
  const { clock } = useDateFormat();
  const [nowMs, setNowMs] = useState(() => clock.nowMs());
  useEffect(() => {
    if (!counting) return undefined;
    const id = setInterval(() => setNowMs(clock.nowMs()), 1000);
    return () => clearInterval(id);
  }, [counting, clock]);
  return nowMs;
}

/**
 * "Expires in 5h 12m 30s" — every card's live countdown to the offer being
 * released unless everyone has enrolled (Pod Settings decides the windows).
 * It ticks on its own, so a screen of cards re-renders one line a second
 * rather than the whole queue. Nothing once the deadline has passed: the
 * server releases the offer on its next sweep. The Tamagui twin of
 * `@duncit/auto-pods`' `AutoPodExpiryNote` (rule 27).
 */
export function AutoPodExpiryNote({ expiresAt, labels }: Readonly<Props>) {
  const { warning } = useThemeColors();
  const nowMs = useClockNow(!!expiresAt);
  const left = autoPodTimeLeft(expiresAt, nowMs);
  if (!left) return null;
  return (
    <XStack testID="auto-pod-expiry" alignItems="center" gap={4}>
      <MaterialIcons name="timer" size={14} color={warning} />
      <Text fontSize={11.5} fontWeight="600" color={warning}>
        {labels.expiresIn(left.hours, left.minutes, left.seconds)}
      </Text>
    </XStack>
  );
}
