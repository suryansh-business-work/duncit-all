import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import PolicyRenderer from '../../components/PolicyRenderer';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (seats: number) => void;
  busy?: boolean;
  /** Estimated refund after the Backouts deduction (null for free bookings). */
  refundAmount?: number | null;
  /** Refund for ONE seat after the deduction — prices a partial release. */
  refundPerSeat?: number | null;
  /** Seats this booking holds. More than one offers a partial release. */
  mySeats?: number;
  /** Currency symbol for the refund line (from public finance settings). */
  currency?: string;
  /** Backouts deduction % applied to the refund estimate. */
  deductionPct?: number;
}

const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Confirmation dialog shown before a user backs out of a pod. Confirming moves
 * the booking to "Backout in process": the seat is released and the refund is
 * paid only once someone fills the spot. Renders the admin-managed
 * "backout-terms" policy inline so users see the live terms before confirming.
 */
export default function BackoutConfirmDialog({
  open,
  onClose,
  onConfirm,
  busy,
  refundAmount = null,
  refundPerSeat = null,
  mySeats = 1,
  currency = '₹',
  deductionPct = 0,
}: Readonly<Props>) {
  const held = Math.max(1, Math.floor(mySeats) || 1);
  // Default to releasing everything — that is what Backout meant before a
  // booking could cover several people, and it stays the common case.
  const [seats, setSeats] = useState(held);
  useEffect(() => {
    if (open) setSeats(held);
  }, [open, held]);

  // Per-seat is already net of the deduction, so the estimate scales with the
  // chosen count. Releasing everything uses the server's own total, which is
  // the figure of record.
  const releasing = Math.min(seats, held);
  const partial = releasing < held;
  const estimate = partial && refundPerSeat != null ? money(refundPerSeat * releasing) : refundAmount;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Backout from Pod?</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
          You will get the refund only if someone fills your spot.
        </Typography>
        {held > 1 && (
          <TextField
            select
            fullWidth
            size="small"
            label="Seats to release"
            value={releasing}
            onChange={(event) => setSeats(Number(event.target.value))}
            disabled={busy}
            helperText={
              partial
                ? `You keep ${held - releasing} seat${held - releasing === 1 ? '' : 's'} and stay in this pod.`
                : 'Releasing your whole booking — you leave the pod.'
            }
            sx={{ mb: 2 }}
          >
            {Array.from({ length: held }, (_, index) => index + 1).map((count) => (
              <MenuItem key={count} value={count}>
                {count} of {held}
              </MenuItem>
            ))}
          </TextField>
        )}
        {estimate != null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            If the refund is done, you will get{' '}
            <b>
              {currency}
              {estimate}
            </b>{' '}
            for {releasing} seat{releasing === 1 ? '' : 's'} (after the {deductionPct}% backout
            deduction).
          </Alert>
        )}
        <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 1 }}>
          <PolicyRenderer slug="backout-terms" hideTitle hideUpdated />
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Read the full{' '}
          <Link
            component={RouterLink}
            to="/policies/backout-terms"
            onClick={onClose}
            underline="hover"
          >
            Backout Terms &amp; Conditions
          </Link>
          .
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => onConfirm(releasing)}
          disabled={busy}
        >
          {busy ? 'Backing out…' : 'Confirm Backout'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
