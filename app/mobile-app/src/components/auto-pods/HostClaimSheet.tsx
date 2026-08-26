import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  autoPodCityLabel,
  autoPodHostNeedsLocation,
  type AutoPodLabels,
  type AutoPodRow,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { HostAssignAutoPodDocument } from '@/graphql/auto-pods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  onClose: () => void;
  onAssigned: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /**
   * The city selected in the header ('' when none). An offer nobody has
   * enrolled in yet takes its city from the host, so without one the button
   * stays off and the sheet says why; a pinned offer already has its city and
   * this is only checked against it.
   */
  locationId: string;
  /** Display name of that city, for the "will be set to" line. */
  locationLabel?: string;
}

/**
 * "Assign Myself" — the host takes the pod. Whatever a venue has already fixed
 * (date, price) is shown, and the host sees what they would earn under their
 * own rates once a venue has priced it.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `HostClaimDialog` (rule 27).
 */
export function HostClaimSheet({
  row,
  labels,
  onClose,
  onAssigned,
  formatWhen,
  formatMoney,
  locationId,
  locationLabel,
}: Readonly<Props>) {
  const { success, warning } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const autoPodId = row?.id ?? null;
  const pinned = row?.location ?? null;
  const needsLocation = row ? autoPodHostNeedsLocation(row, locationId) : false;
  const pinsCity = !!row && !pinned && !!locationId;

  // A stale failure from the last offer must not greet the next one.
  useEffect(() => {
    setFailure('');
  }, [autoPodId]);

  const assign = useCallback(async () => {
    if (!autoPodId || needsLocation) return;
    setBusy(true);
    setFailure('');
    try {
      // An unpinned offer takes the host's city; a pinned one already has its own.
      await graphqlRequest(
        HostAssignAutoPodDocument,
        { auto_pod_doc_id: autoPodId, location_id: pinned ? null : locationId },
        { auth: true },
      );
      onAssigned();
    } catch (err: unknown) {
      // Hosts race each other for the same offer, so losing it is an ordinary
      // outcome and reads as one.
      setFailure(toErrorMessage(err, labels.claimedElsewhere));
    } finally {
      setBusy(false);
    }
  }, [autoPodId, needsLocation, pinned, locationId, labels.claimedElsewhere, onAssigned]);

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-assign-cancel"
          label={labels.dismiss}
          onPress={onClose}
          variant="ghost"
          disabled={false}
        />
      </YStack>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-assign-confirm"
          label={labels.assignMyselfCta}
          onPress={() => {
            assign().catch(() => undefined);
          }}
          variant="solid"
          disabled={busy || needsLocation}
        />
      </YStack>
    </XStack>
  );

  const venue = row?.venue_claim;

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="auto-pod-assign-sheet"
      title={labels.confirmAssign}
      subtitle={labels.confirmAssignBody}
      closeLabel={labels.dismiss}
      footer={footer}
    >
      <YStack gap={10}>
        {row ? (
          <Text fontSize={14} fontWeight="700" color="$color">
            {row.pod_title}
          </Text>
        ) : null}

        {pinned ? (
          <Text testID="auto-pod-assign-city" fontSize={12.5} color="$color">
            {labels.pinnedTo(autoPodCityLabel(pinned))}
          </Text>
        ) : null}

        {venue ? (
          <Text fontSize={12.5} color="$color">
            {`${venue.venue_name} · ${formatWhen(venue.pod_date_time)}`}
          </Text>
        ) : null}

        {typeof row?.expected_host_earnings === 'number' ? (
          <Text testID="auto-pod-assign-earnings" fontSize={12.5} fontWeight="700" color={success}>
            {labels.expectedEarnings(formatMoney(row.expected_host_earnings))}
          </Text>
        ) : null}

        {needsLocation ? (
          <Text testID="auto-pod-assign-needs-location" fontSize={12} color={warning}>
            {labels.pickLocationFirst}
          </Text>
        ) : null}

        {pinsCity ? (
          <Text testID="auto-pod-assign-will-pin" fontSize={12} color="$muted">
            {labels.willPinTo(locationLabel || locationId)}
          </Text>
        ) : null}

        {failure ? (
          <Text testID="auto-pod-assign-error" fontSize={12} color="$danger">
            {failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
