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
  /** Refund threshold (%) sourced from membership state — purely informational. */
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
  refundThresholdPct,
}: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Backout from this pod?</DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please review the terms before continuing. For paid pods, refunds are
          held until the pod reaches{' '}
          <b>{refundThresholdPct ?? 80}%</b> capacity or someone fills your spot
          via your referral link.
        </Alert>

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
