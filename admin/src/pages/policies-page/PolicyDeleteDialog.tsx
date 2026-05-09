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
  target: any | null;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PolicyDeleteDialog({ target, error, onClose, onConfirm }: Props) {
  return (
    <Dialog open={!!target} onClose={onClose}>
      <DialogTitle>Delete policy?</DialogTitle>
      <DialogContent>
        <Typography>
          This will permanently delete <b>{target?.title}</b> ({target?.slug}). Pages in
          the app using this slug will no longer render.
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
