import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirms a free rejoin of a backed-out pod. RN twin: mobile RejoinConfirmDialog. */
export default function RejoinConfirmDialog({ open, busy, onClose, onConfirm }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Rejoin this pod?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You&apos;ll rejoin this pod for free — no payment is required. Your spot is restored and stays active until
          the pod completes.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={busy} variant="contained" color="success" startIcon={<ReplayIcon />}>
          {busy ? 'Rejoining...' : 'Rejoin for free'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
