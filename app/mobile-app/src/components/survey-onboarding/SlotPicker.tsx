import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { MeetingSlot } from '@/graphql/onboarding-survey';

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

interface ChipProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  /** The user's currently-booked slot — shown highlighted with a badge but not re-pickable. */
  current?: boolean;
  testID: string;
  onPress: () => void;
}

function SlotChip({
  label,
  active,
  disabled = false,
  current = false,
  testID,
  onPress,
}: Readonly<ChipProps>) {
  const press = () => {
    if (!disabled) onPress();
  };
  const highlighted = active || current;
  let border = '$borderColor';
  if (highlighted) border = '$primary';
  let chipOpacity = 1;
  if (disabled && !current) chipOpacity = 0.4;
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={current ? `${label} (current)` : label}
      aria-disabled={disabled}
      onPress={press}
      opacity={chipOpacity}
      gap={5}
      alignItems="center"
      paddingHorizontal={12}
      paddingVertical={7}
      borderRadius={999}
      borderWidth={1}
      borderColor={border}
      backgroundColor={highlighted ? '$primary' : 'transparent'}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={12.5} fontWeight="800" color={highlighted ? '$onPrimary' : '$color'}>
        {label}
      </Text>
      {current ? (
        <Text fontSize={9.5} fontWeight="900" color="$onPrimary" opacity={0.85}>
          CURRENT
        </Text>
      ) : null}
    </XStack>
  );
}

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
  /** The slot the user is already booked into — shown highlighted but not re-pickable (reschedule). */
  currentSlot?: string;
}

/** Day + time-slot chip grid for onboarding meetings; booked slots are disabled.
 * The Tamagui twin of mWeb's SlotPicker. */
export function SlotPicker({ slots, value, onChange, currentSlot }: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  const [day, setDay] = useState('');
  const days: string[] = [];
  for (const s of slots) {
    if (!days.some((d) => dayKey(d) === dayKey(s.start_at))) days.push(s.start_at);
  }
  const activeDay = day || days[0] || '';
  const daySlots = slots.filter((s) => dayKey(s.start_at) === dayKey(activeDay));

  return (
    <YStack gap={10}>
      <Text fontSize={14} fontWeight="700" color={ink}>
        Day
      </Text>
      <XStack gap={6} flexWrap="wrap">
        {days.map((d) => (
          <SlotChip
            key={d}
            testID={`slot-day-${dayKey(d)}`}
            label={dayLabel(d)}
            active={dayKey(d) === dayKey(activeDay)}
            onPress={() => {
              setDay(d);
              onChange('');
            }}
          />
        ))}
      </XStack>
      <Text fontSize={14} fontWeight="700" color={ink}>
        Time slot *
      </Text>
      <XStack gap={6} flexWrap="wrap">
        {daySlots.map((s) => {
          const isCurrent = !!currentSlot && s.start_at === currentSlot;
          return (
            <SlotChip
              key={s.start_at}
              testID={`slot-${s.start_at}`}
              label={timeLabel(s.start_at)}
              active={value === s.start_at}
              disabled={!s.available || isCurrent}
              current={isCurrent}
              onPress={() => onChange(s.start_at)}
            />
          );
        })}
      </XStack>
    </YStack>
  );
}
