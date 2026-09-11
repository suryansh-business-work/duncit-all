import { Spinner, YStack } from 'tamagui';
import { coverImageUrl } from '@duncit/utils';

import { HostPodRow } from '@/components/host-manage/HostPodRow';
import { EmptyLine } from '@/components/host-manage/HostRowParts';
import { RowGroup } from '@/components/host-manage/RowGroup';
import type { HostPod } from '@/hooks/useHostPods';
import { useTranslation } from '@/hooks/useTranslation';
import { podTypeLabel } from '@/utils/pod-format';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from '@/utils/venue-approval';
import { formatDateTime } from '@/utils/date-format';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return formatDateTime(date) || '—';
}

interface Props {
  /** Every pod the host runs — what tells "no pods yet" from "no matches". */
  pods: HostPod[];
  visible: HostPod[];
  isLoading: boolean;
  onOpen: (pod: HostPod) => void;
  onActions: (pod: HostPod) => void;
}

/** The pods themselves in one card, or the one line that explains why there are none. */
export function HostPodsList({ pods, visible, isLoading, onOpen, onActions }: Readonly<Props>) {
  const { t } = useTranslation();

  let body;
  if (isLoading) {
    body = (
      <YStack paddingVertical={24} alignItems="center">
        <Spinner testID="host-pods-loading" color="$primary" />
      </YStack>
    );
  } else if (pods.length === 0) {
    body = (
      <EmptyLine
        testID="host-pods-empty"
        text="You don't host any pods yet. New pods you host will show up here."
      />
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyLine
        testID="host-pods-filtered-empty"
        text={t('mweb.hostManage.noPodsMatchTheseFiltersTry')}
      />
    );
  } else {
    body = visible.map((pod) => (
      <HostPodRow
        key={pod.id}
        id={pod.id}
        title={pod.pod_title}
        when={formatWhen(pod.pod_date_time)}
        zoneName={pod.zone_name}
        typeLabel={podTypeLabel(pod.pod_type)}
        free={pod.pod_type === 'FREE'}
        cover={coverImageUrl(pod.pod_images_and_videos)}
        approval={venueApprovalChip(pod.venue_approval_status)}
        rejectedNote={isVenueRejected(pod.venue_approval_status) ? VENUE_REJECTED_NOTE : null}
        onOpen={() => onOpen(pod)}
        onActions={() => onActions(pod)}
      />
    ));
  }

  return <RowGroup>{body}</RowGroup>;
}
