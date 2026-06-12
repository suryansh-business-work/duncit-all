import { useState } from 'react';
import { ScrollView } from 'react-native';
import { addMonths, format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const pad = (n: number) => String(n).padStart(2, '0');

/** Day cells (with leading blanks) for the visible month. */
export function buildMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
}

interface SheetProps {
  testID: string;
  initial: Date | null;
  muted: string;
  onDone: (picked: Date) => void;
}

/** Calendar grid + hour/minute chips — the body of the date-time sheet. */
export function CalendarSheet({ testID, initial, muted, onDone }: Readonly<SheetProps>) {
  const seed = initial ?? new Date();
  const [view, setView] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1));
  const [day, setDay] = useState(seed.getDate());
  const [hour, setHour] = useState(seed.getHours());
  const [minute, setMinute] = useState(MINUTES.includes(seed.getMinutes()) ? seed.getMinutes() : 0);
  const days = buildMonthDays(view.getFullYear(), view.getMonth());

  const chip = (selected: boolean) =>
    ({
      borderRadius: 999,
      borderWidth: 1,
      borderColor: selected ? '$primary' : '$borderColor',
      backgroundColor: selected ? '$primary' : 'transparent',
    }) as const;

  return (
    <YStack gap={12}>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack
          testID={`${testID}-prev-month`}
          role="button"
          aria-label="Previous month"
          onPress={() => setView((v) => addMonths(v, -1))}
          padding={8}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="chevron-left" size={22} color={muted} />
        </XStack>
        <Text fontSize={15} fontWeight="900" color="$color">
          {format(view, 'MMMM yyyy')}
        </Text>
        <XStack
          testID={`${testID}-next-month`}
          role="button"
          aria-label="Next month"
          onPress={() => setView((v) => addMonths(v, 1))}
          padding={8}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="chevron-right" size={22} color={muted} />
        </XStack>
      </XStack>
      <XStack flexWrap="wrap">
        {days.map((d, index) => (
          <YStack
            // eslint-disable-next-line react/no-array-index-key -- leading blanks repeat null
            key={`${view.getMonth()}-${index}`}
            testID={d ? `${testID}-day-${d}` : undefined}
            role={d ? 'button' : undefined}
            aria-label={d ? `Day ${d}` : undefined}
            onPress={d ? () => setDay(d) : undefined}
            width="14.28%"
            height={38}
            alignItems="center"
            justifyContent="center"
          >
            {d ? (
              <YStack
                width={32}
                height={32}
                alignItems="center"
                justifyContent="center"
                {...chip(d === day)}
              >
                <Text fontSize={13} fontWeight="700" color={d === day ? '$onPrimary' : '$color'}>
                  {d}
                </Text>
              </YStack>
            ) : null}
          </YStack>
        ))}
      </XStack>
      <Text fontSize={12} fontWeight="900" color="$muted">
        TIME
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={6}>
          {HOURS.map((h) => (
            <YStack
              key={h}
              testID={`${testID}-hour-${h}`}
              role="button"
              aria-label={`Hour ${h}`}
              onPress={() => setHour(h)}
              paddingHorizontal={12}
              paddingVertical={7}
              {...chip(h === hour)}
            >
              <Text fontSize={12.5} fontWeight="800" color={h === hour ? '$onPrimary' : '$color'}>
                {pad(h)}
              </Text>
            </YStack>
          ))}
        </XStack>
      </ScrollView>
      <XStack gap={6}>
        {MINUTES.map((m) => (
          <YStack
            key={m}
            testID={`${testID}-minute-${m}`}
            role="button"
            aria-label={`Minute ${m}`}
            onPress={() => setMinute(m)}
            paddingHorizontal={14}
            paddingVertical={7}
            {...chip(m === minute)}
          >
            <Text fontSize={12.5} fontWeight="800" color={m === minute ? '$onPrimary' : '$color'}>
              :{pad(m)}
            </Text>
          </YStack>
        ))}
      </XStack>
      <XStack
        testID={`${testID}-done`}
        role="button"
        aria-label="Done"
        onPress={() => onDone(new Date(view.getFullYear(), view.getMonth(), day, hour, minute))}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="900" color="$onPrimary">
          Done
        </Text>
      </XStack>
    </YStack>
  );
}
