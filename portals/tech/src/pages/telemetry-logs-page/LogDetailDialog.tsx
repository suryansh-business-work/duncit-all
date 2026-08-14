import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { DetailBlock, DetailField } from '../../components/DetailField';
import { ENV_COLOR, userLabel } from '../../components/telemetry-identity';
import { type TelemetryLogRow } from './queries';

/** Everything one persisted log knows about itself, in four readable groups. */
interface Props {
  row: TelemetryLogRow | null;
  onClose: () => void;
}

function UserSection({ row }: Readonly<{ row: TelemetryLogRow }>) {
  if (!row.user?.id) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nobody was signed in — this happened before or without a session.
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <DetailField label="Name" value={userLabel(row.user)} />
      <DetailField label="Email" value={row.user.email ?? ''} />
      <DetailField label="Phone" value={row.user.phone ?? ''} />
      <DetailField label="Roles" value={row.user.roles.join(', ')} />
      <DetailField label="User id" value={row.user.id} mono />
      <DetailField label="Device id" value={row.duid ?? ''} mono />
    </Box>
  );
}

function MachineSection({ row }: Readonly<{ row: TelemetryLogRow }>) {
  const c = row.client;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <DetailField label="App version" value={c?.app_version ?? ''} />
      <DetailField
        label="Device"
        value={[c?.device_model, c?.device_os_version].filter(Boolean).join(' · ')}
      />
      <DetailField label="Locale" value={c?.locale ?? ''} />
      <DetailField label="Timezone" value={c?.timezone ?? ''} />
      <DetailField label="Screen" value={c?.screen ?? ''} />
      <DetailField label="Viewport" value={c?.viewport ?? ''} />
      <DetailField label="Network" value={c?.network ?? ''} />
      <DetailField label="Referrer" value={c?.referrer ?? ''} />
      <DetailField label="IP address" value={row.ip ?? ''} />
      <DetailField label="Session" value={row.session_id ?? ''} mono />
    </Box>
  );
}

function Group({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function LogDetailDialog({ row, onClose }: Readonly<Props>) {
  if (!row) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={row.level} />
          <Chip
            size="small"
            label={row.environment}
            color={ENV_COLOR[row.environment] ?? 'default'}
          />
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {row.page} / {row.component}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Group title="Event">
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
              <DetailField label="When" value={new Date(row.created_at).toLocaleString()} />
              <DetailField label="Source" value={row.source} />
              <DetailField
                label="App"
                value={[row.app, row.portal].filter(Boolean).join(' · ')}
              />
              <DetailField
                label="Platform"
                value={[row.platform, row.os].filter(Boolean).join(' · ')}
              />
              <DetailField label="URL" value={row.url ?? ''} />
              <DetailField label="Host" value={row.host ?? ''} />
            </Box>
          </Group>

          {row.error ? (
            <DetailField label={row.error.name} value={row.error.message} />
          ) : (
            <DetailField label="Message" value={row.component} />
          )}

          <Divider />
          <Group title="Who">
            <UserSection row={row} />
          </Group>

          <Divider />
          <Group title="Machine">
            <MachineSection row={row} />
          </Group>

          {row.user_agent ? <DetailBlock label="User agent" value={row.user_agent} /> : null}
          {row.error?.stack ? <DetailBlock label="Stack trace" value={row.error.stack} /> : null}
          {row.data_json ? <DetailBlock label="Structured data" value={row.data_json} /> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
