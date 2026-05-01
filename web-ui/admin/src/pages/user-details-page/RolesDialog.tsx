import {
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
  Box,
  Chip,
  Button,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  allRoles: any[];
  selectedRoles: Set<string>;
  toggleRole: (key: string) => void;
  saveRoles: () => void;
  busy: boolean;
}

export default function RolesDialog({
  open,
  onClose,
  allRoles,
  selectedRoles,
  toggleRole,
  saveRoles,
  busy,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Roles</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {allRoles.length === 0 && <Alert severity="info">No roles defined yet.</Alert>}
          {allRoles.map((r: any) => (
            <Card key={r.id} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {r.name}{' '}
                      {r.is_system && (
                        <Chip
                          size="small"
                          label="system"
                          sx={{ ml: 0.5, height: 18 }}
                          color="info"
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.key}
                      {r.description ? ` · ${r.description}` : ''}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={r.key === 'USER' ? true : selectedRoles.has(r.key)}
                        disabled={r.key === 'USER'}
                        onChange={() => toggleRole(r.key)}
                      />
                    }
                    label={r.key === 'USER' ? 'Required' : ''}
                    labelPlacement="start"
                    sx={{
                      mr: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: 11,
                        color: 'text.secondary',
                      },
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={saveRoles} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
