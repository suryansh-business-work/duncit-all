import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { useTranslation } from '@/hooks/useTranslation';
import {
  podPriceCaption,
  refundLabel,
  type podHistoryGate,
  type PodMembership,
} from '@/utils/pod-history';
import { formatDateTime } from '@/utils/date-format';

import { Card, Chip, STATUS_CHIP } from './detailsParts';

interface PodHistorySummaryProps {
  item: PodMembership;
  gate: ReturnType<typeof podHistoryGate>;
  image: string | null | undefined;
  muted: string;
  statusLabel: string;
}

/** The booking's summary card — cover, status/refund/coin chips, title, date
 * and price caption. */
export function PodHistorySummary({
  item,
  gate,
  image,
  muted,
  statusLabel,
}: Readonly<PodHistorySummaryProps>) {
  const { t } = useTranslation();
  const pod = item.pod;
  return (
    <Card>
      <XStack gap={12} alignItems="center">
        <YStack
          width={88}
          height={88}
          borderRadius={18}
          overflow="hidden"
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          {image ? (
            <AppImage
              source={{ uri: image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="event" size={30} color={muted} />
          )}
        </YStack>
        <YStack flex={1} gap={6}>
          <XStack gap={6} flexWrap="wrap">
            <Chip label={statusLabel} tone={STATUS_CHIP[item.status].tone} />
            {/* No refund state at all unless one is actually in play, and the
            word comes from the request rather than the booking — the
            booking's own copy is never written for a partial. */}
            {gate.showRefundState ? (
              <Chip
                label={t('mweb.podHistory.refundChip', {
                  vars: { status: refundLabel(gate.refundStatus, t) },
                })}
                tone="muted"
              />
            ) : null}
            {gate.coinsRefunded > 0 ? (
              <Chip label={`${t('mweb.coin.refundCoins')}: ${gate.coinsRefunded}`} tone="muted" />
            ) : null}
          </XStack>
          <Text fontSize={16} fontWeight="600" color="$color">
            {pod?.pod_title ?? t('mweb.podHistory.podDetailsTitle')}
          </Text>
          <Text fontSize={13} color="$muted">
            {pod?.pod_date_time
              ? formatDateTime(pod.pod_date_time)
              : t('mweb.podHistory.dateNotAvailable')}
          </Text>
          <Text fontSize={12} color="$muted">
            {podPriceCaption(pod?.pod_type, pod?.pod_amount, t)}
          </Text>
        </YStack>
      </XStack>
    </Card>
  );
}
