import { useState } from 'react';
import { addMonths, format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import {
  composeSelection,
  dayBlocked,
  hourBlocked,
  minuteBlocked,
  seedFor,
} from './date-time-limits';
import { chipStyle, MINUTES, TimeChipRows } from './TimeChipRows';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Day cells (with leading blanks) for the visible month. */
export function buildMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
}

interface DayCellProps {
  testID: string;
  /** Day of month, or null for a leading blank cell. */
  d: number | null;
  selected: boolean;
  blocked: boolean;
  ariaLabel?: string;
  onSelect: (d: number) => void;
}

/** One calendar cell — a leading blank or a pickable day (hoisted, S6478). */
function DayCell({ testID, d, selected, blocked, ariaLabel, onSelect }: Readonly<DayCellProps>) {
  if (!d) {
    return <YStack width="14.28%" height={38} alignItems="center" justifyContent="center" />;
  }
  const ink = selected ? '$onPrimary' : '$color';
  return (
    <YStack
      pressStyle={PRESS_STYLE.surface}
      testID={`${testID}-day-${d}`}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={blocked}
      onPress={blocked ? undefined : () => onSelect(d)}
      width="14.28%"
      height={38}
      alignItems="center"
      justifyContent="center"
    >
      <YStack
        width={32}
        height={32}
        alignItems="center"
        justifyContent="center"
        opacity={blocked ? 0.35 : 1}
        {...chipStyle(selected)}
      >
        <Text fontSize={13} fontWeight="700" color={blocked ? '$muted' : ink}>
          {d}
        </Text>
      </YStack>
    </YStack>
  );
}

interface SheetProps {
  testID: string;
  initial: Date | null;
  /** Earliest pickable moment — earlier days/hours/minutes are blocked. */
  minDateTime?: Date | null;
  muted: string;
  /** Off for a date-only pick (a whole-day slot, a date range) — the hour and
   * minute rows are not shown and the seed's time rides along unchanged. */
  showTime?: boolean;
  onDone: (picked: Date) => void;
}

/** Calendar grid + hour/minute chips — the body of the date-time sheet. */
export function CalendarSheet({
  testID,
  initial,
  minDateTime = null,
  muted,
  showTime = true,
  onDone,
}: Readonly<SheetProps>) {
  const { t } = useTranslation();
  const seed = seedFor(initial, minDateTime);
  const [view, setView] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1));
  const [day, setDay] = useState(seed.getDate());
  const [hour, setHour] = useState(seed.getHours());
  const [minute, setMinute] = useState(MINUTES.includes(seed.getMinutes()) ? seed.getMinutes() : 0);
  const days = buildMonthDays(view.getFullYear(), view.getMonth());
  const picked = composeSelection(view, day, hour, minute);
  const pickedBlocked = !!minDateTime && picked < minDateTime;

  return (
    <YStack gap={12}>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack
          testID={`${testID}-prev-month`}
          role="button"
          aria-label={t('mweb.slots.previousMonth')}
          onPress={() => setView((v) => addMonths(v, -1))}
          padding={8}
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="chevron-left" size={22} color={muted} />
        </XStack>
        <Text fontSize={15} fontWeight="700" color="$color">
          {format(view, 'MMMM yyyy')}
        </Text>
        <XStack
          testID={`${testID}-next-month`}
          role="button"
          aria-label={t('mweb.slots.nextMonth')}
          onPress={() => setView((v) => addMonths(v, 1))}
          padding={8}
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="chevron-right" size={22} color={muted} />
        </XStack>
      </XStack>
      <XStack flexWrap="wrap">
        {days.map((d, index) => (
          <DayCell
            // eslint-disable-next-line react/no-array-index-key -- leading blanks repeat null
            key={`${view.getMonth()}-${index}`}
            testID={testID}
            d={d}
            selected={d === day}
            blocked={!!d && dayBlocked(view, d, minDateTime)}
            ariaLabel={d ? t('mweb.createPod.dayAria', { vars: { day: d } }) : undefined}
            onSelect={setDay}
          />
        ))}
      </XStack>
      {showTime ? (
        <TimeChipRows
          testID={testID}
          hour={hour}
          minute={minute}
          onHour={setHour}
          onMinute={setMinute}
          isHourBlocked={(h) => hourBlocked(view, day, h, minDateTime)}
          isMinuteBlocked={(m) => minuteBlocked(view, day, hour, m, minDateTime)}
        />
      ) : null}
      <XStack
        testID={`${testID}-done`}
        role="button"
        aria-label={t('mweb.createPod.done')}
        aria-disabled={pickedBlocked}
        onPress={pickedBlocked ? undefined : () => onDone(picked)}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        opacity={pickedBlocked ? 0.5 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {t('mweb.createPod.done')}
        </Text>
      </XStack>
    </YStack>
  );
}
