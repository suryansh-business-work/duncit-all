import { Text, XStack, YStack } from 'tamagui';
import {
  formatMoney,
  POD_ROW_STATUS_COLORS,
  podRowStatus,
  podRowStatusLabel,
  ticketDiscountRows,
} from '@duncit/utils';

import { InfoRowList, type InfoRowProps } from '@/components/pod-pending/InfoRow';
import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';
import { PodDetailSection } from './PodDetailSection';

/** The live multi-ticket offer, one line per tier. Nothing for a free pod or a
 * pod without tiers — the shared rows lead with a "1 ticket · 0%" base row the
 * server never stores, so it is dropped. */
function ticketOfferValue(pod: ClubPodDetail, t: Translate): string | null {
  const unitPrice = Number(pod.pod_amount) || 0;
  if (pod.pod_type.includes('FREE') || unitPrice <= 0) return null;
  const tiers = ticketDiscountRows(unitPrice, pod).slice(1);
  if (tiers.length === 0) return null;
  return tiers
    .map((tier) =>
      t('podDetailsPanel.podOverviewCard.ticketDiscountTier', {
        vars: { count: tier.min_tickets, pct: tier.discount_pct },
      }),
    )
    .join('\n');
}

interface Props {
  pod: ClubPodDetail;
}

/**
 * The pod's core facts — schedule, capacity, reach and description.
 *
 * The Tamagui twin of `@duncit/pod-details`' `PodOverviewCard` and
 * `PodStatusChips` (rule 27): the same figures in the same order, with the
 * status chip read from the SHARED `podRowStatus` rules so a pod can never be
 * named one thing here and another on the pods list.
 */
export function PodDetailOverview({ pod }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { currency } = usePublicFinance();
  const tones = useToneColors();
  const showProducts = useFeatureFlag('is_product_visible');
  const status = podRowStatus(pod);
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const attended = pod.attendance.recorded
    ? [pod.attendance.attended_seats, pod.attendance.booked_seats].join(' / ')
    : t('mweb.studioPods.attendedNone');
  const price = pod.pod_type.includes('FREE')
    ? t('mweb.podDetails.free')
    : formatMoney(pod.pod_amount, { symbol: currency });
  const place = isVirtual
    ? pod.meeting_platform || t('mweb.podDetails.online')
    : pod.place_label || pod.zone_name || '';

  const rows: InfoRowProps[] = [
    {
      icon: 'confirmation-number',
      label: t('podDetailsPanel.podOverviewCard.podId'),
      value: pod.pod_id,
      testID: 'club-pod-detail-pod-id',
    },
    {
      icon: 'event',
      label: t('podDetailsPanel.podOverviewCard.when'),
      value: formatDateTime(pod.pod_date_time),
      testID: 'club-pod-detail-when',
    },
  ];
  if (pod.pod_end_date_time) {
    rows.push({
      icon: 'event-available',
      label: t('podDetailsPanel.podOverviewCard.ends'),
      value: formatDateTime(pod.pod_end_date_time),
      testID: 'club-pod-detail-ends',
    });
  }
  if (place) {
    rows.push({
      icon: isVirtual ? 'videocam' : 'place',
      label: isVirtual
        ? t('podDetailsPanel.podOverviewCard.meeting')
        : t('podDetailsPanel.podOverviewCard.zone'),
      value: place,
      testID: 'club-pod-detail-place',
    });
  }
  rows.push(
    {
      icon: 'groups',
      label: t('podDetailsPanel.podOverviewCard.peopleIn'),
      value: String(pod.seats_taken),
      testID: 'club-pod-detail-people',
    },
    {
      icon: 'event-seat',
      label: t('podDetailsPanel.podOverviewCard.spotsLeft'),
      value: String(Math.max(pod.no_of_spots - pod.seats_taken, 0)),
      testID: 'club-pod-detail-spots-left',
    },
    // Seats marked present against seats booked — the figure the host's payout
    // is computed from, so it sits beside the booking count rather than
    // somewhere the two have to be reconciled.
    {
      icon: 'how-to-reg',
      label: t('mweb.studioPods.attended'),
      value: attended,
      testID: 'club-pod-detail-attended',
    },
  );
  const offer = ticketOfferValue(pod, t);
  if (offer) {
    rows.push({
      icon: 'local-offer',
      label: t('podDetailsPanel.podOverviewCard.ticketDiscount'),
      value: offer,
      testID: 'club-pod-detail-ticket-offer',
    });
  }
  rows.push(
    {
      icon: 'visibility',
      label: t('podDetailsPanel.podOverviewCard.views'),
      value: String(pod.pod_hits),
      testID: 'club-pod-detail-views',
    },
    {
      icon: 'favorite-border',
      label: t('podDetailsPanel.podOverviewCard.likesComments'),
      value: [pod.like_count, pod.comment_count].join(' · '),
      testID: 'club-pod-detail-social',
    },
  );
  if (showProducts) {
    const products = pod.products_enabled
      ? t('podDetailsPanel.podOverviewCard.productsEnabled')
      : t('podDetailsPanel.podOverviewCard.productsOff');
    rows.push({
      icon: 'shopping-bag',
      label: t('podDetailsPanel.podOverviewCard.products'),
      value: products,
      testID: 'club-pod-detail-products',
    });
  }
  rows.push({
    icon: 'schedule',
    label: t('podDetailsPanel.common.created'),
    value: formatDateTime(pod.created_at),
    testID: 'club-pod-detail-created',
  });

  return (
    <PodDetailSection
      title={t('podDetailsPanel.podOverviewCard.overview')}
      testID="club-pod-detail-overview"
    >
      <XStack gap={8} flexWrap="wrap">
        <ToneChip
          testID="club-pod-detail-status"
          label={podRowStatusLabel(status, t)}
          color={tones[POD_ROW_STATUS_COLORS[status]]}
        />
        <ToneChip testID="club-pod-detail-price" label={price} color={tones.info} />
        <ToneChip
          testID="club-pod-detail-mode"
          label={isVirtual ? t('mweb.podDetails.virtual') : t('mweb.podDetails.physical')}
          color={tones.default}
        />
      </XStack>
      <InfoRowList rows={rows} />
      {pod.pod_description ? (
        <YStack gap={4} borderTopWidth={1} borderTopColor="$borderColor" paddingTop={12}>
          <Text fontSize={12} fontWeight="500" color="$muted">
            {t('podDetailsPanel.common.description')}
          </Text>
          <Text testID="club-pod-detail-description" fontSize={14} color="$color">
            {pod.pod_description}
          </Text>
        </YStack>
      ) : null}
    </PodDetailSection>
  );
}
