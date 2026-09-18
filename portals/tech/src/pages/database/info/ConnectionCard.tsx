import { Chip, Stack, TextField } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import InfoList from '../../server/InfoList';
import { ENVIRONMENT_KEY, PROVIDER_KEY, STATE_LABEL } from './labels';
import type { DatabaseConnection } from './queries';

type Props = Readonly<{ connection: DatabaseConnection; pingMs: number | null }>;

/** Which database the API is on, read-only: the password is masked by the server. */
export default function ConnectionCard({ connection: c, pingMs }: Props) {
  const { t } = useTranslation();
  const state = STATE_LABEL[c.state] ?? STATE_LABEL.uninitialized;
  const databaseValue = c.databaseNamePinned
    ? c.databaseName
    : t('tech.dbInfo.databaseDefault', { vars: { name: c.databaseName } });
  const pingValue = pingMs === null ? '—' : t('tech.dbInfo.pingValue', { vars: { ms: pingMs } });

  return (
    <SectionCard
      title={t('tech.dbInfo.connectionTitle')}
      subtitle={t('tech.dbInfo.connectionSubtitle')}
      action={
        <Chip
          size="small"
          color={c.provider === 'ATLAS' ? 'info' : 'primary'}
          label={t(PROVIDER_KEY[c.provider])}
          data-testid="db-info-provider"
        />
      }
    >
      <Stack spacing={1.5}>
        <TextField
          label={t('tech.dbInfo.connectionString')}
          value={c.maskedUri}
          size="small"
          fullWidth
          slotProps={{
            input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } },
            htmlInput: { 'data-testid': 'db-info-connection-string' },
          }}
        />
        <InfoList
          rows={[
            { label: t('tech.dbInfo.environment'), value: t(ENVIRONMENT_KEY[c.environment]) },
            {
              label: t('tech.dbInfo.state'),
              value: <Chip size="small" color={state.color} label={t(state.key)} />,
            },
            { label: t('tech.dbInfo.database'), value: databaseValue },
            { label: t('tech.dbInfo.hosts'), value: c.hosts.join(', ') },
            { label: t('tech.dbInfo.replicaSet'), value: c.replicaSet ?? '—' },
            { label: t('tech.dbInfo.username'), value: c.username ?? '—' },
            { label: t('tech.dbInfo.authSource'), value: c.authSource ?? '—' },
            { label: t('tech.dbInfo.tls'), value: c.tls ? t('tech.dbInfo.on') : t('tech.dbInfo.off') },
            { label: t('tech.dbInfo.ping'), value: pingValue },
            {
              label: t('tech.dbInfo.pool'),
              value: t('tech.dbInfo.poolValue', { vars: { min: c.minPoolSize, max: c.maxPoolSize } }),
            },
            {
              label: t('tech.dbInfo.maxTime'),
              value: t('tech.dbInfo.maxTimeValue', { vars: { seconds: c.maxTimeMs / 1000 } }),
            },
          ]}
        />
      </Stack>
    </SectionCard>
  );
}
