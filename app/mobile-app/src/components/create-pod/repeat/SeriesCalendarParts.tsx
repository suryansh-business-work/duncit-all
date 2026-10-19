import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useTranslation } from '@/hooks/useTranslation';
import { SERIES_DAY_STATUS_KEY, type SeriesDayMark, type SeriesDayStatus } from './series-calendar';

type DayLook = 'NONE' | SeriesDayStatus;

/** Each day's fill, ink and ring — theme tokens only, so dark mode follows. */
const DAY_LOOK: Record<
  DayLook,
  { background: string; ink: string; ring: string; strike: boolean }
> = {
  NONE: { background: 'transparent', ink: '$color', ring: 'transparent', strike: false },
  RUNS: { background: '$primary', ink: '$onPrimary', ring: '$primary', strike: false },
  ON_REQUEST: { background: '$primarySoft', ink: '$color', ring: '$warning', strike: false },
  CANNOT_RUN: { background: '$dangerSoft', ink: '$danger', ring: 'transparent', strike: true },
  REMOVED: { background: '$soft', ink: '$muted', ring: '$borderColor', strike: true },
};

const LEGEND_ORDER: readonly SeriesDayStatus[] = ['RUNS', 'ON_REQUEST', 'CANNOT_RUN', 'REMOVED'];

interface DayProps {
  day: string;
  mark: SeriesDayMark | undefined;
  tappable: boolean;
  /** Inside the first date to end day window — days outside it are faded. */
  inRange: boolean;
  label: string;
  onPress: () => void;
}

/** One day of the series calendar, marked by how its date stands. */
export function SeriesDayCell({
  day,
  mark,
  tappable,
  inRange,
  label,
  onPress,
}: Readonly<DayProps>) {
  const look = DAY_LOOK[mark?.status ?? 'NONE'];
  const included = mark?.status === 'RUNS' || mark?.status === 'ON_REQUEST';
  return (
    <YStack flex={1} alignItems="center" paddingVertical={2}>
      <YStack
        testID={`pod-series-day-${day}`}
        role={tappable ? 'checkbox' : undefined}
        aria-checked={tappable ? included : undefined}
        aria-label={label}
        tabIndex={tappable ? 0 : undefined}
        onPress={tappable ? onPress : undefined}
        pressStyle={tappable ? PRESS_STYLE.control : undefined}
        width={36}
        height={36}
        borderRadius={18}
        borderWidth={2}
        borderColor={look.ring}
        alignItems="center"
        justifyContent="center"
        backgroundColor={look.background}
        opacity={inRange || mark ? 1 : 0.35}
      >
        <Text
          fontSize={13}
          fontWeight={mark ? '700' : '600'}
          color={look.ink}
          textDecorationLine={look.strike ? 'line-through' : 'none'}
        >
          {Number(day.slice(8, 10))}
        </Text>
      </YStack>
    </YStack>
  );
}

/** What each mark on the calendar means. */
export function SeriesCalendarLegend() {
  const { t } = useTranslation();
  return (
    <XStack gap={12} flexWrap="wrap" testID="pod-series-legend">
      {LEGEND_ORDER.map((status) => {
        const look = DAY_LOOK[status];
        return (
          <XStack key={status} alignItems="center" gap={6}>
            <YStack
              width={14}
              height={14}
              borderRadius={7}
              borderWidth={2}
              borderColor={look.ring}
              backgroundColor={look.background}
            />
            <Text fontSize={12} color="$muted">
              {t(SERIES_DAY_STATUS_KEY[status])}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
