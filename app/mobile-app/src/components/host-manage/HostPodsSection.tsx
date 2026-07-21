import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useDetailNav } from '@/hooks/useDetailNav';
import { useHostPods } from '@/hooks/useHostPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type HostPodsFilters,
} from '@/utils/host-pods-filters';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from '@/utils/venue-approval';
import { HostPodRow } from './HostPodRow';
import { HostPodsFilterSheet } from './HostPodsFilterSheet';
import { PodDeleteDialog } from './PodDeleteDialog';
import { PodEditDialog } from './PodEditDialog';
import { PodCompleteDialog } from './PodCompleteDialog';
import { PodResubmitDialog } from './PodResubmitDialog';
import type { HostPodSummary } from './pod-edit.form';
import type { HostPodForComplete } from './pod-complete.form';
import type { HostPodForResubmit } from './pod-resubmit.form';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

/** "Your pods" — every pod this host runs, with a Type/Time/Price filter and the
 * host's self-service Complete/Edit/Delete actions (2). */
export function HostPodsSection() {
  const { openPod } = useDetailNav();
  const { color: ink, onPrimary } = useThemeColors();
  const { pods, isLoading, refetch } = useHostPods();
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [resubmitPod, setResubmitPod] = useState<HostPodForResubmit | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterHostPods(pods, filters);
  const filterActive = activeHostFilterCount(filters) > 0;
  const filterLabel = filterActive ? `Filter (${activeHostFilterCount(filters)})` : 'Filter';

  return (
    <YStack gap={12} testID="host-pods-section">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="900" color="$color">
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
          <Text fontSize={13} fontWeight="800" color={filterActive ? '$onPrimary' : '$color'}>
            {filterLabel}
          </Text>
        </XStack>
      </XStack>
      {isLoading ? <Spinner testID="host-pods-loading" color="$primary" /> : null}
      {!isLoading && pods.length === 0 ? (
        <Text testID="host-pods-empty" fontSize={13} color="$muted">
          You don't host any pods yet. New pods you host will show up here.
        </Text>
      ) : null}
      {!isLoading && pods.length > 0 && visible.length === 0 ? (
        <Text testID="host-pods-filtered-empty" fontSize={13} color="$muted">
          No pods match these filters. Try adjusting or resetting them.
        </Text>
      ) : null}
      {visible.map((pod) => {
        const rejected = isVenueRejected(pod.venue_approval_status);
        return (
          <HostPodRow
            key={pod.id}
            id={pod.id}
            title={pod.pod_title}
            when={formatWhen(pod.pod_date_time)}
            zoneName={pod.zone_name}
            typeLabel={pod.pod_type.replaceAll('_', ' ')}
            approval={venueApprovalChip(pod.venue_approval_status)}
            rejectedNote={rejected ? VENUE_REJECTED_NOTE : null}
            onOpen={() => openPod(pod.club_slug, pod.pod_id)}
            onComplete={() =>
              setCompletePod({ id: pod.id, pod_title: pod.pod_title, venue_id: pod.venue_id })
            }
            // A venue-rejected pod opens the FULL edit + resubmission flow; every
            // other pod keeps the limited title/description/media edit.
            onEdit={() => (rejected ? setResubmitPod(pod) : setEditPod(pod))}
            onDelete={() => setDeletePod({ id: pod.id, title: pod.pod_title })}
          />
        );
      })}
      <HostPodsFilterSheet
        open={filterOpen}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
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
        }}
      />
    </YStack>
  );
}
