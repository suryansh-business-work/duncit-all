import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import type { HostPod } from '@/hooks/useHostPods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/utils/date-format';
import { podTypeLabel } from '@/utils/pod-format';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from '@/utils/venue-approval';
import { VenueRequestRow } from './VenueRequestRow';

/** What the section says when it has nothing to list. */
export interface VenueRequestsEmptyCopy {
  title: string;
  text: string;
}

interface Props {
  testID: string;
  icon: 'hourglass-top' | 'cancel-schedule-send';
  /** Tone of the header icon — amber while waiting, red once refused. */
  tint: string;
  title: string;
  subtitle: string;
  /**
   * Copy for the empty state, or null for a section that should not exist at
   * all until it has something in it — which is exactly Rejected Pods.
   */
  empty: VenueRequestsEmptyCopy | null;
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
 * same card and differ only in copy, tone and whether an empty list is worth a
 * heading, so they are one component rather than two that drift (rule 40).
 * mWeb twin: VenueRequestsCard (rule 27).
 */
export function VenueRequestsSection({
  testID,
  icon,
  tint,
  title,
  subtitle,
  empty,
  pods,
  isLoading,
  onOpen,
  onActions,
}: Readonly<Props>) {
  const { muted } = useThemeColors();

  // Rejected Pods passes no empty copy: the section does not exist until a
  // venue actually refuses a slot.
  if (pods.length === 0 && !empty) return null;

  let body;
  if (isLoading) {
    body = <Spinner testID={`${testID}-loading`} color="$primary" />;
  } else if (pods.length === 0) {
    body = (
      <YStack testID={`${testID}-empty`} gap={4} paddingVertical={12} alignItems="center">
        <Text fontSize={14} fontWeight="700" color="$color">
          {empty?.title}
        </Text>
        <Text fontSize={12.5} color="$muted" textAlign="center">
          {empty?.text}
        </Text>
      </YStack>
    );
  } else {
    body = (
      <YStack gap={12}>
        {pods.map((pod) => (
          <VenueRequestRow
            key={pod.id}
            id={pod.id}
            title={pod.pod_title}
            typeLabel={podTypeLabel(pod.pod_type)}
            venueName={pod.place_label ?? pod.zone_name ?? '—'}
            requestedOn={formatWhen(pod.created_at)}
            eventDate={formatWhen(pod.pod_date_time)}
            approval={venueApprovalChip(pod.venue_approval_status)}
            rejectedNote={isVenueRejected(pod.venue_approval_status) ? VENUE_REJECTED_NOTE : null}
            onOpen={() => onOpen(pod)}
            onActions={() => onActions(pod)}
          />
        ))}
      </YStack>
    );
  }

  return (
    <YStack gap={12} testID={testID}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name={icon} size={18} color={tint} />
        <YStack flex={1}>
          <Text fontSize={16} fontWeight="700" color="$color">
            {title}
          </Text>
          <Text fontSize={12} color="$muted">
            {subtitle}
          </Text>
        </YStack>
        <Text fontSize={13} fontWeight="700" color={muted}>
          {pods.length}
        </Text>
      </XStack>
      {body}
    </YStack>
  );
}
