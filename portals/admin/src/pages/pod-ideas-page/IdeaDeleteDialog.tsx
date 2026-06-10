import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface Props {
  target: any | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function IdeaDeleteDialog({ target, onClose, onConfirm }: Readonly<Props>) {
  return (
    <Dialog open={!!target} onClose={onClose}>
      <DialogTitle>Delete idea?</DialogTitle>
      <DialogContent>
        <Typography>
          This will permanently delete <b>{target?.title}</b> along with all its comments.
        </Typography>
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
