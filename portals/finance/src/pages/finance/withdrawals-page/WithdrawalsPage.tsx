import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { REVIEW_WITHDRAWAL, WITHDRAWALS_TABLE, type WithdrawalRow } from './queries';
import WithdrawalsTable from './WithdrawalsTable';

export default function WithdrawalsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [reject, setReject] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [review, { loading: reviewing }] = useMutation(REVIEW_WITHDRAWAL);

  const fetchRows = useApolloTableFetch<WithdrawalRow>(client, WITHDRAWALS_TABLE, 'withdrawalRequestsTable');

  // Never rejects — errors surface via the toast, so callers can fire-and-forget.
  const submit = useCallback(
    async (id: string, nextStatus: 'PAID' | 'REJECTED', why?: string) => {
      try {
        await review({ variables: { id, input: { status: nextStatus, reason: why } } });
        setReject(null);
        setReason('');
        notifySuccess(nextStatus === 'PAID' ? 'Marked as paid' : 'Withdrawal rejected');
        refetchRef.current?.();
      } catch (e: any) {
        notifyError(e.message ?? 'Could not review withdrawal');
      }
    },
    [review],
  );

  const markPaid = useCallback(
    (w: WithdrawalRow) => {
      submit(w.id, 'PAID');
    },
    [submit],
  );
  const openReject = useCallback(
    (w: WithdrawalRow) => setReject({ id: w.id, name: w.beneficiary_name }),
    [],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <PaymentsIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Withdrawals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review host wallet withdrawals. Disbursed on the configured payout cycle.
          </Typography>
        </Box>
      </Stack>

      <WithdrawalsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        reviewing={reviewing}
        onMarkPaid={markPaid}
        onReject={openReject}
      />

      <Dialog open={!!reject} onClose={() => setReject(null)} fullWidth maxWidth="xs">
        <DialogTitle>Reject withdrawal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Rejecting refunds {reject?.name}'s wallet. Add a reason.
          </Typography>
          <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} fullWidth autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReject(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!reason.trim() || reviewing} onClick={() => reject && submit(reject.id, 'REJECTED', reason)}>
            Reject &amp; refund
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
