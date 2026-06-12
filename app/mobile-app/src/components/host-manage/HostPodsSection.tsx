import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { useHostPods, type HostPod } from '@/hooks/useHostPods';
import { SimpleBarChart, buildMonthlyCounts } from '@/components/SimpleBarChart';
import type { RootStackParamList } from '@/navigation/types';
import { HostPodRow } from './HostPodRow';
import { PodDeleteDialog } from './PodDeleteDialog';
import { PodEditDialog } from './PodEditDialog';
import type { HostPodSummary } from './pod-edit.form';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

/** "Your pods" — every pod this host runs, with self-service Edit + Delete (2). */
export function HostPodsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { pods, isLoading, refetch } = useHostPods();
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);

  const openPod = (pod: HostPod) =>
    navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title });

  return (
    <YStack gap={12} testID="host-pods-section">
      <YStack
        gap={4}
        padding={14}
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Text fontSize={15} fontWeight="900" color="$color">
          Pods by month
        </Text>
        <Text fontSize={11.5} color="$muted">
          Your hosted pods over the last 2 and next 3 months
        </Text>
        <SimpleBarChart
          testID="host-pods-chart"
          data={buildMonthlyCounts(pods.map((pod) => pod.pod_date_time))}
        />
      </YStack>
      <Text fontSize={16} fontWeight="900" color="$color">
        Your pods
      </Text>
      {isLoading ? <Spinner testID="host-pods-loading" color="$primary" /> : null}
      {!isLoading && pods.length === 0 ? (
        <Text testID="host-pods-empty" fontSize={13} color="$muted">
          You don't host any pods yet. New pods you host will show up here.
        </Text>
      ) : null}
      {pods.map((pod) => (
        <HostPodRow
          key={pod.id}
          id={pod.id}
          title={pod.pod_title}
          when={formatWhen(pod.pod_date_time)}
          zoneName={pod.zone_name}
          typeLabel={pod.pod_type.replace(/_/g, ' ')}
          onOpen={() => openPod(pod)}
          onEdit={() => setEditPod(pod)}
          onDelete={() => setDeletePod({ id: pod.id, title: pod.pod_title })}
        />
      ))}
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
    </YStack>
  );
}
