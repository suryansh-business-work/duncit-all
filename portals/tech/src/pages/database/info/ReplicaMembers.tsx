import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import InfoList, { type InfoRowItem } from '../../server/InfoList';
import { formatDateTime, formatUptime } from '../../server/format';
import type { ReplicaMember } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type ChipColor = 'success' | 'info' | 'warning' | 'error' | 'default';

/** mongod's member states, coloured by whether the member is serving. */
const STATE_COLOR: Record<string, ChipColor> = {
  PRIMARY: 'success',
  SECONDARY: 'info',
  ARBITER: 'default',
  STARTUP: 'warning',
  STARTUP2: 'warning',
  RECOVERING: 'warning',
  ROLLBACK: 'warning',
  DOWN: 'error',
  UNKNOWN: 'error',
  REMOVED: 'error',
};

const dash = (value: string | number | null) => (value === null ? '—' : String(value));

function memberRows(m: ReplicaMember, t: Translate): InfoRowItem[] {
  const health = m.healthy ? t('tech.dbInfo.memberHealthy') : t('tech.dbInfo.memberUnhealthy');
  const lag = m.lagSeconds === null ? '—' : t('tech.dbInfo.memberLagValue', { vars: { seconds: m.lagSeconds } });
  const ping = m.pingMs === null ? '—' : t('tech.dbInfo.pingValue', { vars: { ms: m.pingMs } });
  return [
    { label: t('tech.dbInfo.memberHealth'), value: health },
    { label: t('tech.dbInfo.memberUptime'), value: formatUptime(m.uptimeSeconds) },
    { label: t('tech.dbInfo.memberOptime'), value: formatDateTime(m.optimeAt) },
    { label: t('tech.dbInfo.memberLag'), value: lag },
    { label: t('tech.dbInfo.memberHeartbeat'), value: formatDateTime(m.lastHeartbeatAt) },
    { label: t('tech.dbInfo.memberPing'), value: ping },
    { label: t('tech.dbInfo.memberSyncSource'), value: m.syncSourceHost ?? '—' },
    { label: t('tech.dbInfo.memberPriority'), value: dash(m.priority) },
    { label: t('tech.dbInfo.memberVotes'), value: dash(m.votes) },
  ];
}

function MemberTile({ member: m }: Readonly<{ member: ReplicaMember }>) {
  const { t } = useTranslation();
  return (
    <Box
      data-testid={`db-info-member-${m.name}`}
      sx={{ border: 1, borderColor: m.self ? 'primary.main' : 'divider', borderRadius: 1, p: 1.5 }}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="subtitle2" component="h3" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {m.name}
        </Typography>
        <Chip size="small" color={STATE_COLOR[m.stateStr] ?? 'default'} label={m.stateStr} />
        {m.self && <Chip size="small" variant="outlined" label={t('tech.dbInfo.memberSelf')} />}
      </Stack>
      <InfoList rows={memberRows(m, t)} />
    </Box>
  );
}

/** One tile per replica-set member, the one this connection is on outlined. */
export default function ReplicaMembers({ members }: Readonly<{ members: ReplicaMember[] }>) {
  return (
    <Box
      data-testid="db-info-members"
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}
    >
      {members.map((m) => (
        <MemberTile key={m.name} member={m} />
      ))}
    </Box>
  );
}
