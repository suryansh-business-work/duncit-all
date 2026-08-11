import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useDetailNav } from '@/hooks/useDetailNav';
import type { RootStackParamList } from '@/navigation/types';
import { useFeedbackLinkActions } from '@/hooks/useFeedbackLinkActions';
import { useHostPods, type HostPod } from '@/hooks/useHostPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type HostPodsFilters,
} from '@/utils/host-pods-filters';
import { isVenueRejected } from '@/utils/venue-approval';
import { HostPodsList } from './HostPodsList';
import { HostPodsFilterSheet } from './HostPodsFilterSheet';
import { PodActionsSheet } from './PodActionsSheet';
import { TicketScanDialog, type ScanTarget } from './ticket-scan';
import { PodDeleteDialog } from './PodDeleteDialog';
import { PodEditDialog } from './PodEditDialog';
import { PodCompleteDialog } from './PodCompleteDialog';
import { PodResubmitDialog } from './PodResubmitDialog';
import type { HostPodSummary } from './pod-edit.form';
import type { HostPodForComplete } from './pod-complete.form';
import type { HostPodForResubmit } from './pod-resubmit.form';

interface HostPodsSectionProps {
  /** Fired after a pod completes — the screen refetches the Host Share list,
   * which the completion just added a payout to. */
  onPodCompleted?: () => void;
}

/** "Your pods" — every pod this host runs, with a Type/Time/Price filter and the
 * host's self-service Complete/Edit/Delete actions (2). */
export function HostPodsSection({ onPodCompleted }: Readonly<HostPodsSectionProps>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openPod } = useDetailNav();
  const feedbackLink = useFeedbackLinkActions();
  const { color: ink, onPrimary } = useThemeColors();
  const { pods, isLoading, refetch } = useHostPods();
  // The whole row, not the narrower edit shape — the sheet routes to complete,
  // resubmit and cancel, which each need different fields off the pod.
  const [actionsPod, setActionsPod] = useState<HostPod | null>(null);
  const [scanPod, setScanPod] = useState<ScanTarget | null>(null);
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [resubmitPod, setResubmitPod] = useState<HostPodForResubmit | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterHostPods(pods, filters);
  const filterActive = activeHostFilterCount(filters) > 0;
  const filterLabel = filterActive ? `Filter (${activeHostFilterCount(filters)})` : 'Filter';

  /** Run one of the rating-link actions on the pod the sheet is open for. */
  const withActionsPod = (action: (pod: HostPod) => Promise<unknown> | void) => () => {
    // A dismissed share sheet rejects on iOS — that is the host closing it,
    // not a failure worth showing them.
    if (actionsPod) Promise.resolve(action(actionsPod)).catch(() => undefined);
    setActionsPod(null);
  };

  return (
    <YStack gap={12} testID="host-pods-section">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="700" color="$color">
          Your pods
        </Text>
        <XStack
          testID="host-pods-filter-open"
          role="button"
          aria-label="Filter pods"
          onPress={() => setFilterOpen(true)}
          alignItems="center"
          gap={6}
          height={34}
          paddingHorizontal={12}
          borderRadius={999}
          borderWidth={1}
          borderColor={filterActive ? '$primary' : '$borderColor'}
          backgroundColor={filterActive ? '$primary' : '$surface'}
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="filter-list" size={16} color={filterActive ? onPrimary : ink} />
          <Text fontSize={13} fontWeight="600" color={filterActive ? '$onPrimary' : '$color'}>
            {filterLabel}
          </Text>
        </XStack>
      </XStack>
      {feedbackLink.notice ? (
        <Text testID="host-pods-notice" fontSize={12.5} color="$success">
          {feedbackLink.notice}
        </Text>
      ) : null}
      <HostPodsList
        pods={pods}
        visible={visible}
        isLoading={isLoading}
        onOpen={(pod) => openPod(pod.club_slug, pod.pod_id)}
        onActions={setActionsPod}
      />
      <HostPodsFilterSheet
        open={filterOpen}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
      <PodActionsSheet
        open={!!actionsPod}
        podTitle={actionsPod?.pod_title ?? ''}
        onClose={() => setActionsPod(null)}
        onScan={() => {
          if (actionsPod) setScanPod({ id: actionsPod.id, pod_title: actionsPod.pod_title });
          setActionsPod(null);
        }}
        onComplete={() => {
          if (actionsPod) {
            setCompletePod({
              id: actionsPod.id,
              pod_title: actionsPod.pod_title,
              venue_id: actionsPod.venue_id,
            });
          }
          setActionsPod(null);
        }}
        // A venue-rejected pod opens the FULL edit + resubmission flow; every
        // other pod keeps the limited title/description/media edit.
        onEdit={() => {
          if (actionsPod) {
            const target = isVenueRejected(actionsPod.venue_approval_status)
              ? setResubmitPod
              : setEditPod;
            target(actionsPod);
          }
          setActionsPod(null);
        }}
        onOpenFeedback={withActionsPod(feedbackLink.open)}
        onShareFeedback={withActionsPod(feedbackLink.share)}
        onCopyFeedback={withActionsPod(feedbackLink.copy)}
        onCancel={() => {
          if (actionsPod) setDeletePod({ id: actionsPod.id, title: actionsPod.pod_title });
          setActionsPod(null);
        }}
      />
      <TicketScanDialog
        pod={scanPod}
        onClose={() => setScanPod(null)}
        onOpenProfile={(userId) => {
          setScanPod(null);
          navigation.navigate('PublicProfile', { userId });
        }}
      />
      <PodEditDialog
        pod={editPod}
        onClose={() => setEditPod(null)}
        onSaved={() => {
          setEditPod(null);
          refetch().catch(() => undefined);
        }}
      />
      <PodResubmitDialog
        pod={resubmitPod}
        onClose={() => setResubmitPod(null)}
        onSaved={() => {
          setResubmitPod(null);
          refetch().catch(() => undefined);
        }}
      />
      <PodDeleteDialog
        podId={deletePod?.id ?? null}
        podTitle={deletePod?.title ?? ''}
        onClose={() => setDeletePod(null)}
        onDeleted={() => {
          setDeletePod(null);
          refetch().catch(() => undefined);
        }}
      />
      <PodCompleteDialog
        key={completePod?.id ?? 'none'}
        pod={completePod}
        onClose={() => setCompletePod(null)}
        onCompleted={() => {
          setCompletePod(null);
          refetch().catch(() => undefined);
          onPodCompleted?.();
        }}
      />
    </YStack>
  );
}
