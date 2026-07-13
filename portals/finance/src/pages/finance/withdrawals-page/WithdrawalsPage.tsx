import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { REVIEW_WITHDRAWAL, WITHDRAWALS } from './queries';

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

const account = (w: any) => (w.payout_method === 'UPI' ? w.upi_id : `${w.account_number} · ${w.ifsc_code}`);

export default function WithdrawalsPage() {
  const [status, setStatus] = useState('PENDING');
  const [reject, setReject] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const variables = { status: status === 'ALL' ? null : status };
  const { data, loading, error, refetch } = useQuery(WITHDRAWALS, { variables, fetchPolicy: 'cache-and-network' });
  const [review, { loading: reviewing }] = useMutation(REVIEW_WITHDRAWAL);
  const rows = data?.withdrawalRequests ?? [];

  const submit = async (id: string, nextStatus: 'PAID' | 'REJECTED', why?: string) => {
    await review({ variables: { id, input: { status: nextStatus, reason: why } } });
    setReject(null);
    setReason('');
    setToast(nextStatus === 'PAID' ? 'Marked as paid' : 'Withdrawal rejected');
    await refetch(variables);
  };

  const tableContent = rows.length === 0 ? (
    <Alert severity="info" sx={{ m: 2 }}>No withdrawals for this filter.</Alert>
  ) : (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Host</TableCell>
          <TableCell>Account</TableCell>
          <TableCell>Scheduled</TableCell>
          <TableCell align="right">Amount</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Review</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((w: any) => (
          <TableRow key={w.id} hover>
            <TableCell>
              <Typography fontWeight={700}>{w.beneficiary_name}</Typography>
              <Typography variant="caption" color="text.secondary">{w.beneficiary_email}</Typography>
            </TableCell>
            <TableCell>
              {w.payout_method}
              <Typography variant="caption" display="block" color="text.secondary">{account(w)}</Typography>
            </TableCell>
            <TableCell>{fmtDate(w.scheduled_for)}</TableCell>
            <TableCell align="right">₹{Number(w.amount).toFixed(2)}</TableCell>
            <TableCell>
              <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
              {w.reject_reason ? (
                <Typography variant="caption" display="block" color="text.secondary">{w.reject_reason}</Typography>
              ) : null}
            </TableCell>
            <TableCell align="right">
              {w.status === 'PENDING' ? (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="contained" disabled={reviewing} onClick={() => submit(w.id, 'PAID')}>
                    Mark paid
                  </Button>
                  <Button size="small" color="error" variant="outlined" disabled={reviewing} onClick={() => setReject({ id: w.id, name: w.beneficiary_name })}>
                    Reject
                  </Button>
                </Stack>
              ) : (
                '—'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
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
        <ToggleButtonGroup exclusive size="small" value={status} onChange={(_, v) => v && setStatus(v)}>
          {['PENDING', 'PAID', 'REJECTED', 'ALL'].map((s) => (
            <ToggleButton key={s} value={s}>
              {s}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            tableContent
          )}
        </CardContent>
      </Card>

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

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
