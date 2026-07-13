import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface Props {
  pod: any;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeletePodDialog({ pod, busy, onClose, onConfirm }: Readonly<Props>) {
  return (
    <Dialog open={!!pod} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete pod?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will remove <strong>{pod?.pod_title}</strong> from the club. Members lose access to it. This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
