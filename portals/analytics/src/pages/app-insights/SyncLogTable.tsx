import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { formatValue } from '../entity-analytics/format';
import { APP_INSIGHTS_SYNC_LOGS, type AppInsightStore, type AppInsightSyncLog } from './queries';
import { syncLogColumns } from './sync-log-columns';

const getRowId = (row: AppInsightSyncLog) => row.id;
const searchOf = (row: AppInsightSyncLog) => `${row.store} ${row.outcome} ${row.message}`;
const formatDuration = (ms: number) => formatValue(ms, 'DURATION');
/** The most recent syncs the page lists. */
const LOG_LIMIT = 100;

/** Every recent sync of the tab's store (or both): when, how it went, what it read and why it failed. */
export default function SyncLogTable({ store }: Readonly<{ store: AppInsightStore | null }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, error, loading } = useQuery(APP_INSIGHTS_SYNC_LOGS, {
    variables: { store, limit: LOG_LIMIT },
    fetchPolicy: 'cache-and-network',
  });
  const columns = useMemo(() => syncLogColumns(t, formatDateTime, formatDuration), [t, formatDateTime]);
  const rows = data?.appInsightsSyncLogs;
  const fetchRows = useMemo(() => clientTableFetch(rows ?? [], searchOf, columns), [rows, columns]);

  return (
    <Stack spacing={1} data-testid="app-insights-sync-log">
      <Typography variant="h6" component="h2">
        {t('analytics.appInsights.log.title')}
      </Typography>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <DuncitTable<AppInsightSyncLog>
        tableId="analytics-app-insights-sync-log"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        defaultSort={{ field: 'started_at', dir: 'desc' }}
        searchPlaceholder={t('analytics.appInsights.log.search')}
        emptyText={t(loading ? 'analytics.appInsights.daily.loading' : 'analytics.appInsights.log.empty')}
        ariaLabel={t('analytics.appInsights.log.title')}
      />
    </Stack>
  );
}
