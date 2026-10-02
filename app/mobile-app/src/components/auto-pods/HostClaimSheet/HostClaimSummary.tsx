import { Text } from 'tamagui';
import { autoPodCityLabel, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

interface HostClaimSummaryProps {
  row: AutoPodRow | null;
  /** The offer's own city, when it already has one. */
  pinned: AutoPodRow['location'] | null;
  labels: AutoPodLabels;
  formatWhen: (iso: string) => string;
}

/** What is being claimed: the pod's title, its pinned city and its venue slot. */
export function HostClaimSummary({
  row,
  pinned,
  labels,
  formatWhen,
}: Readonly<HostClaimSummaryProps>) {
  const venue = row?.venue_claim;
  return (
    <>
      {row ? (
        <Text fontSize={15} fontWeight="600" color="$color">
          {row.pod_title}
        </Text>
      ) : null}

      {pinned ? (
        <Text testID="auto-pod-assign-city" fontSize={13} color="$color">
          {labels.pinnedTo(autoPodCityLabel(pinned))}
        </Text>
      ) : null}

      {venue ? (
        <Text fontSize={13} color="$color">
          {`${venue.venue_name} · ${formatWhen(venue.pod_date_time)}`}
        </Text>
      ) : null}
    </>
  );
}
