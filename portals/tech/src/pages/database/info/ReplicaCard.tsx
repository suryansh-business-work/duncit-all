import { Alert, Box, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import InfoList, { type InfoRowItem } from '../../server/InfoList';
import { formatBytes, formatDateTime } from '../../server/format';
import ReplicaMembers from './ReplicaMembers';
import type { DatabaseOplog, DatabaseReplica } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const dash = (value: string | number | null) => (value === null ? '—' : String(value));

/**
 * The one grant that fills this card in. Built here rather than in copy
 * because it is a mongosh command, not prose, and the user name is the
 * connection's own.
 */
function GrantHint({ user }: Readonly<{ user: string | null }>) {
  const { t } = useTranslation();
  const command = `db.grantRolesToUser(${JSON.stringify(user ?? '')}, [{ role: "clusterMonitor", db: "admin" }])`;
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2">{t('tech.dbInfo.replicaGrant')}</Typography>
      <Box
        component="code"
        data-testid="db-info-grant-command"
        sx={{
          display: 'block',
          fontFamily: 'monospace',
          fontSize: 12,
          p: 1,
          bgcolor: 'action.hover',
          borderRadius: 1,
          wordBreak: 'break-all',
        }}
      >
        {command}
      </Box>
    </Stack>
  );
}

function setRows(r: DatabaseReplica, t: Translate): InfoRowItem[] {
  const heartbeat =
    r.heartbeatIntervalMs === null
      ? '—'
      : t('tech.dbInfo.replicaHeartbeatValue', { vars: { seconds: r.heartbeatIntervalMs / 1000 } });
  return [
    { label: t('tech.dbInfo.replicaSetName'), value: r.set },
    { label: t('tech.dbInfo.replicaPrimary'), value: r.primary ?? '—' },
    { label: t('tech.dbInfo.replicaMyState'), value: r.myState ?? '—' },
    { label: t('tech.dbInfo.replicaTerm'), value: dash(r.term) },
    { label: t('tech.dbInfo.replicaHeartbeat'), value: heartbeat },
    { label: t('tech.dbInfo.replicaConfigVersion'), value: dash(r.configVersion) },
  ];
}

function oplogRows(o: DatabaseOplog, t: Translate): InfoRowItem[] {
  const size =
    o.maxBytes === null
      ? formatBytes(o.dataBytes)
      : t('tech.dbInfo.oplogSizeValue', { vars: { used: formatBytes(o.dataBytes), max: formatBytes(o.maxBytes) } });
  const window =
    o.windowSeconds === null
      ? '—'
      : t('tech.dbInfo.oplogWindowValue', { vars: { hours: Math.round(o.windowSeconds / 360) / 10 } });
  return [
    { label: t('tech.dbInfo.oplogEntries'), value: o.entries.toLocaleString() },
    { label: t('tech.dbInfo.oplogSize'), value: size },
    { label: t('tech.dbInfo.oplogOldest'), value: formatDateTime(o.firstAt) },
    { label: t('tech.dbInfo.oplogNewest'), value: formatDateTime(o.lastAt) },
    { label: t('tech.dbInfo.oplogWindow'), value: window },
  ];
}

type Props = Readonly<{
  replica: DatabaseReplica | null;
  replicaError: string | null;
  oplog: DatabaseOplog | null;
  oplogError: string | null;
  username: string | null;
}>;

/**
 * The replica set behind the connection — members, who is primary, how far
 * each is behind — and the oplog that carries them. Read-only. Both need the
 * clusterMonitor role, so a refusal shows the grant instead of an empty card.
 */
export default function ReplicaCard({ replica, replicaError, oplog, oplogError, username }: Props) {
  const { t } = useTranslation();
  const denied = replicaError ?? oplogError;
  return (
    <SectionCard title={t('tech.dbInfo.replicaTitle')} subtitle={t('tech.dbInfo.replicaSubtitle')}>
      <Stack spacing={2}>
        {replica && (
          <>
            <InfoList rows={setRows(replica, t)} />
            <ReplicaMembers members={replica.members} />
          </>
        )}
        {oplog && (
          <Box>
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
              {t('tech.dbInfo.oplogTitle')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tech.dbInfo.oplogSubtitle')}
            </Typography>
            <InfoList rows={oplogRows(oplog, t)} />
          </Box>
        )}
        {denied && (
          <Alert severity="info">
            <Stack spacing={1}>
              <span>{t('tech.dbInfo.replicaDenied', { vars: { message: denied } })}</span>
              <GrantHint user={username} />
            </Stack>
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}
