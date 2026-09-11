import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import {
  hourChips,
  MERIDIEMS,
  meridiemOf,
  usesTwelveHourClock,
  withMeridiem,
  type Meridiem,
} from '@duncit/datetime';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

export const MINUTES = [0, 15, 30, 45];
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** The pill every time chip is drawn as: green when picked, a soft fill when not. */
export const chipStyle = (selected: boolean) =>
  ({
    borderRadius: 999,
    backgroundColor: selected ? '$primary' : '$soft',
  }) as const;

interface TimeChipProps {
  testID: string;
  ariaLabel: string;
  selected: boolean;
  blocked: boolean;
  paddingHorizontal: number;
  onPress: () => void;
  children: ReactNode;
}

/** Hour / minute chip (hoisted, S6478). */
export function TimeChip({
  testID,
  ariaLabel,
  selected,
  blocked,
  paddingHorizontal,
  onPress,
  children,
}: Readonly<TimeChipProps>) {
  const ink = selected ? '$onPrimary' : '$color';
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={blocked}
      onPress={blocked ? undefined : onPress}
      minHeight={36}
      justifyContent="center"
      paddingHorizontal={paddingHorizontal}
      opacity={blocked ? 0.35 : 1}
      {...chipStyle(selected)}
    >
      <Text fontSize={13} fontWeight="600" color={blocked ? '$muted' : ink}>
        {children}
      </Text>
    </YStack>
  );
}

const never = () => false;

export interface TimeChipRowsProps {
  testID: string;
  hour: number;
  minute: number;
  onHour: (hour: number) => void;
  onMinute: (minute: number) => void;
  /** Chips that can never reach the earliest allowed moment — omitted, every chip is open. */
  isHourBlocked?: (hour: number) => boolean;
  isMinuteBlocked?: (minute: number) => boolean;
}

/**
 * The hour strip and the quarter-hour row — the time half of the create-pod
 * calendar sheet, on its own so a time-only picker (a venue's daily windows)
 * offers exactly the same chips (rule 34).
 *
 * Which clock it draws is the admin's Display Formats choice (rule 11): a
 * 12-hour time pattern gets twelve hour chips plus AM/PM, a 24-hour one gets
 * 00–23. The hour handed back is 0–23 on both, so no caller changes with the
 * setting.
 */
export function TimeChipRows({
  testID,
  hour,
  minute,
  onHour,
  onMinute,
  isHourBlocked = never,
  isMinuteBlocked = never,
}: Readonly<TimeChipRowsProps>) {
  const { t } = useTranslation();
  const { timeFormat } = useDateFormat();
  const twelveHour = usesTwelveHourClock(timeFormat);
  const active = meridiemOf(hour);
  const chips = hourChips(twelveHour, active);
  const meridiemLabel: Record<Meridiem, string> = {
    AM: t('mweb.createPod.am'),
    PM: t('mweb.createPod.pm'),
  };

  // Switching half keeps the clock number already picked; when that hour is out
  // of range (a slot cannot start in the past) it lands on the earliest hour of
  // the half that still is, rather than leaving a dead chip selected.
  const pickMeridiem = (next: Meridiem) => {
    const sameNumber = withMeridiem(hour, next);
    if (!isHourBlocked(sameNumber)) {
      onHour(sameNumber);
      return;
    }
    const open = hourChips(true, next).find((chip) => !isHourBlocked(chip.hour));
    if (open) onHour(open.hour);
  };

  return (
    <>
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('mweb.createPod.timeHeading')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={6}>
          {chips.map((chip) => (
            <TimeChip
              key={chip.hour}
              testID={`${testID}-hour-${chip.hour}`}
              ariaLabel={t('mweb.createPod.hourAria', { vars: { hour: chip.label } })}
              selected={chip.hour === hour}
              blocked={isHourBlocked(chip.hour)}
              paddingHorizontal={12}
              onPress={() => onHour(chip.hour)}
            >
              {chip.label}
            </TimeChip>
          ))}
        </XStack>
      </ScrollView>
      <XStack gap={6} flexWrap="wrap">
        {MINUTES.map((m) => (
          <TimeChip
            key={m}
            testID={`${testID}-minute-${m}`}
            ariaLabel={t('mweb.createPod.minuteAria', { vars: { minute: m } })}
            selected={m === minute}
            blocked={isMinuteBlocked(m)}
            paddingHorizontal={14}
            onPress={() => onMinute(m)}
          >
            :{pad2(m)}
          </TimeChip>
        ))}
        {twelveHour
          ? MERIDIEMS.map((meridiem) => (
              <TimeChip
                key={meridiem}
                testID={`${testID}-meridiem-${meridiem}`}
                ariaLabel={meridiemLabel[meridiem]}
                selected={meridiem === active}
                blocked={hourChips(true, meridiem).every((chip) => isHourBlocked(chip.hour))}
                paddingHorizontal={14}
                onPress={() => pickMeridiem(meridiem)}
              >
                {meridiemLabel[meridiem]}
              </TimeChip>
            ))
          : null}
      </XStack>
    </>
  );
}
