import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';

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
}

/**
 * "Assign Myself" — the host takes the pod. The venue, date and price are
 * already fixed by the venue's enrolment, so this confirms rather than collects,
 * and shows what the host would earn under their own rates before they commit.
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
}: Readonly<Props>) {
  const { success } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const autoPodId = row?.id ?? null;

  // A stale failure from the last offer must not greet the next one.
  useEffect(() => {
    setFailure('');
  }, [autoPodId]);

  const assign = useCallback(async () => {
    if (!autoPodId) return;
    setBusy(true);
    setFailure('');
    try {
      await graphqlRequest(
        HostAssignAutoPodDocument,
        { auto_pod_doc_id: autoPodId },
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
  }, [autoPodId, labels.claimedElsewhere, onAssigned]);

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
          disabled={busy}
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

        {failure ? (
          <Text testID="auto-pod-assign-error" fontSize={12} color="$danger">
            {failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
