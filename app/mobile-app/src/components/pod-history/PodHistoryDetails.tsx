import type { ReactNode } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { isPodPast } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import {
  canRejoin,
  podHistoryGate,
  podPriceCaption,
  refundLabel,
  type PodMembership,
} from '@/utils/pod-history';
import type { ProductOrder } from '@/utils/product-orders';
import { formatDateTime } from '@/utils/date-format';
import { PodHistoryActions } from './PodHistoryActions';
import { PodHistoryTimeline } from './PodHistoryTimeline';
import { PodProductOrdersCard } from './PodProductOrdersCard';
import { ReplacementNotice } from './ReplacementNotice';

export interface PodHistoryDetailsProps {
  item: PodMembership;
  backingOut: boolean;
  rejoining: boolean;
  invoiceBusy: boolean;
  ticketBusy: boolean;
  notice: string | null;
  deductionPct: number;
  productOrders?: ProductOrder[];
  ordersLoading?: boolean;
  onPodDetails: () => void;
  onBackout: () => void;
  onRejoin: () => void;
  onRefundStatus: () => void;
  onInvoice: () => void;
  onTicket: () => void;
  onSupport: () => void;
  onBackoutTerms: () => void;
  onGeneralTerms: () => void;
}

type StatusTone = 'success' | 'warning';

/** Booking-status chip copy — "Backout in process" is its own visible state
 * (computed once here so children stay branch-free; mirrors mWeb). `label` is a
 * translation key: the words live in @duncit/i18n so the two apps agree. */
const STATUS_CHIP: Record<PodMembership['status'], { label: string; tone: StatusTone }> = {
  JOINED: { label: 'mweb.podHistory.statusJoined', tone: 'success' },
  BACKOUT_IN_PROCESS: { label: 'mweb.podHistory.statusBackoutInProcess', tone: 'warning' },
  BACKED_OUT: { label: 'mweb.podHistory.statusBackedOut', tone: 'warning' },
};

function Chip({ label, tone }: Readonly<{ label: string; tone: 'success' | 'warning' | 'muted' }>) {
  const bg = tone === 'success' ? '$primary' : '$surface';
  return (
    <XStack
      borderRadius={999}
      paddingHorizontal={10}
      paddingVertical={3}
      backgroundColor={bg}
      borderWidth={tone === 'success' ? 0 : 1}
      borderColor="$borderColor"
    >
      <Text fontSize={11} fontWeight="600" color={tone === 'success' ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

function Card({ title, children }: Readonly<{ title?: string; children: ReactNode }>) {
  return (
    <YStack
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={12}
    >
      {title ? (
        <Text fontSize={15} fontWeight="700" color="$color">
          {title}
        </Text>
      ) : null}
      {children}
    </YStack>
  );
}

/** Membership details body — summary, actions, timeline and terms links.
 * RN twin of mWeb's PodHistoryDetails. */
export function PodHistoryDetails(props: Readonly<PodHistoryDetailsProps>) {
  const {
    item,
    notice,
    deductionPct,
    onBackoutTerms,
    onGeneralTerms,
    productOrders,
    ordersLoading,
  } = props;
  const { onPrimary, primary } = useThemeColors();
  const { t } = useTranslation();
  const pod = item.pod;
  const image = pod?.pod_images_and_videos?.[0]?.url;
  const gate = podHistoryGate(item);
  // "Visited" once the pod has happened — "Joined" is a promise about something
  // still ahead.
  const visited = gate.joinedLabelKind === 'VISITED' && item.status === 'JOINED';
  const statusLabel = visited
    ? t('mweb.podHistory.statusVisited')
    : t(STATUS_CHIP[item.status].label);
  // Neither notice belongs on a pod that has already happened: nobody can fill
  // that seat now, and the refund question is already settled.
  const podPast = isPodPast(pod?.pod_date_time);
  const showReplacement = !podPast && (canRejoin(item) || item.status === 'BACKOUT_IN_PROCESS');

  return (
    <YStack gap={12}>
      {/* The tour's first step. It lives here and not on the history LIST
          because the ticket and back-out controls only exist on this screen —
          and a tour that resolves on the list would open there, one step long,
          and record itself as shown. */}
      <TourAnchor tour="booking" anchor="booking-summary">
        <Card>
          <XStack gap={12} alignItems="center">
            <YStack
              width={88}
              height={88}
              borderRadius={16}
              overflow="hidden"
              backgroundColor="$primary"
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
                <MaterialIcons name="event" size={30} color={onPrimary} />
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
              </XStack>
              <Text fontSize={16} fontWeight="700" color="$color">
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
      </TourAnchor>

      <Card title={t('mweb.podHistory.actions')}>
        <PodHistoryActions {...props} />
        {showReplacement ? <ReplacementNotice deductionPct={deductionPct} /> : null}
        {!podPast && gate.refundStatus === 'PENDING' ? (
          <Text testID="ph-refund-pending" fontSize={12} color="$muted">
            {t('mweb.podHistory.refundPendingNote')}
          </Text>
        ) : null}
        {notice ? (
          <Text testID="ph-notice" fontSize={13} fontWeight="700" color="$primary">
            {notice}
          </Text>
        ) : null}
      </Card>

      <PodProductOrdersCard orders={productOrders ?? []} loading={ordersLoading ?? false} />

      <Card title={t('mweb.podHistory.timeline')}>
        <PodHistoryTimeline item={item} />
      </Card>

      <XStack flexWrap="wrap" gap={16} paddingHorizontal={4}>
        <Text
          testID="ph-backout-terms"
          role="button"
          aria-label={t('mweb.podHistory.backoutTerms')}
          onPress={onBackoutTerms}
          fontSize={13}
          fontWeight="600"
          color="$primary"
        >
          {t('mweb.podHistory.backoutTerms')}
        </Text>
        <Text
          testID="ph-general-terms"
          role="button"
          aria-label={t('mweb.podHistory.generalTerms')}
          onPress={onGeneralTerms}
          fontSize={13}
          fontWeight="600"
          color={primary}
        >
          {t('mweb.podHistory.generalTerms')}
        </Text>
      </XStack>
    </YStack>
  );
}
