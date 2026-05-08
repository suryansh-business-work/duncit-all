import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  permsByResource: Record<string, { key: string; action_key: string }[]>;
  selectedKeys: Set<string>;
  toggleKey: (k: string) => void;
  busy: boolean;
  opError: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function PermissionsDialog({
  open,
  permsByResource,
  selectedKeys,
  toggleKey,
  busy,
  opError,
  onClose,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Permissions</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {Object.keys(permsByResource).length === 0 && (
            <Alert severity="info">No permissions defined yet.</Alert>
          )}
          {Object.entries(permsByResource).map(([resource, perms]) => (
            <Box key={resource}>
              <Typography variant="subtitle2" gutterBottom textTransform="uppercase">
                {resource}
              </Typography>
              <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
                {perms.map((p) => (
                  <FormControlLabel
                    key={p.key}
                    sx={{ minWidth: 180 }}
                    control={
                      <Checkbox
                        checked={selectedKeys.has(p.key)}
                        onChange={() => toggleKey(p.key)}
                        size="small"
                      />
                    }
                    label={p.action_key}
                  />
                ))}
              </Stack>
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save Permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
