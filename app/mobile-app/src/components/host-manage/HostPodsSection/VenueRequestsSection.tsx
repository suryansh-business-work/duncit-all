import { Spinner, YStack } from 'tamagui';
import { coverImageUrl } from '@duncit/utils';

import type { HostPod } from '@/hooks/useHostPods';
import { EmptyLine } from '@/components/host-manage/HostRowParts';
import { HostSectionHeader } from '@/components/host-manage/HostSectionHeader';
import { RowGroup } from '@/components/host-manage/RowGroup';
import { formatDateTime } from '@/utils/date-format';
import { podTypeLabel } from '@/utils/pod-format';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from '@/utils/venue-approval';
import { VenueRequestRow } from './VenueRequestRow';

/** The old two-line empty copy — kept exported for existing importers; the
 * section now draws only its one line (`emptyText`). */
export interface VenueRequestsEmptyCopy {
  title: string;
  text: string;
}

interface Props {
  testID: string;
  title: string;
  /**
   * The one line an empty section says, or null for a section that should not
   * exist at all until it has something in it — which is exactly Rejected Pods.
   */
  emptyText: string | null;
  pods: HostPod[];
  isLoading: boolean;
  onOpen: (pod: HostPod) => void;
  onActions: (pod: HostPod) => void;
}

const formatWhen = (value?: string | null): string => {
  if (!value) return '—';
  return formatDateTime(new Date(value)) || '—';
};

/**
 * One venue-approval section — Requested Pods, or Rejected Pods. Both list the
 * same row and differ only in copy and whether an empty list is worth a
 * heading, so they are one component rather than two that drift (rule 40).
 * mWeb twin: VenueRequestsCard (rule 27).
 */
export function VenueRequestsSection({
  testID,
  title,
  emptyText,
  pods,
  isLoading,
  onOpen,
  onActions,
}: Readonly<Props>) {
  // Rejected Pods passes no empty copy: the section does not exist until a
  // venue actually refuses a slot.
  if (pods.length === 0 && !emptyText) return null;

  let body;
  if (isLoading) {
    body = (
      <YStack paddingVertical={20} alignItems="center">
        <Spinner testID={`${testID}-loading`} color="$primary" />
      </YStack>
    );
  } else if (pods.length === 0) {
    body = <EmptyLine testID={`${testID}-empty`} text={emptyText ?? ''} />;
  } else {
    body = pods.map((pod) => (
      <VenueRequestRow
        key={pod.id}
        id={pod.id}
        title={pod.pod_title}
        typeLabel={podTypeLabel(pod.pod_type)}
        free={pod.pod_type === 'FREE'}
        cover={coverImageUrl(pod.pod_images_and_videos)}
        venueName={pod.place_label ?? pod.zone_name ?? '—'}
        requestedOn={formatWhen(pod.created_at)}
        eventDate={formatWhen(pod.pod_date_time)}
        approval={venueApprovalChip(pod.venue_approval_status)}
        rejectedNote={isVenueRejected(pod.venue_approval_status) ? VENUE_REJECTED_NOTE : null}
        onOpen={() => onOpen(pod)}
        onActions={() => onActions(pod)}
      />
    ));
  }

  return (
    <YStack gap={12} testID={testID}>
      <HostSectionHeader title={title} count={pods.length} />
      <RowGroup>{body}</RowGroup>
    </YStack>
  );
}
