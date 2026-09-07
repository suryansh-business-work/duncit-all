import { Box, Divider, Stack, Typography } from '@mui/material';
import { DetailBlock, DetailField } from '../../components/DetailField';
import { userLabel } from '../../components/telemetry-identity';
import { type TelemetryLogRow } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

/**
 * Everything one persisted log knows about itself, in four readable groups.
 *
 * Kept apart from the page that routes to it so the body is about the record
 * and the page is about the address — the same split Bugs uses.
 */

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
} as const;

function UserSection({ row }: Readonly<{ row: TelemetryLogRow }>) {
  const { t } = useTranslation();
  if (!row.user?.id) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.telemetryLogs.nobodyWasSignedIn')}
      </Typography>
    );
  }
  return (
    <Box sx={GRID_SX}>
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
    <Box sx={GRID_SX}>
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

function EventSection({ row }: Readonly<{ row: TelemetryLogRow }>) {
  const { t } = useTranslation();
  return (
    <Box sx={GRID_SX}>
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
      <DetailField label={t('tech.common.logId')} value={row.id} mono />
    </Box>
  );
}

function Group({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function LogDetailBody({ row }: Readonly<{ row: TelemetryLogRow }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      <Group title={t('tech.telemetryLogs.event')}>
        <EventSection row={row} />
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

      {row.user_agent ? (
        <DetailBlock label={t('tech.telemetryLogs.userAgent')} value={row.user_agent} />
      ) : null}
      {row.error?.stack ? (
        <DetailBlock label={t('tech.common.stackTrace')} value={row.error.stack} />
      ) : null}
      {row.data_json ? (
        <DetailBlock label={t('tech.common.structuredData')} value={row.data_json} />
      ) : null}
    </Stack>
  );
}
