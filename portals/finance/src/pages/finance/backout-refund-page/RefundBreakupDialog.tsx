import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { buildRefundBreakup, type BackoutRefundRequest } from './queries';

interface Props {
  refundFor: BackoutRefundRequest | null;
  sym: string;
  deductionPct: number;
  busy: boolean;
  onClose: () => void;
  /** Receives the dialog's (non-null) row so the caller needs no null guard. */
  onConfirm: (row: BackoutRefundRequest) => void;
}

/** Refund breakup for a Spot Filled Backout request — "Refund now" runs the
 * processBackoutRefund mutation (exactly one refund per request). */
export default function RefundBreakupDialog({
  refundFor,
  sym,
  deductionPct,
  busy,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  return (
    <Dialog open={!!refundFor} onClose={onClose} fullWidth maxWidth="xs">
      {refundFor && (
        <>
          <DialogTitle>Refund breakup</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Typography variant="body2">
                Refund for <b>{refundFor.user_name ?? 'this member'}</b> — Backout{' '}
                <b>{refundFor.backout_no}</b>.
              </Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
                <Stack spacing={0.5} divider={<Divider flexItem />}>
                  {buildRefundBreakup(refundFor, sym, deductionPct).map((line) => (
                    <Stack key={line.key} direction="row" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={line.bold ? 700 : 400}>{line.label}</Typography>
                      <Typography variant="body2" fontWeight={line.bold ? 700 : 400}>{line.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
              <Alert severity="info">
                Processing marks the join payment as refunded and notifies the member. A Backout
                request can be refunded only once.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={busy}>Cancel</Button>
            <Button color="warning" variant="contained" onClick={() => onConfirm(refundFor)} disabled={busy}>
              {busy ? 'Processing…' : 'Refund now'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
