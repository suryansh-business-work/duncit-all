import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import type { DayCellState, DayCounts } from './availability-grid';

interface BadgeProps {
  count: number;
  /** The one-letter mark the legend explains: A, P, B or ×. */
  mark: string;
  tone: string;
}

/** "A3" — how many slots of one status sit on the day. Hidden at zero. */
function CountBadge({ count, mark, tone }: Readonly<BadgeProps>) {
  if (count <= 0) return null;
  return (
    <XStack paddingHorizontal={3} borderRadius={4} backgroundColor={tone}>
      <Text fontSize={9} fontWeight="800" color="$onPrimary">
        {mark}
        {count}
      </Text>
    </XStack>
  );
}

interface Props {
  dayKey: string;
  counts?: DayCounts;
  state: DayCellState;
  selected: boolean;
  isToday: boolean;
  /** The translated "LEAVE" tag a holiday cell carries. */
  leaveTag: string;
  onPress: (dayKey: string) => void;
}

/** One day of the availability grid: the number, the leave tag and the four
 * status counts. Past and beyond-window days are dimmed and inert. */
export function AvailabilityDayCell({
  dayKey,
  counts,
  state,
  selected,
  isToday,
  leaveTag,
  onPress,
}: Readonly<Props>) {
  const disabled = state === 'disabled';
  const holiday = state === 'holiday';
  let background = '$surface';
  if (holiday) background = '$danger';
  if (selected) background = '$primary';
  const ink = selected || holiday ? '$onPrimary' : '$color';

  return (
    <YStack
      testID={`availability-day-${dayKey}`}
      role="button"
      aria-label={dayKey}
      aria-pressed={selected}
      aria-disabled={disabled}
      onPress={disabled ? undefined : () => onPress(dayKey)}
      flex={1}
      minHeight={56}
      padding={3}
      gap={2}
      borderRadius={8}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={background}
      opacity={disabled ? 0.4 : 1}
      pressStyle={disabled ? undefined : PRESS_STYLE.surface}
    >
      <Text fontSize={12} fontWeight={isToday ? '800' : '600'} color={ink}>
        {Number(dayKey.slice(8, 10))}
      </Text>
      {holiday ? (
        <Text fontSize={8} fontWeight="800" color={ink}>
          {leaveTag}
        </Text>
      ) : null}
      {counts ? (
        <XStack flexWrap="wrap" gap={2}>
          <CountBadge count={counts.available} mark="A" tone="$success" />
          <CountBadge count={counts.pending} mark="P" tone="$primary" />
          <CountBadge count={counts.booked} mark="B" tone="$warning" />
          <CountBadge count={counts.blocked} mark="×" tone="$muted" />
        </XStack>
      ) : null}
    </YStack>
  );
}
