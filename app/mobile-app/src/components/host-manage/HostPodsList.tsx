import { Spinner, Text, YStack } from 'tamagui';

import { HostPodRow } from '@/components/host-manage/HostPodRow';
import type { HostPod } from '@/hooks/useHostPods';
import { podTypeLabel } from '@/utils/pod-format';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from '@/utils/venue-approval';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

interface Props {
  /** Every pod the host runs — what tells "no pods yet" from "no matches". */
  pods: HostPod[];
  visible: HostPod[];
  isLoading: boolean;
  onOpen: (pod: HostPod) => void;
  onActions: (pod: HostPod) => void;
}

/** The pods themselves, or the one line that explains why there are none. */
export function HostPodsList({ pods, visible, isLoading, onOpen, onActions }: Readonly<Props>) {
  if (isLoading) return <Spinner testID="host-pods-loading" color="$primary" />;

  if (pods.length === 0) {
    return (
      <Text testID="host-pods-empty" fontSize={13} color="$muted">
        You don't host any pods yet. New pods you host will show up here.
      </Text>
    );
  }

  if (visible.length === 0) {
    return (
      <Text testID="host-pods-filtered-empty" fontSize={13} color="$muted">
        No pods match these filters. Try adjusting or resetting them.
      </Text>
    );
  }

  return (
    <YStack gap={12}>
      {visible.map((pod) => (
        <HostPodRow
          key={pod.id}
          id={pod.id}
          title={pod.pod_title}
          when={formatWhen(pod.pod_date_time)}
          zoneName={pod.zone_name}
          typeLabel={podTypeLabel(pod.pod_type)}
          approval={venueApprovalChip(pod.venue_approval_status)}
          rejectedNote={isVenueRejected(pod.venue_approval_status) ? VENUE_REJECTED_NOTE : null}
          onOpen={() => onOpen(pod)}
          onActions={() => onActions(pod)}
        />
      ))}
    </YStack>
  );
}
