import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { parseDateTimeText } from './create-pod.form';
import type { CreatePodForm, CreatePodVenue } from './create-pod.types';

interface Props {
  form: CreatePodForm;
  venues: readonly CreatePodVenue[];
  currencySymbol: string;
  /** Back to Where & when, where the time and place are set. */
  onEdit: () => void;
}

/** Details' header: what the host already settled — when, where, how many and
 * the ticket — so the last step reads as a review. mWeb twin: PodSummaryCard. */
export function PodSummaryCard({ form, venues, currencySymbol, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const { formatDateTime, formatTime } = useDateFormat();
  const start = parseDateTimeText(form.watch('pod_date_time_text'));
  if (!start) return null;
  const end = parseDateTimeText(form.watch('pod_end_date_time_text'));
  const venue = venues.find((entry) => entry.id === form.watch('venue_id'));
  const amount = Number(form.watch('pod_amount_text')) || 0;
  const price =
    form.watch('pod_type') === 'FREE' ? t('mweb.createPod.summaryFree') : formatMoney(amount, { symbol: currencySymbol });
  const when = [formatDateTime(start), end ? formatTime(end) : ''].filter(Boolean).join(' – ');
  const what = [
    venue?.venue_name ?? form.watch('meeting_platform'),
    t('mweb.createPod.summaryGuests', { vars: { count: Number(form.watch('no_of_spots_text')) || 0 } }),
    price,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SurfaceCard testID="create-pod-summary">
      <XStack alignItems="center" gap={12}>
        <YStack width={40} height={40} borderRadius={20} backgroundColor="$soft" alignItems="center" justifyContent="center">
          <MaterialIcons name="event" size={20} color={primary} />
        </YStack>
        <YStack flex={1} gap={2}>
          <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
            {when}
          </Text>
          <Text fontSize={12} color="$muted" numberOfLines={1}>
            {what}
          </Text>
        </YStack>
        <XStack
          testID="create-pod-summary-edit"
          tabIndex={0}
          role="button"
          onPress={onEdit}
          minHeight={44}
          paddingHorizontal={8}
          alignItems="center"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="600" color="$accent">
            {t('mweb.createPod.summaryEdit')}
          </Text>
        </XStack>
      </XStack>
    </SurfaceCard>
  );
}
