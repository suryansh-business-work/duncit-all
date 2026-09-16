import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { envOptions } from '../../components/telemetry-identity';
import { TELEMETRY_LOGS_TABLE, levelColor, type LogRow } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

const getLogRowId = (l: LogRow) => l.id;

const LEVEL_OPTIONS = [
  { value: 'error', label: 'error' },
  { value: 'warn', label: 'warn' },
  { value: 'info', label: 'info' },
  { value: 'debug', label: 'debug' },
];

const renderLevel = (l: LogRow) => (
  <Chip size="small" label={l.level} color={levelColor(l.level)} />
);

const renderWhen = (l: LogRow) => (
  <Typography variant="body2" sx={{
    color: "text.secondary"
  }}>
    {formatDateTime(l.created_at)}
  </Typography>
);

const renderMessage = (l: LogRow) => (
  <Typography variant="body2" noWrap title={l.error?.message ?? ''} sx={{
    color: "text.secondary"
  }}>
    {l.error ? `${l.error.name}: ${l.error.message}` : '—'}
  </Typography>
);

export default function RecentLogsTable() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<LogRow>(client, TELEMETRY_LOGS_TABLE, 'telemetryLogsTable');

  const columns = useMemo<DuncitColumn<LogRow>[]>(
    () => [
      { field: 'level', headerName: t('tech.telemetryDashboard.level'), width: 110, type: 'enum', options: LEVEL_OPTIONS, cellRenderer: renderLevel },
      { field: 'source', headerName: t('tech.common.source'), width: 150, type: 'text' },
      { field: 'page', headerName: t('tech.common.page'), flex: 1, minWidth: 150, type: 'text' },
      { field: 'component', headerName: t('tech.common.component'), width: 150, type: 'text' },
      { field: 'environment', headerName: t('tech.common.env'), width: 120, type: 'enum', options: envOptions(t) },
      // Sorts and filters on the error message (error.message on the server).
      { field: 'error', headerName: t('tech.common.message'), flex: 1.4, minWidth: 220, type: 'text', cellRenderer: renderMessage },
      { field: 'created_at', headerName: t('tech.common.when'), width: 190, type: 'date', cellRenderer: renderWhen },
    ],
    [],
  );

  return (
    <DuncitTable<LogRow>
      tableId="tech-telemetry-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLogRowId}
      emptyText={t('tech.telemetryDashboard.noTelemetryLogsPersistedYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search page, component or source"
    />
  );
}
