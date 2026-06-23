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

const cleanHost = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

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
}: Readonly<{
  portal: PortalAccess;
  selectedRoles: Set<string>;
  toggleRole: (key: string) => void;
}>) {
  const links = portal.links ?? [{ label: '', url: portal.url }];
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {portal.name}
        </Typography>
        <Stack spacing={0.25} sx={{ mb: 0.75, mt: 0.25 }}>
          {links.map((link) => (
            <Stack
              key={link.url}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                {link.label ? `${link.label} · ${cleanHost(link.url)}` : cleanHost(link.url)}
              </Typography>
              <Tooltip title={`Open ${link.url}`}>
                <IconButton
                  size="small"
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
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
}: Readonly<Props>) {
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
