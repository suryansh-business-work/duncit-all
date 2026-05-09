import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';

interface Props {
  open: boolean;
  resources: any[];
  actions: any[];
  resourceKey: string;
  actionKey: string;
  description: string;
  busy: boolean;
  opError: string | null;
  setResourceKey: (v: string) => void;
  setActionKey: (v: string) => void;
  setDescription: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function NewPermissionDialog({
  open,
  resources,
  actions,
  resourceKey,
  actionKey,
  description,
  busy,
  opError,
  setResourceKey,
  setActionKey,
  setDescription,
  onClose,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Permission</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Resource"
            value={resourceKey}
            onChange={(e) => setResourceKey(e.target.value)}
            fullWidth
          >
            {resources.map((r: any) => (
              <MenuItem key={r.key} value={r.key}>
                {r.name} ({r.key})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Action"
            value={actionKey}
            onChange={(e) => setActionKey(e.target.value)}
            fullWidth
          >
            {actions.map((a: any) => (
              <MenuItem key={a.key} value={a.key}>
                {a.name} ({a.key})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={busy || !resourceKey || !actionKey}>
          {busy ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
