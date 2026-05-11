import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

interface IdeaComposerDialogProps {
  open: boolean;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  error: string | null;
  creating: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function IdeaComposerDialog({
  open,
  title,
  setTitle,
  description,
  setDescription,
  error,
  creating,
  onClose,
  onSubmit,
}: IdeaComposerDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !creating && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Share a pod idea</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 160))}
            required
            fullWidth
            helperText={`${title.length} / 160`}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2001))}
            required
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            helperText={`${description.length} / 2001 — describe the vibe, format, location, audience…`}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={creating}>
          {creating ? <CircularProgress size={20} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
