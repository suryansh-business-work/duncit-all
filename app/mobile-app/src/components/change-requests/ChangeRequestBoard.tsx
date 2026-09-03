import { useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { ChangeRequestCard } from '@/components/change-requests/ChangeRequestCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { usePodChangeRequests } from '@/hooks/usePodChangeRequests';

/** A titled list with its own empty line. Hoisted (never a nested component). */
function BoardList({
  title,
  emptyText,
  rows,
  testID,
  busy,
  when,
  filedOn,
  onApprove,
  onPass,
  onWithdraw,
}: Readonly<{
  title: string;
  emptyText: string;
  rows: readonly PodChangeRow[];
  testID: string;
  busy: boolean;
  when: (iso: string) => string;
  filedOn: (iso: string) => string;
  onApprove?: (row: PodChangeRow) => void;
  onPass?: (row: PodChangeRow) => void;
  onWithdraw?: (row: PodChangeRow) => void;
}>) {
  return (
    <YStack testID={testID} gap={10}>
      <Text fontSize={14} fontWeight="700" color="$color">
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text fontSize={12.5} color="$muted">
          {emptyText}
        </Text>
      ) : (
        rows.map((row) => (
          <ChangeRequestCard
            key={row.id}
            row={row}
            testID={`${testID}-${row.id}`}
            when={when(row.pod.pod_date_time)}
            filedOn={filedOn(row.created_at)}
            busy={busy}
            onApprove={onApprove ? () => onApprove(row) : undefined}
            onPass={onPass ? () => onPass(row) : undefined}
            onWithdraw={onWithdraw ? () => onWithdraw(row) : undefined}
          />
        ))
      )}
    </YStack>
  );
}

interface Props {
  /** Narrow to one studio's role. Omitted, every role is listed — which is what
   * the standalone Change Requests screen wants. */
  role?: PodChangeRole;
  testID?: string;
}

/**
 * The Change Requests section — the Tamagui twin of `ChangeRequestBoard` in
 * `@duncit/pod-change-requests` (rule 27).
 *
 * Two lists over ONE query, same as mWeb: what Duncit is asking of you above
 * what you asked of Duncit. Passing is confirmed, approving is not — approving
 * is what the person came here to do, and it takes something ON rather than
 * giving it up.
 */
export function ChangeRequestBoard({ role, testID = 'change-requests' }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const state = usePodChangeRequests();
  const [passing, setPassing] = useState<PodChangeRow | null>(null);
  const [withdrawing, setWithdrawing] = useState<PodChangeRow | null>(null);

  const byRole = (rows: readonly PodChangeRow[]) =>
    role ? rows.filter((row) => row.role === role) : [...rows];

  if (state.failed) {
    return (
      <LoadErrorNotice
        testID={`${testID}-error`}
        onRetry={() => {
          state.reload().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <YStack testID={testID} gap={16}>
      {state.feedback ? (
        <Text
          testID={`${testID}-feedback`}
          fontSize={12.5}
          color={state.feedback.ok ? '$success' : '$danger'}
        >
          {state.feedback.text}
        </Text>
      ) : null}

      <BoardList
        testID={`${testID}-incoming`}
        title={t('changeRequest.incomingTitle')}
        emptyText={t('changeRequest.incomingEmpty')}
        rows={byRole(state.board.incoming)}
        busy={state.busy || state.isLoading}
        when={formatDateTime}
        filedOn={formatDateTime}
        onApprove={(row) => {
          state.respond(row.id, 'APPROVE', '', t('changeRequest.approved')).catch(() => undefined);
        }}
        onPass={setPassing}
      />

      <BoardList
        testID={`${testID}-mine`}
        title={t('changeRequest.mineTitle')}
        emptyText={t('changeRequest.mineEmpty')}
        rows={byRole(state.board.mine)}
        busy={state.busy || state.isLoading}
        when={formatDateTime}
        filedOn={formatDateTime}
        onWithdraw={setWithdrawing}
      />

      <ConfirmDialog
        open={!!passing}
        testID={`${testID}-pass-confirm`}
        title={t('changeRequest.passTitle')}
        message={t('changeRequest.passBody')}
        confirmLabel={t('changeRequest.pass')}
        cancelLabel={t('changeRequest.cancelCta')}
        onCancel={() => setPassing(null)}
        onConfirm={() => {
          const row = passing;
          setPassing(null);
          if (row) {
            state.respond(row.id, 'PASS', '', t('changeRequest.passed')).catch(() => undefined);
          }
        }}
      />

      <ConfirmDialog
        open={!!withdrawing}
        testID={`${testID}-withdraw-confirm`}
        title={t('changeRequest.withdrawTitle')}
        message={t('changeRequest.withdrawBody')}
        confirmLabel={t('changeRequest.withdraw')}
        cancelLabel={t('changeRequest.cancelCta')}
        destructive
        onCancel={() => setWithdrawing(null)}
        onConfirm={() => {
          const row = withdrawing;
          setWithdrawing(null);
          if (row) {
            state.withdraw(row.id, t('changeRequest.withdrawn')).catch(() => undefined);
          }
        }}
      />

      {state.isLoading ? (
        <Spinner testID={`${testID}-loading`} size="small" color="$primary" />
      ) : null}
    </YStack>
  );
}
