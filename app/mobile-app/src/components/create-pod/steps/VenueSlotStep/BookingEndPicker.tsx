import { Text, XStack, YStack } from 'tamagui';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { TimeChip } from '../../TimeChipRows';

interface Props {
  /** The ends the venue's grid allows after the picked start. */
  ends: readonly string[];
  /** The picked end, or '' while none is. */
  endIso: string;
  onPick: (end: string) => void;
}

/** The end of an hourly / per-guest / flat booking, once its start is picked —
 * or why there is none. mWeb twin: the end chips in InstantBookingPicker. */
export function BookingEndPicker({ ends, endIso, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const hasEnds = ends.length > 0;
  return (
    <YStack gap={8} testID="create-pod-booking-end">
      <Text fontSize={14} fontWeight="600" color="$color">
        {t('mweb.createPod.bookingEnd')}
      </Text>
      <XStack gap={8} flexWrap="wrap" role="radiogroup" aria-label={t('mweb.createPod.bookingEnd')}>
        {ends.map((option) => (
          <TimeChip
            key={option}
            testID={`create-pod-booking-end-${option}`}
            ariaLabel={fmt.formatTime(option)}
            selected={option === endIso}
            blocked={false}
            paddingHorizontal={14}
            onPress={() => onPick(option)}
          >
            {fmt.formatTime(option)}
          </TimeChip>
        ))}
      </XStack>
      <Text fontSize={12} color={hasEnds ? '$muted' : '$danger'}>
        {hasEnds ? t('mweb.createPod.bookingEndHint') : t('mweb.createPod.bookingNoEnd')}
      </Text>
    </YStack>
  );
}
