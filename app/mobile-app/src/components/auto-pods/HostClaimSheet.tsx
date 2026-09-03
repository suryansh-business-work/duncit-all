import { useCallback, useEffect, useState } from 'react';
import { Input, Text, XStack, YStack } from 'tamagui';
import {
  autoPodCityLabel,
  autoPodHostNeedsLocation,
  type AutoPodLabels,
  type AutoPodRow,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { HostProjectionLines } from '@/components/auto-pods/HostProjectionLines';
import { HostAssignAutoPodDocument } from '@/graphql/auto-pods';
import { useAutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';
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
   * The city selected in the header ('' when none). A virtual offer nobody
   * has enrolled in yet takes its city from the host, so without one the
   * button stays off and the sheet says why; a pinned offer already has its
   * city and this is only checked against it.
   */
  locationId: string;
  /** Display name of that city, for the "will be set to" line. */
  locationLabel?: string;
}

const inputStyle = {
  size: '$4',
  backgroundColor: '$surface',
  color: '$color',
  placeholderTextColor: '$muted',
  borderColor: '$borderColor',
} as const;

/**
 * "Assign Myself" — the host takes the pod, and sets its ticket price and
 * number of spots (within the activity's minimum and the venue's capacity).
 * Every change re-prices the pod on the server under the host's own rates,
 * the venue's slot price and the club admin's cut, so what the sheet shows as
 * "you earn" is exactly what the save is judged on.
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
  const { warning } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [amount, setAmount] = useState(0);
  const [spots, setSpots] = useState(0);
  const autoPodId = row?.id ?? null;
  const pinned = row?.location ?? null;
  const needsLocation = row ? autoPodHostNeedsLocation(row, locationId) : false;
  const pinsCity = !!row && !pinned && !!locationId;

  // The template's numbers are the starting point; a fresh offer resets them,
  // and a stale failure from the last offer must not greet the next one.
  useEffect(() => {
    setAmount(row?.pod_amount ?? 0);
    setSpots(row?.no_of_spots ?? 0);
    setFailure('');
  }, [autoPodId, row?.pod_amount, row?.no_of_spots]);

  const { projection, failed } = useAutoPodHostProjection(autoPodId, amount, spots);
  const inRange = !!projection && spots >= projection.min_spots && spots <= projection.max_spots;
  const canAssign = !!autoPodId && !needsLocation && !!projection && projection.viable && inRange;

  const assign = useCallback(async () => {
    if (!autoPodId || !canAssign) return;
    setBusy(true);
    setFailure('');
    try {
      // An unpinned offer takes the host's city; a pinned one already has its own.
      await graphqlRequest(
        HostAssignAutoPodDocument,
        {
          auto_pod_doc_id: autoPodId,
          location_id: pinned ? null : locationId,
          pod_amount: amount,
          no_of_spots: spots,
        },
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
  }, [
    autoPodId,
    canAssign,
    pinned,
    locationId,
    amount,
    spots,
    labels.claimedElsewhere,
    onAssigned,
  ]);

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
          disabled={busy || !canAssign}
        />
      </YStack>
    </XStack>
  );

  const venue = row?.venue_claim;
  const spotsHint = projection ? labels.spotsRange(projection.min_spots, projection.max_spots) : '';

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

        <Input
          testID="auto-pod-assign-price"
          {...inputStyle}
          keyboardType="numeric"
          value={String(amount)}
          onChangeText={(text) => setAmount(Number(text) || 0)}
          placeholder={labels.ticketPrice}
          aria-label={labels.ticketPrice}
        />
        <Input
          testID="auto-pod-assign-spots"
          {...inputStyle}
          keyboardType="numeric"
          value={String(spots)}
          onChangeText={(text) => setSpots(Number(text) || 0)}
          placeholder={labels.spotsField}
          aria-label={labels.spotsField}
        />
        {spotsHint ? (
          <Text
            testID="auto-pod-assign-spots-hint"
            fontSize={12}
            color={inRange ? '$muted' : '$danger'}
          >
            {spotsHint}
          </Text>
        ) : null}

        <HostProjectionLines projection={projection} labels={labels} formatMoney={formatMoney} />
        {failed ? (
          <Text testID="auto-pod-assign-projection-failed" fontSize={12} color="$danger">
            {labels.loadFailed}
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
