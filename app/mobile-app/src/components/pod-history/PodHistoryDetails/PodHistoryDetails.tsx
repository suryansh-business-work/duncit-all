import { Text, XStack, YStack } from 'tamagui';
import { coverImageUrl, isPodPast } from '@duncit/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import { canRejoin, podHistoryGate } from '@/utils/pod-history';
import { PodHistoryActions } from '../PodHistoryActions';
import { PodHistoryTimeline } from '../PodHistoryTimeline';
import { PodProductOrdersCard } from '../PodProductOrdersCard';
import { PodChallengesSection } from '@/components/challenge/PodChallengesSection';
import { ReplacementNotice } from '../ReplacementNotice';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { Card, STATUS_CHIP } from './detailsParts';
import { PodHistorySummary } from './PodHistorySummary';
import type { PodHistoryDetailsProps } from './types';

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
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const pod = item.pod;
  const image = coverImageUrl(pod?.pod_images_and_videos);
  const gate = podHistoryGate(item);
  // "Visited" once they were checked in at a pod that has happened — never on
  // the clock alone.
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
        <PodHistorySummary
          item={item}
          gate={gate}
          image={image}
          muted={muted}
          statusLabel={statusLabel}
        />
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
          <Text testID="ph-notice" fontSize={13} fontWeight="700" color="$accent">
            {notice}
          </Text>
        ) : null}
      </Card>

      <PodProductOrdersCard orders={productOrders ?? []} loading={ordersLoading ?? false} />

      {pod?.id ? <PodChallengesSection podId={pod.id} finishedOnly /> : null}

      <Card title={t('mweb.podHistory.timeline')}>
        <PodHistoryTimeline item={item} />
      </Card>

      <XStack flexWrap="wrap" gap={16} paddingHorizontal={4}>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="ph-backout-terms"
          role="button"
          aria-label={t('mweb.podHistory.backoutTerms')}
          onPress={onBackoutTerms}
          fontSize={13}
          fontWeight="600"
          color="$accent"
        >
          {t('mweb.podHistory.backoutTerms')}
        </Text>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="ph-general-terms"
          role="button"
          aria-label={t('mweb.podHistory.generalTerms')}
          onPress={onGeneralTerms}
          fontSize={13}
          fontWeight="600"
          color="$accent"
        >
          {t('mweb.podHistory.generalTerms')}
        </Text>
      </XStack>
    </YStack>
  );
}
