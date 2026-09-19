import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import LogPane from '../../server/LogPane';
import { TECH_CONTAINER_LOGS } from '../../server/queries';

/** How many lines to ask for; the server caps at its own LOG_TAIL_MAX. */
const TAIL_OPTIONS = [200, 500, 1000];

/** mongod tags each JSON log line with its component; these are the replication ones. */
const REPLICATION_TAGS = ['"c":"REPL"', '"c":"REPL_HB"', '"c":"ELECTION"', '"c":"INITSYNC"'];
const isReplicationLine = (line: string) => REPLICATION_TAGS.some((tag) => line.includes(tag));

/**
 * The mongod's own log, read from its container through the docker socket the
 * API already mounts — the same path Server › Docker uses. Read-only: there is
 * no command here, only a tail. The switch keeps just the replication lines.
 */
export default function MongoLogsCard({ container }: Readonly<{ container: string | null }>) {
  const { t } = useTranslation();
  const [tail, setTail] = useState(TAIL_OPTIONS[0]);
  const [replicationOnly, setReplicationOnly] = useState(false);
  const { data, loading, error, refetch } = useQuery<{ techContainerLogs: string }>(TECH_CONTAINER_LOGS, {
    variables: { name: container, tail },
    skip: !container,
    fetchPolicy: 'network-only',
  });
  const lines = useMemo(() => (data?.techContainerLogs ?? '').split('\n').filter(Boolean), [data]);
  const shown = replicationOnly ? lines.filter(isReplicationLine) : lines;

  if (!container) {
    return (
      <SectionCard title={t('tech.dbInfo.logsTitle')} subtitle={t('tech.dbInfo.logsSubtitle')}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.dbInfo.logsNoContainer')}
        </Typography>
      </SectionCard>
    );
  }

  let text = shown.join('\n');
  if (loading && !data) text = t('tech.dbInfo.logsLoading');
  else if (shown.length === 0) text = t('tech.dbInfo.logsEmpty');

  return (
    <SectionCard
      title={t('tech.dbInfo.logsTitle')}
      subtitle={t('tech.dbInfo.logsSubtitle')}
      action={
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={loading}
          data-testid="db-info-logs-refresh"
        >
          {t('tech.server.refresh')}
        </DuncitButton>
      }
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label={t('tech.dbInfo.logsTail')}
            value={tail}
            onChange={(e) => setTail(Number(e.target.value))}
            sx={{ minWidth: 120 }}
            slotProps={{ htmlInput: { 'data-testid': 'db-info-logs-tail' } }}
          >
            {TAIL_OPTIONS.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={replicationOnly}
                onChange={(e) => setReplicationOnly(e.target.checked)}
                slotProps={{
                  input: {
                    'aria-label': t('tech.dbInfo.logsReplicationOnly'),
                    'data-testid': 'db-info-logs-replication-only',
                  } as Record<string, string>,
                }}
              />
            }
            label={t('tech.dbInfo.logsReplicationOnly')}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.dbInfo.logsShowing', { vars: { shown: shown.length, total: lines.length } })}
          </Typography>
        </Stack>
        {error && <Alert severity="error">{t('tech.dbInfo.logsError', { vars: { message: error.message } })}</Alert>}
        <LogPane text={text} label={t('tech.dbInfo.logsTitle')} />
      </Stack>
    </SectionCard>
  );
}
