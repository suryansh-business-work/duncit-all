import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { ENV_COLOR } from '../../components/telemetry-identity';
import LogDetailBody from '../telemetry-logs-page/LogDetailBody';
import { TELEMETRY_LOG_BY_ID, type TelemetryLogRow } from '../telemetry-logs-page/queries';
import { useTranslation } from '@duncit/app-settings';

/**
 * One log, at its own address.
 *
 * A log is what gets pasted into a chat when something broke — the level, the
 * stack and the account behind it are the whole conversation. A dialog over
 * the table cannot be pasted, cannot be reloaded and cannot be opened in a
 * second tab beside another one. `/telemetry/log/:logId` can be all three.
 */
export default function TelemetryLogDetailPage() {
  const { t } = useTranslation();
  const { logId = '' } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery<{ telemetryLog: TelemetryLogRow | null }>(
    TELEMETRY_LOG_BY_ID,
    { variables: { id: logId }, fetchPolicy: 'cache-and-network', skip: !logId },
  );
  const row = data?.telemetryLog ?? null;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        {/* Back to the tab the row was read in: the level is in the URL there,
            so it lands on the same table rather than the default one. */}
        <DuncitButton
          startIcon={<ArrowBackIcon />}
          onClick={() =>
            navigate(row ? `/telemetry/logs?selectedtab=${row.level}` : '/telemetry/logs')
          }
        >
          {t('shell.nav.logs')}
        </DuncitButton>
        {row ? <Chip size="small" label={row.level} /> : null}
        {row ? (
          <Chip
            size="small"
            label={row.environment}
            color={ENV_COLOR[row.environment] ?? 'default'}
          />
        ) : null}
        <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: 'break-word', flex: 1 }}>
          {row ? `${row.page} / ${row.component}` : t('tech.telemetryLogs.log')}
        </Typography>
      </Stack>

      <QueryGuard
        loading={loading && !row}
        error={error}
        errorText={error?.message}
        spinnerSx={{ py: 6 }}
      >
        {row ? (
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <LogDetailBody row={row} />
          </Paper>
        ) : (
          // A row the retention window already cleared, or an id pasted from
          // another environment.
          <Alert severity="warning">{t('tech.telemetryLogs.thatLogNoLongerExists')}</Alert>
        )}
      </QueryGuard>
    </Stack>
  );
}
