import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { PodRequestDetail } from '@/hooks/usePodRequestDetail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  slot: NonNullable<PodRequestDetail['slot']>;
}

/** The slot on the request — picked by the receiver, confirmed by the sender. */
export function SlotSummary({ slot }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { primary } = useThemeColors();
  const when = slot.whole_day
    ? [fmt.formatDate(slot.start_at), t('mweb.slots.wholeDay')].join(' · ')
    : [fmt.formatDateTime(slot.start_at), fmt.formatTime(slot.end_at)].join(' – ');

  return (
    <SurfaceCard testID="pod-request-slot">
      <XStack alignItems="center" gap={12}>
        <MaterialIcons name="event" size={22} color={primary} />
        <YStack flex={1} gap={2}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('podRequests.slotDetails')}
          </Text>
          <Text fontSize={15} fontWeight="600" color="$color">
            {when}
          </Text>
          <Text fontSize={13} color="$muted">
            {slot.space_label || t('mweb.slots.wholeVenue')}
          </Text>
        </YStack>
      </XStack>
    </SurfaceCard>
  );
}
