import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useHostPods, type HostPod } from '@/hooks/useHostPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type HostPodsFilters,
} from '@/utils/host-pods-filters';
import type { RootStackParamList } from '@/navigation/types';
import { HostPodRow } from './HostPodRow';
import { HostPodsFilterSheet } from './HostPodsFilterSheet';
import { PodDeleteDialog } from './PodDeleteDialog';
import { PodEditDialog } from './PodEditDialog';
import { PodCompleteDialog } from './PodCompleteDialog';
import type { HostPodSummary } from './pod-edit.form';
import type { HostPodForComplete } from './pod-complete.form';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

/** "Your pods" — every pod this host runs, with a Type/Time/Price filter and the
 * host's self-service Complete/Edit/Delete actions (2). */
export function HostPodsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color: ink, onPrimary } = useThemeColors();
  const { pods, isLoading, refetch } = useHostPods();
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterHostPods(pods, filters);
  const filterActive = activeHostFilterCount(filters) > 0;
  const filterLabel = filterActive ? `Filter (${activeHostFilterCount(filters)})` : 'Filter';

  const openPod = (pod: HostPod) =>
    navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title });

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
      {visible.map((pod) => (
        <HostPodRow
          key={pod.id}
          id={pod.id}
          title={pod.pod_title}
          when={formatWhen(pod.pod_date_time)}
          zoneName={pod.zone_name}
          typeLabel={pod.pod_type.replaceAll('_', ' ')}
          onOpen={() => openPod(pod)}
          onComplete={() =>
            setCompletePod({ id: pod.id, pod_title: pod.pod_title, venue_id: pod.venue_id })
          }
          onEdit={() => setEditPod(pod)}
          onDelete={() => setDeletePod({ id: pod.id, title: pod.pod_title })}
        />
      ))}
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
