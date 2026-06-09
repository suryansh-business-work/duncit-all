import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { type FlagEdit } from './queries';

interface Props {
  open: boolean;
  editing: FlagEdit;
  setEditing: (next: FlagEdit | ((prev: FlagEdit) => FlagEdit)) => void;
  busy: boolean;
  opError: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function FlagEditDialog({
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
      <DialogTitle>{editing.id ? 'Edit Flag' : 'New Feature Flag'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Key"
            value={editing.key}
            onChange={(e) => setEditing((p) => ({ ...p, key: e.target.value }))}
            disabled={!!editing.id}
            helperText="Lowercase, e.g. venue_booking"
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
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch
              checked={editing.enabled}
              onChange={(_, v) => setEditing((p) => ({ ...p, enabled: v }))}
            />
            <Typography variant="body2">{editing.enabled ? 'Enabled' : 'Disabled'}</Typography>
          </Stack>
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
