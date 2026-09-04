import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import type { AutoPodLabels, AutoPodRole, AutoPodRow } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import {
  ClubWithdrawAutoPodDocument,
  HostWithdrawAutoPodDocument,
  VenueWithdrawAutoPodDocument,
} from '@/graphql/auto-pods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  row: AutoPodRow | null;
  /** Whose enrolment is being taken back: the slot, the hosting or the claim. */
  role: AutoPodRole;
  labels: AutoPodLabels;
  onClose: () => void;
  onWithdrawn: () => void;
}

/**
 * Taking an enrolment back: a venue's slot, a host's assignment or a club
 * admin's claim. The offer depends on more partners than the one leaving, so
 * the sheet says so in the product's own words and states the Account Health
 * cost (Pod Settings) before the button. Once confirmed the offer goes back on
 * the list for that role, under "Needs your action" again, and everyone else
 * on it is told.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodWithdrawDialog` (rule 27).
 */
export function AutoPodWithdrawSheet({ row, role, labels, onClose, onWithdrawn }: Readonly<Props>) {
  const { warning } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const autoPodId = row?.id ?? null;
  const points = row?.withdraw_penalty_points ?? 0;

  // A stale failure from the last offer must not greet the next one.
  useEffect(() => {
    setFailure('');
  }, [autoPodId]);

  const withdraw = useCallback(async () => {
    if (!autoPodId) return;
    setBusy(true);
    setFailure('');
    try {
      const variables = { auto_pod_doc_id: autoPodId };
      // One mutation per role: the server authorises each against its own claim.
      if (role === 'venue') {
        await graphqlRequest(VenueWithdrawAutoPodDocument, variables, { auth: true });
      } else if (role === 'host') {
        await graphqlRequest(HostWithdrawAutoPodDocument, variables, { auth: true });
      } else {
        await graphqlRequest(ClubWithdrawAutoPodDocument, variables, { auth: true });
      }
      onWithdrawn();
    } catch (err: unknown) {
      setFailure(toErrorMessage(err, labels.loadFailed));
    } finally {
      setBusy(false);
    }
  }, [autoPodId, role, labels.loadFailed, onWithdrawn]);

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-withdraw-dismiss"
          label={labels.dismiss}
          onPress={onClose}
          variant="ghost"
          disabled={false}
        />
      </YStack>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-withdraw-confirm"
          label={labels.withdrawConfirm}
          onPress={() => {
            withdraw().catch(() => undefined);
          }}
          variant="solid"
          disabled={busy || !autoPodId}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="auto-pod-withdraw-sheet"
      title={labels.withdrawTitle}
      closeLabel={labels.dismiss}
      footer={footer}
    >
      <YStack gap={10}>
        {row ? (
          <Text fontSize={14} fontWeight="700" color="$color">
            {row.pod_title}
          </Text>
        ) : null}

        <Text testID="auto-pod-withdraw-warning" fontSize={12.5} color={warning}>
          {labels.withdrawWarning}
        </Text>

        {points > 0 ? (
          <Text testID="auto-pod-withdraw-penalty" fontSize={12.5} fontWeight="700" color="$danger">
            {labels.withdrawPenalty(points)}
          </Text>
        ) : null}

        {busy ? <LoadingIndicator testID="auto-pod-withdraw-busy" /> : null}

        {failure ? (
          <Text testID="auto-pod-withdraw-error" fontSize={12} color="$danger">
            {failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
