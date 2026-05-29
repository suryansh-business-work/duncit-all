import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { fmt } from './helpers';

interface Props {
  refundFor: any | null;
  refundReason: string;
  setRefundReason: (s: string) => void;
  refundLoading: boolean;
  actionError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RefundDialog({
  refundFor,
  refundReason,
  setRefundReason,
  refundLoading,
  actionError,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog open={!!refundFor} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Refund payment</DialogTitle>
      <DialogContent dividers>
        {refundFor && (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Refund <b>{fmt(refundFor.total, refundFor.currency_symbol)}</b> to{' '}
              {refundFor.user_name}?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Payment ID: {refundFor.payment_id}
            </Typography>
            <TextField
              label="Reason (optional)"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            {actionError && <Alert severity="error">{actionError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="warning"
          variant="contained"
          disabled={refundLoading}
          onClick={onConfirm}
        >
          {refundLoading ? 'Refunding…' : 'Confirm refund'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
