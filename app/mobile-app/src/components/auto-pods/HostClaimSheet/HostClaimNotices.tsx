import { Text } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';

interface HostClaimNoticesProps {
  labels: AutoPodLabels;
  warning: string;
  needsLocation: boolean;
  pinsCity: boolean;
  locationId: string;
  locationLabel?: string;
  busy: boolean;
  failure: string;
}

/** The lines under the calculator: a missing city, the city the claim will
 * pin, the in-flight spinner and a failed claim. */
export function HostClaimNotices({
  labels,
  warning,
  needsLocation,
  pinsCity,
  locationId,
  locationLabel,
  busy,
  failure,
}: Readonly<HostClaimNoticesProps>) {
  return (
    <>
      {needsLocation ? (
        <Text testID="auto-pod-assign-needs-location" fontSize={13} color={warning}>
          {labels.pickLocationFirst}
        </Text>
      ) : null}

      {pinsCity ? (
        <Text testID="auto-pod-assign-will-pin" fontSize={13} color="$muted">
          {labels.willPinTo(locationLabel || locationId)}
        </Text>
      ) : null}

      {busy ? <LoadingIndicator testID="auto-pod-assign-busy" /> : null}

      {failure ? (
        <Text role="alert" testID="auto-pod-assign-error" fontSize={13} color="$danger">
          {failure}
        </Text>
      ) : null}
    </>
  );
}
