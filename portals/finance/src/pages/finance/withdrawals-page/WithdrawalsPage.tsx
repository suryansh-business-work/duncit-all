import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { formatMoney } from '@duncit/utils';
import { REVIEW_WITHDRAWAL, WITHDRAWALS_TABLE, type WithdrawalRow } from './queries';
import { payoutTarget } from './account-details';
import RejectWithdrawalDialog from './RejectWithdrawalDialog';
import RoleFilter from './RoleFilter';
import { ALL_ROLES, roleLabel, type RoleFilterValue } from './roles';
import WithdrawalsTable from './WithdrawalsTable';

type RejectTarget = { id: string; name: string };

export default function WithdrawalsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [role, setRole] = useState<RoleFilterValue>(ALL_ROLES);
  const [reject, setReject] = useState<RejectTarget | null>(null);
  const [payTarget, setPayTarget] = useState<WithdrawalRow | null>(null);
  const [review, { loading: reviewing }] = useMutation(REVIEW_WITHDRAWAL);

  const fetchRows = useApolloTableFetch<WithdrawalRow>(client, WITHDRAWALS_TABLE, 'withdrawalRequestsTable');

  // Pinned page filter: the table appends it to its own column filters and
  // resets to page 1 whenever the role changes.
  const externalFilters = useMemo<TableFilterValue[]>(
    () => (role === ALL_ROLES ? [] : [{ field: 'withdrawer_role', op: 'eq', value: role }]),
    [role],
  );

  // Never rejects — errors surface via the toast, so callers can fire-and-forget.
  const submit = useCallback(
    async (id: string, nextStatus: 'PAID' | 'REJECTED', why?: string) => {
      try {
        await review({ variables: { id, input: { status: nextStatus, reason: why } } });
        setReject(null);
        setPayTarget(null);
        notifySuccess(nextStatus === 'PAID' ? 'Marked as paid' : 'Withdrawal rejected');
        refetchRef.current?.();
      } catch (e: any) {
        // Apollo rejects with an Error carrying a message; the nullish fallback is defensive.
        const message = e.message ?? /* istanbul ignore next */ 'Could not review withdrawal';
        notifyError(message);
      }
    },
    [review],
  );

  const openMarkPaid = useCallback((w: WithdrawalRow) => setPayTarget(w), []);
  const openReject = useCallback(
    (w: WithdrawalRow) => setReject({ id: w.id, name: w.beneficiary_name }),
    [],
  );
  const confirmMarkPaid = useCallback(() => {
    if (payTarget) submit(payTarget.id, 'PAID');
  }, [payTarget, submit]);

  // The FULL payout details belong here, not in the list.
  //
  // "Mark Paid" presupposes the operator has already made the transfer, which
  // needs the whole account number — masking it everywhere left them with no
  // way to read what they were paying. The list stays masked (a shared screen
  // showing a column of account numbers is the thing worth avoiding); the one
  // dialog opened deliberately, for one row, shows it in full.
  // Elements, not a joined string: ConfirmDialog takes a ReactNode and renders it
  // as HTML, where a "\n" collapses to a space.
  const payMessage = payTarget ? (
    <Stack spacing={1}>
      <Typography variant="body2">
        {`Release ${formatMoney(payTarget.amount, { decimals: 2 })} to ${payTarget.beneficiary_name} (${roleLabel(payTarget.withdrawer_role)}).`}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
        {`Pay to: ${payoutTarget(payTarget)}`}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        The amount was already held when the request was raised.
      </Typography>
    </Stack>
  ) : null;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <PaymentsIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Withdrawal Payments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review wallet withdrawals from hosts, venue owners, e-commerce brands and club admins.
            Disbursed on the configured payout cycle.
          </Typography>
        </Box>
      </Stack>

      <WithdrawalsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        reviewing={reviewing}
        externalFilters={externalFilters}
        toolbarActions={<RoleFilter value={role} onChange={setRole} />}
        onMarkPaid={openMarkPaid}
        onReject={openReject}
      />

      <ConfirmDialog
        open={!!payTarget}
        title="Mark withdrawal as paid"
        message={payMessage}
        confirmLabel="Mark Paid"
        busy={reviewing}
        onClose={() => setPayTarget(null)}
        onConfirm={confirmMarkPaid}
      />

      <RejectWithdrawalDialog
        target={reject}
        busy={reviewing}
        onClose={() => setReject(null)}
        onSubmit={(id, reason) => submit(id, 'REJECTED', reason)}
      />
    </Box>
  );
}
