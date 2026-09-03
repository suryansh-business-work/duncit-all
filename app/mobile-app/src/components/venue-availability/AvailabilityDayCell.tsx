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

interface HolidayLineProps {
  holiday: boolean;
  note?: string;
  leaveTag: string;
  ink: string;
}

/** Day view spells the holiday out; the month and week cells wear the tag. */
function HolidayLine({ holiday, note, leaveTag, ink }: Readonly<HolidayLineProps>) {
  if (note) {
    return (
      <Text fontSize={11} fontWeight="700" color={ink}>
        {note}
      </Text>
    );
  }
  if (!holiday) return null;
  return (
    <Text fontSize={8} fontWeight="800" color={ink}>
      {leaveTag}
    </Text>
  );
}

// Flat paint resolution keeps the cell's JSX free of stacked ternaries.
function cellPaint(state: DayCellState, selected: boolean) {
  const disabled = state === 'disabled';
  const holiday = state === 'holiday';
  let background = '$surface';
  if (holiday) background = '$danger';
  if (selected) background = '$primary';
  return {
    disabled,
    holiday,
    background,
    ink: selected || holiday ? '$onPrimary' : '$color',
    borderColor: selected ? '$primary' : '$borderColor',
    opacity: disabled ? 0.4 : 1,
    pressStyle: disabled ? undefined : PRESS_STYLE.surface,
  };
}

interface Props {
  dayKey: string;
  /** The day number in the month and week views; the full date in day view. */
  label: string;
  /** The sentence day view prints on a holiday, in place of the leave tag. */
  note?: string;
  counts?: DayCounts;
  state: DayCellState;
  selected: boolean;
  isToday: boolean;
  /** The translated "LEAVE" tag a holiday cell carries. */
  leaveTag: string;
  onPress: (dayKey: string) => void;
}

/** One day of the availability grid: the label, the leave tag and the four
 * status counts. Past and beyond-window days are dimmed and inert. */
export function AvailabilityDayCell({
  dayKey,
  label,
  note,
  counts,
  state,
  selected,
  isToday,
  leaveTag,
  onPress,
}: Readonly<Props>) {
  const paint = cellPaint(state, selected);

  return (
    <YStack
      testID={`availability-day-${dayKey}`}
      role="button"
      aria-label={dayKey}
      aria-pressed={selected}
      aria-disabled={paint.disabled}
      onPress={paint.disabled ? undefined : () => onPress(dayKey)}
      flex={1}
      minHeight={56}
      padding={3}
      gap={2}
      borderRadius={8}
      borderWidth={1}
      borderColor={paint.borderColor}
      backgroundColor={paint.background}
      opacity={paint.opacity}
      pressStyle={paint.pressStyle}
    >
      <Text fontSize={12} fontWeight={isToday ? '800' : '600'} color={paint.ink}>
        {label}
      </Text>
      <HolidayLine holiday={paint.holiday} note={note} leaveTag={leaveTag} ink={paint.ink} />
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
