import { YStack } from 'tamagui';
import { splitHostPods } from '@duncit/utils';

import { useHostPods } from '@/hooks/useHostPods';
import { useTranslation } from '@/hooks/useTranslation';
import { useHostPodSheets } from './useHostPodSheets';
import { VenueRequestsSection } from './VenueRequestsSection';
import { YourPodsSection } from './YourPodsSection';

interface HostPodsSectionProps {
  /** Fired after a pod completes — the screen refetches the Host Share list,
   * which the completion just added a payout to. */
  onPodCompleted?: () => void;
}

/**
 * The three pod sections of Host Studio, in the order the host reads them:
 * Requested Pods (awaiting the venue), Your pods, then Rejected Pods.
 *
 * The split is derived from `venue_approval_status` on every render, so the
 * venue's decision landing is all it takes to move a pod between them — an
 * approval drops it into Your pods (whose default filter is Upcoming), a
 * refusal into Rejected Pods, which does not exist until something is refused.
 *
 * One sheets hook for all three: a pod keeps exactly the same actions wherever
 * it currently sits. mWeb twin: HostPodSections (rule 27).
 */
export function HostPodsSection({ onPodCompleted }: Readonly<HostPodsSectionProps>) {
  const { t } = useTranslation();
  const { pods, isLoading, refetch } = useHostPods();
  const { openActions, openPod, notice, sheets } = useHostPodSheets({ refetch, onPodCompleted });

  const { requested, yours, rejected } = splitHostPods(pods);

  return (
    <YStack gap={24}>
      <VenueRequestsSection
        testID="requested-pods-section"
        title={t('mweb.hostManage.requestedPods')}
        emptyText={t('mweb.hostManage.requestedPodsEmpty')}
        pods={requested}
        isLoading={isLoading}
        onOpen={openPod}
        onActions={openActions}
      />

      <YourPodsSection
        pods={yours}
        isLoading={isLoading}
        notice={notice}
        onOpen={openPod}
        onActions={openActions}
      />

      <VenueRequestsSection
        testID="rejected-pods-section"
        title={t('mweb.hostManage.rejectedPods')}
        emptyText={null}
        pods={rejected}
        isLoading={isLoading}
        onOpen={openPod}
        onActions={openActions}
      />

      {sheets}
    </YStack>
  );
}
