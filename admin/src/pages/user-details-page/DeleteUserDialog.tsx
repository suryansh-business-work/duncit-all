import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteUserDialog({ open, busy, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete this user?</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          This action permanently removes the account. It cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          Delete User
        </Button>
      </DialogActions>
    </Dialog>
  );
}
