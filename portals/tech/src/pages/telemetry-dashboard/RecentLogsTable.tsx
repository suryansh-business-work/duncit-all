import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { TELEMETRY_LOGS_TABLE, levelColor, type LogRow } from './queries';

const getLogRowId = (l: LogRow) => l.id;

const LEVEL_FILTER = {
  type: 'select' as const,
  options: [
    { value: 'error', label: 'error' },
    { value: 'warn', label: 'warn' },
    { value: 'info', label: 'info' },
    { value: 'debug', label: 'debug' },
  ],
};

const renderLevel = (l: LogRow) => (
  <Chip size="small" label={l.level} color={levelColor(l.level)} />
);

const renderWhen = (l: LogRow) => (
  <Typography variant="body2" color="text.secondary">
    {new Date(l.created_at).toLocaleString()}
  </Typography>
);

const renderMessage = (l: LogRow) => (
  <Typography variant="body2" color="text.secondary" noWrap title={l.error?.message ?? ''}>
    {l.error ? `${l.error.name}: ${l.error.message}` : '—'}
  </Typography>
);

export default function RecentLogsTable() {
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<LogRow>(client, TELEMETRY_LOGS_TABLE, 'telemetryLogsTable');

  const columns = useMemo<DuncitColumn<LogRow>[]>(
    () => [
      { field: 'level', headerName: 'Level', width: 110, filter: LEVEL_FILTER, cellRenderer: renderLevel },
      { field: 'source', headerName: 'Source', width: 150, filter: { type: 'text' } },
      { field: 'page', headerName: 'Page', flex: 1, minWidth: 150, filter: { type: 'text' } },
      { field: 'component', headerName: 'Component', width: 150 },
      { field: 'environment', headerName: 'Env', width: 120, filter: { type: 'text' } },
      { field: 'error', headerName: 'Message', flex: 1.4, minWidth: 220, sortable: false, cellRenderer: renderMessage },
      { field: 'created_at', headerName: 'When', width: 190, cellRenderer: renderWhen },
    ],
    [],
  );

  return (
    <DuncitTable<LogRow>
      tableId="tech-telemetry-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLogRowId}
      emptyText="No telemetry logs persisted yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search page, component or source"
    />
  );
}
