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
  onClose: () => void;
  onConfirm: () => void;
}

export default function InterviewDeleteDialog({ open, onClose, onConfirm }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete this request?</DialogTitle>
      <DialogContent>
        <Typography variant="body2">This action cannot be undone.</Typography>
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
