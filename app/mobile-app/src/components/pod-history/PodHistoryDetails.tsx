import type { ReactNode } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { canRejoin, podPriceCaption, refundLabel, type PodMembership } from '@/utils/pod-history';
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
      <Text fontSize={11} fontWeight="800" color={tone === 'success' ? '$onPrimary' : '$color'}>
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
        <Text fontSize={15} fontWeight="900" color="$color">
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
  const pod = item.pod;
  const image = pod?.pod_images_and_videos?.[0]?.url;

  return (
    <YStack gap={12}>
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
              <Chip
                label={item.status === 'BACKED_OUT' ? 'Backed out' : 'Joined'}
                tone={item.status === 'BACKED_OUT' ? 'warning' : 'success'}
              />
              <Chip label={`Refund: ${refundLabel(item.refund_status)}`} tone="muted" />
            </XStack>
            <Text fontSize={16} fontWeight="900" color="$color">
              {pod?.pod_title ?? 'Pod details'}
            </Text>
            <Text fontSize={13} color="$muted">
              {pod?.pod_date_time ? formatDateTime(pod.pod_date_time) : 'Date not available'}
            </Text>
            <Text fontSize={12} color="$muted">
              {podPriceCaption(pod?.pod_type, pod?.pod_amount)}
            </Text>
          </YStack>
        </XStack>
      </Card>

      <Card title="Actions">
        <PodHistoryActions {...props} />
        {canRejoin(item) ? <ReplacementNotice deductionPct={deductionPct} /> : null}
        {item.status === 'BACKED_OUT' && item.refund_status === 'PENDING' ? (
          <Text testID="ph-refund-pending" fontSize={12} color="$muted">
            Refund is waiting for criteria completion. Support can help if the status looks wrong.
          </Text>
        ) : null}
        {notice ? (
          <Text testID="ph-notice" fontSize={13} fontWeight="700" color="$primary">
            {notice}
          </Text>
        ) : null}
      </Card>

      <PodProductOrdersCard orders={productOrders ?? []} loading={ordersLoading ?? false} />

      <Card title="Timeline">
        <PodHistoryTimeline item={item} />
      </Card>

      <XStack flexWrap="wrap" gap={16} paddingHorizontal={4}>
        <Text
          testID="ph-backout-terms"
          role="button"
          aria-label="Backout terms and conditions"
          onPress={onBackoutTerms}
          fontSize={13}
          fontWeight="800"
          color="$primary"
        >
          Backout Terms &amp; Conditions
        </Text>
        <Text
          testID="ph-general-terms"
          role="button"
          aria-label="General terms"
          onPress={onGeneralTerms}
          fontSize={13}
          fontWeight="800"
          color={primary}
        >
          General Terms
        </Text>
      </XStack>
    </YStack>
  );
}
