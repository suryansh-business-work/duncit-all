import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

export interface Editing {
  id?: string;
  key: string;
  name: string;
  description: string;
}

export const blankEditing: Editing = { key: '', name: '', description: '' };

interface Props {
  open: boolean;
  title: string;
  editing: Editing;
  setEditing: (next: Editing | ((prev: Editing) => Editing)) => void;
  busy: boolean;
  opError: string | null;
  keyHelperText: string;
  onClose: () => void;
  onSave: () => void;
}

export default function KeyEntityEditDialog({
  open,
  title,
  editing,
  setEditing,
  busy,
  opError,
  keyHelperText,
  onClose,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing.id ? `Edit ${title}` : `New ${title}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Key"
            value={editing.key}
            onChange={(e) => setEditing((p) => ({ ...p, key: e.target.value }))}
            disabled={!!editing.id}
            helperText={keyHelperText}
            fullWidth
          />
          <TextField
            label="Name"
            value={editing.name}
            onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Description"
            value={editing.description}
            onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />
          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={busy || !editing.key || !editing.name}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
