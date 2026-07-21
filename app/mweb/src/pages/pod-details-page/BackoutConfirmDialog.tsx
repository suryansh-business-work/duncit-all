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
  Typography,
} from '@mui/material';
import PolicyRenderer from '../../components/PolicyRenderer';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  /** Estimated refund after the Backouts deduction (null for free bookings). */
  refundAmount?: number | null;
  /** Currency symbol for the refund line (from public finance settings). */
  currency?: string;
  /** Backouts deduction % applied to the refund estimate. */
  deductionPct?: number;
}

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
  currency = '₹',
  deductionPct = 0,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Backout from Pod?</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
          You will get the refund only if someone fills your spot.
        </Typography>
        {refundAmount != null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            If the refund is done, you will get{' '}
            <b>
              {currency}
              {refundAmount}
            </b>{' '}
            (after the {deductionPct}% backout deduction).
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
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Backing out…' : 'Confirm Backout'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
