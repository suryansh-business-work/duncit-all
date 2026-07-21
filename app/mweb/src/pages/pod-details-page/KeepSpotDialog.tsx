import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  /** Backout attempts the user still has for this pod (max − used). */
  attemptsLeft: number;
  /** Server error (e.g. replacement already confirmed) shown inside the dialog. */
  error?: string | null;
}

/**
 * "Change of plans?" — cancel an in-process backout and restore the booking.
 * Only possible while the released seat has not been rebooked; a confirmed
 * replacement surfaces as an inline error from the server.
 */
export default function KeepSpotDialog({
  open,
  onClose,
  onConfirm,
  busy,
  attemptsLeft,
  error = null,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Change of plans?</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2">
          Do you want us to stop searching for a replacement and keep this spot for you? (NOTE: If
          you wish you Backout from the Pod again, you can only do it for up to {attemptsLeft} more
          times)
        </Typography>
        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy}>
          {busy ? 'Restoring…' : 'Keep My Spot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
