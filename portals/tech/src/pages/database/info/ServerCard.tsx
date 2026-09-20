import { Alert, Stack } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import InfoList, { type InfoRowItem } from '../../server/InfoList';
import { formatBytes, formatDateTime, formatUptime } from '../../server/format';
import type { DatabaseServer } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const count = (value: number | null) => (value ?? 0).toLocaleString();

function roleValue(server: DatabaseServer, t: Translate): string {
  const role = server.isWritablePrimary ? t('tech.dbInfo.rolePrimary') : t('tech.dbInfo.roleNotWritable');
  return server.setName ? `${server.setName} · ${role}` : role;
}

/** serverStatus rows exist only when the database user may run it. */
function statusRows(server: DatabaseServer, t: Translate): InfoRowItem[] {
  if (server.statusError) return [];
  return [
    { label: t('tech.dbInfo.uptime'), value: formatUptime(server.uptimeSeconds ?? 0) },
    {
      label: t('tech.dbInfo.connections'),
      value: t('tech.dbInfo.connectionsValue', {
        vars: {
          current: server.connectionsCurrent ?? 0,
          available: server.connectionsAvailable ?? 0,
          created: server.connectionsTotalCreated ?? 0,
        },
      }),
    },
    { label: t('tech.dbInfo.storageEngine'), value: server.storageEngine ?? '—' },
    {
      label: t('tech.dbInfo.ops'),
      value: t('tech.dbInfo.opsValue', {
        vars: {
          insert: count(server.opInsert),
          query: count(server.opQuery),
          update: count(server.opUpdate),
          delete: count(server.opDelete),
          command: count(server.opCommand),
        },
      }),
    },
    { label: t('tech.dbInfo.memory'), value: formatBytes(server.memResidentBytes ?? 0) },
    {
      label: t('tech.dbInfo.network'),
      value: t('tech.dbInfo.networkValue', {
        vars: {
          in: formatBytes(server.networkBytesIn ?? 0),
          out: formatBytes(server.networkBytesOut ?? 0),
          requests: count(server.networkRequests),
        },
      }),
    },
    {
      label: t('tech.dbInfo.cache'),
      value: t('tech.dbInfo.cacheValue', {
        vars: { used: formatBytes(server.cacheBytes ?? 0), max: formatBytes(server.cacheMaxBytes ?? 0) },
      }),
    },
  ];
}

/** The mongod itself: version, replica-set role and — where allowed — its load. */
export default function ServerCard({ server }: Readonly<{ server: DatabaseServer }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.dbInfo.serverTitle')}>
      <Stack spacing={1.5}>
        <InfoList
          rows={[
            { label: t('tech.dbInfo.version'), value: server.version },
            { label: t('tech.dbInfo.role'), value: roleValue(server, t) },
            { label: t('tech.dbInfo.primary'), value: server.primary ?? '—' },
            { label: t('tech.dbInfo.members'), value: server.members.join(', ') || '—' },
            { label: t('tech.dbInfo.lastWrite'), value: formatDateTime(server.lastWriteAt) },
            ...statusRows(server, t),
          ]}
        />
        {server.statusError && (
          <Alert severity="info">
            {t('tech.dbInfo.statusDenied', { vars: { message: server.statusError } })}
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}
