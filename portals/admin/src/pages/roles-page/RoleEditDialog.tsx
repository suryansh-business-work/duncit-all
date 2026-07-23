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
import type { RoleEdit } from './types';

interface Props {
  open: boolean;
  editing: RoleEdit;
  setEditing: React.Dispatch<React.SetStateAction<RoleEdit>>;
  busy: boolean;
  opError: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function RoleEditDialog({
  open,
  editing,
  setEditing,
  busy,
  opError,
  onClose,
  onSave,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing.id ? 'Edit Role' : 'New Role'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Key"
            value={editing.key}
            onChange={(e) => setEditing((p) => ({ ...p, key: e.target.value }))}
            disabled={!!editing.id}
            helperText="Uppercase, e.g. CITY_ADMIN"
            fullWidth
            required
          />
          <TextField
            label="Name"
            value={editing.name}
            onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
            fullWidth
            required
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
