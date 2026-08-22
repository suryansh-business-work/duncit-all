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
import { formatDateTime, useTranslation } from '@duncit/app-settings';

/** Everything one persisted log knows about itself, in four readable groups. */
interface Props {
  row: TelemetryLogRow | null;
  onClose: () => void;
}

function UserSection({ row }: Readonly<{ row: TelemetryLogRow }>) {
  const { t } = useTranslation();
  if (!row.user?.id) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nobody was signed in — this happened before or without a session.
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <DetailField label={t('shell.common.name')} value={userLabel(row.user)} />
      <DetailField label={t('shell.common.email')} value={row.user.email ?? ''} />
      <DetailField label={t('shell.common.phone')} value={row.user.phone ?? ''} />
      <DetailField label={t('shell.nav.roles')} value={row.user.roles.join(', ')} />
      <DetailField label={t('tech.common.userId')} value={row.user.id} mono />
      <DetailField label={t('tech.common.deviceId')} value={row.duid ?? ''} mono />
    </Box>
  );
}

function MachineSection({ row }: Readonly<{ row: TelemetryLogRow }>) {
  const { t } = useTranslation();
  const c = row.client;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <DetailField label={t('tech.common.appVersion')} value={c?.app_version ?? ''} />
      <DetailField
        label={t('tech.common.device')}
        value={[c?.device_model, c?.device_os_version].filter(Boolean).join(' · ')}
      />
      <DetailField label={t('tech.telemetryLogs.locale')} value={c?.locale ?? ''} />
      <DetailField label={t('tech.telemetryLogs.timezone')} value={c?.timezone ?? ''} />
      <DetailField label={t('tech.telemetryLogs.screen')} value={c?.screen ?? ''} />
      <DetailField label={t('tech.telemetryLogs.viewport')} value={c?.viewport ?? ''} />
      <DetailField label={t('tech.common.network')} value={c?.network ?? ''} />
      <DetailField label={t('tech.telemetryLogs.referrer')} value={c?.referrer ?? ''} />
      <DetailField label={t('tech.common.ipAddress')} value={row.ip ?? ''} />
      <DetailField label={t('tech.common.session')} value={row.session_id ?? ''} mono />
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
  const { t } = useTranslation();
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
          <Group title={t('tech.telemetryLogs.event')}>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
              <DetailField label={t('tech.common.when')} value={formatDateTime(row.created_at)} />
              <DetailField label={t('tech.common.source')} value={row.source} />
              <DetailField
                label={t('tech.common.app')}
                value={[row.app, row.portal].filter(Boolean).join(' · ')}
              />
              <DetailField
                label={t('tech.common.platform')}
                value={[row.platform, row.os].filter(Boolean).join(' · ')}
              />
              <DetailField label="URL" value={row.url ?? ''} />
              <DetailField label={t('tech.common.host')} value={row.host ?? ''} />
            </Box>
          </Group>

          {row.error ? (
            <DetailField label={row.error.name} value={row.error.message} />
          ) : (
            <DetailField label={t('tech.common.message')} value={row.component} />
          )}

          <Divider />
          <Group title={t('tech.telemetryLogs.who')}>
            <UserSection row={row} />
          </Group>

          <Divider />
          <Group title={t('tech.telemetryLogs.machine')}>
            <MachineSection row={row} />
          </Group>

          {row.user_agent ? <DetailBlock label={t('tech.telemetryLogs.userAgent')} value={row.user_agent} /> : null}
          {row.error?.stack ? <DetailBlock label={t('tech.common.stackTrace')} value={row.error.stack} /> : null}
          {row.data_json ? <DetailBlock label={t('tech.common.structuredData')} value={row.data_json} /> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
