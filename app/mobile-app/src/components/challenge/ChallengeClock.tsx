import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { clockDisplayMs, clockElapsedMs, formatClock, parseJsonObject } from '@duncit/utils';

import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  tool: PodChallengeView['tools'][number];
  receivedAt: number;
  large?: boolean;
}

/** Ticks once a second, and only while the clock is running. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** A challenge clock: stopwatch time, or the countdown's time remaining. */
export function ChallengeClock({ tool, receivedAt, large }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const now = useNow(tool.clock_running);
  const settings = parseJsonObject(tool.config_json);
  const elapsed = clockElapsedMs(tool, receivedAt, now);
  const shown = formatClock(
    clockDisplayMs(
      elapsed,
      String(settings.mode ?? 'STOPWATCH'),
      Number(settings.duration_seconds ?? 0),
    ),
  );
  const state = t(
    tool.clock_running ? 'mweb.challenge.clockRunning' : 'mweb.challenge.clockStopped',
  );

  return (
    <XStack
      alignItems="center"
      gap={8}
      role="timer"
      aria-label={`${tool.label}: ${shown}, ${state}`}
    >
      <MaterialIcons
        name="timer"
        size={large ? 32 : 20}
        color={tool.clock_running ? colors.primary : colors.muted}
      />
      <Text
        fontSize={large ? 44 : 20}
        fontWeight="800"
        color="$color"
        fontVariant={['tabular-nums']}
      >
        {shown}
      </Text>
      <Text fontSize={13} color="$muted">
        {tool.label}
      </Text>
    </XStack>
  );
}
