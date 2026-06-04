import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PORTAL_ACCESS, type PortalAccess } from '../../constants/portalAccess';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedRoles: Set<string>;
  toggleRole: (key: string) => void;
  saveRoles: () => void;
  busy: boolean;
}

function PortalCard({
  portal,
  selectedRoles,
  toggleRole,
}: {
  portal: PortalAccess;
  selectedRoles: Set<string>;
  toggleRole: (key: string) => void;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {portal.name}
          </Typography>
          <Tooltip title={portal.url}>
            <IconButton size="small" component="a" href={portal.url} target="_blank" rel="noopener">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack spacing={0.25}>
          {portal.roles.map((r) => (
            <FormControlLabel
              key={r.key}
              sx={{ m: 0, justifyContent: 'space-between' }}
              labelPlacement="start"
              control={
                <Switch
                  checked={r.required || selectedRoles.has(r.key)}
                  disabled={r.required}
                  onChange={() => toggleRole(r.key)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {r.name}
                    {r.required && (
                      <Chip size="small" label="Default" color="info" sx={{ ml: 0.75, height: 18 }} />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.key}
                  </Typography>
                </Box>
              }
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function RolesDialog({
  open,
  onClose,
  selectedRoles,
  toggleRole,
  saveRoles,
  busy,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Portal Access</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Choose which portals this user can access. Granting a portal gives full access to it.
        </Typography>
        <Stack spacing={1.5}>
          {PORTAL_ACCESS.map((p) => (
            <PortalCard
              key={p.key}
              portal={p}
              selectedRoles={selectedRoles}
              toggleRole={toggleRole}
            />
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
