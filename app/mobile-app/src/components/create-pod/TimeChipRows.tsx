import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTES = [0, 15, 30, 45];
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** The pill every calendar/time chip is drawn as, selected or not. */
export const chipStyle = (selected: boolean) =>
  ({
    borderRadius: 999,
    borderWidth: 1,
    borderColor: selected ? '$primary' : '$borderColor',
    backgroundColor: selected ? '$primary' : 'transparent',
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
      paddingHorizontal={paddingHorizontal}
      paddingVertical={7}
      opacity={blocked ? 0.35 : 1}
      {...chipStyle(selected)}
    >
      <Text fontSize={12.5} fontWeight="600" color={blocked ? '$muted' : ink}>
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
  return (
    <>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {t('mweb.createPod.timeHeading')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={6}>
          {HOURS.map((h) => (
            <TimeChip
              key={h}
              testID={`${testID}-hour-${h}`}
              ariaLabel={t('mweb.createPod.hourAria', { vars: { hour: h } })}
              selected={h === hour}
              blocked={isHourBlocked(h)}
              paddingHorizontal={12}
              onPress={() => onHour(h)}
            >
              {pad2(h)}
            </TimeChip>
          ))}
        </XStack>
      </ScrollView>
      <XStack gap={6}>
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
      </XStack>
    </>
  );
}
