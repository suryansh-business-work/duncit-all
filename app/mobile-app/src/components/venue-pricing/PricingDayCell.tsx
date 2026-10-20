import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import type { DayTag } from './pricing-calendar';

interface Props {
  dayKey: string;
  /** The day number. */
  label: string;
  /** The day's rate or its slot count; null when there is nothing to show. */
  detail: string | null;
  tag: DayTag;
  /** The translated word for the tag ("Blocked", "Leave", …). */
  tagLabel: string | null;
  /** A past day — dimmed and inert. */
  disabled: boolean;
  selected: boolean;
  isToday: boolean;
  onPress: (dayKey: string) => void;
}

// Flat paint resolution keeps the JSX free of stacked ternaries.
function paintOf(tag: DayTag, selected: boolean) {
  if (selected) return { background: '$primary', ink: '$onPrimary' };
  if (tag === 'blocked' || tag === 'holiday') return { background: '$dangerSoft', ink: '$danger' };
  if (tag === 'booked') return { background: '$primarySoft', ink: '$color' };
  return { background: '$soft', ink: '$color' };
}

/** One day of the pricing calendar: the number, the price and any tag. The
 * same tile shape as the availability grid's cell, so both calendars read alike. */
export function PricingDayCell({
  dayKey,
  label,
  detail,
  tag,
  tagLabel,
  disabled,
  selected,
  isToday,
  onPress,
}: Readonly<Props>) {
  const paint = paintOf(tag, selected);
  return (
    <YStack
      testID={`pricing-day-${dayKey}`}
      tabIndex={0}
      role="radio"
      aria-label={[dayKey, detail, tagLabel].filter(Boolean).join(', ')}
      aria-checked={selected}
      aria-disabled={disabled}
      onPress={disabled ? undefined : () => onPress(dayKey)}
      flex={1}
      minHeight={56}
      padding={4}
      gap={2}
      borderRadius={12}
      borderWidth={1.5}
      borderColor={isToday && !selected ? '$primary' : 'transparent'}
      backgroundColor={paint.background}
      opacity={disabled ? 0.4 : 1}
      pressStyle={disabled ? undefined : PRESS_STYLE.control}
    >
      <Text fontSize={12} fontWeight={isToday ? '700' : '600'} color={paint.ink}>
        {label}
      </Text>
      {detail ? (
        <Text fontSize={9} fontWeight="600" color={paint.ink} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
      {tagLabel ? (
        <Text fontSize={8} fontWeight="700" color={paint.ink} numberOfLines={1}>
          {tagLabel}
        </Text>
      ) : null}
    </YStack>
  );
}
