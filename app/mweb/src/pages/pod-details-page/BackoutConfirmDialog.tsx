import { Link as RouterLink } from 'react-router-dom';
import {
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
  /** Reserved for future use — refund threshold is now sourced from the live policy. */
  refundThresholdPct?: number | null;
}

/**
 * Confirmation dialog shown before a user backs out of a pod.
 * Renders the admin-managed "backout-terms" policy inline so users
 * see the live, editable terms before confirming.
 */
export default function BackoutConfirmDialog({
  open,
  onClose,
  onConfirm,
  busy,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Backout from this pod?</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
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
          Cancel
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
