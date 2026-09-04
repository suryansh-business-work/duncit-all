import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  autoPodCityLabel,
  autoPodHostMeetingReady,
  autoPodHostNeedsLocation,
  type AutoPodHostMeeting,
  type AutoPodLabels,
  type AutoPodRow,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { HostEarningsFields } from '@/components/auto-pods/HostEarningsFields';
import {
  BLANK_HOST_MEETING,
  HostMeetingFields,
  hostMeetingInput,
} from '@/components/auto-pods/HostMeetingFields';
import { HostAssignAutoPodDocument } from '@/graphql/auto-pods';
import type { AutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';
import { useAutoPodPricing } from '@/hooks/useAutoPodPricing';
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

/**
 * Everything that has to hold before "Assign Myself" may go: an offer, a city
 * when the offer takes one from the host, numbers the server priced as viable
 * and in range, and — on a virtual offer — a complete meeting. Hoisted out of
 * the component so the sheet reads as one gate rather than six clauses.
 */
function claimReady({
  autoPodId,
  needsLocation,
  projection,
  inRange,
  meetingReady,
}: Readonly<{
  autoPodId: string | null;
  needsLocation: boolean;
  projection: AutoPodHostProjection | null;
  inRange: boolean;
  meetingReady: boolean;
}>): boolean {
  if (!autoPodId || needsLocation || !meetingReady) return false;
  return !!projection && projection.viable && inRange;
}

/**
 * "Assign Myself" — the host takes the pod, priced through the same potential-
 * earnings calculator Step 4 of Create a Pod uses: a ticket price and a spots
 * slider bounded by the activity's minimum and the venue's capacity, with the
 * server re-pricing the pod on every change under the host's own rates, the
 * venue's slot price and the club admin's cut. What the sheet shows as "you
 * earn" is exactly what the save is judged on.
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
  const [meeting, setMeeting] = useState<AutoPodHostMeeting>(BLANK_HOST_MEETING);
  // The calculator owns the price and the spots, and re-seeds itself per offer.
  const pricing = useAutoPodPricing(row);
  const { amount, spots, projection, inRange } = pricing;
  const autoPodId = row?.id ?? null;
  const pinned = row?.location ?? null;
  const needsLocation = row ? autoPodHostNeedsLocation(row, locationId) : false;
  const pinsCity = !!row && !pinned && !!locationId;
  const virtual = row?.pod_mode === 'VIRTUAL';

  // A fresh offer brings its own meeting details, and a stale failure must not
  // greet the next one.
  useEffect(() => {
    setMeeting(BLANK_HOST_MEETING);
    setFailure('');
  }, [autoPodId]);

  // A virtual offer has no venue to fix its window, so the host's own meeting
  // details have to hold before the claim may go — the server re-checks them.
  const now = new Date();
  const meetingReady = !virtual || autoPodHostMeetingReady(meeting, now.getTime());
  const canAssign = claimReady({ autoPodId, needsLocation, projection, inRange, meetingReady });

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
          // Only a virtual offer carries a meeting; a physical one sends none.
          ...(virtual ? { meeting: hostMeetingInput(meeting) } : {}),
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
    virtual,
    meeting,
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

        {virtual ? (
          <HostMeetingFields value={meeting} onChange={setMeeting} labels={labels} now={now} />
        ) : null}

        <HostEarningsFields
          price={pricing.price}
          onPrice={pricing.setPrice}
          spots={spots}
          onSpots={pricing.setSpots}
          projection={projection}
          loading={pricing.loading}
          failed={pricing.failed}
          labels={labels}
          formatMoney={formatMoney}
        />

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

        {busy ? <LoadingIndicator testID="auto-pod-assign-busy" /> : null}

        {failure ? (
          <Text testID="auto-pod-assign-error" fontSize={12} color="$danger">
            {failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
