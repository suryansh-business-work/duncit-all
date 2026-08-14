import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { ENV_OPTIONS, ERROR_MODULE_FILTER, parseIssueData, type ErrorLogRow } from './queries';

const getRowId = (row: ErrorLogRow) => row.id;

const ENV_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  production: 'error',
  staging: 'warning',
  localhost: 'default',
};

const KIND_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  SERVER: 'error',
  NETWORK: 'warning',
  AUTH: 'info',
  FORBIDDEN: 'info',
  VALIDATION: 'default',
  CONFLICT: 'warning',
  NOT_FOUND: 'default',
  UNKNOWN: 'default',
};

const renderEnvironment = (row: ErrorLogRow) => (
  <Chip size="small" label={row.environment} color={ENV_COLOR[row.environment] ?? 'default'} />
);

const renderKind = (row: ErrorLogRow) => {
  const kind = parseIssueData(row).kind ?? '—';
  return <Chip size="small" variant="outlined" label={kind} color={KIND_COLOR[kind] ?? 'default'} />;
};

const renderMessage = (row: ErrorLogRow) => (
  <Typography variant="body2" noWrap title={row.error?.message ?? ''}>
    {row.error?.message ?? '—'}
  </Typography>
);

const renderWhen = (row: ErrorLogRow) => (
  <Typography variant="body2" color="text.secondary">
    {new Date(row.created_at).toLocaleString()}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<ErrorLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: ErrorLogRow) => void;
}

export default function ErrorLogsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<ErrorLogRow>[]>(
    () => [
      { field: 'created_at', headerName: 'When', width: 175, cellRenderer: renderWhen },
      {
        field: 'environment',
        headerName: 'Env',
        width: 115,
        filter: { type: 'select', options: ENV_OPTIONS },
        cellRenderer: renderEnvironment,
      },
      { field: 'source', headerName: 'Source', width: 130, filter: { type: 'text' } },
      { field: 'page', headerName: 'Page', width: 140, filter: { type: 'text' } },
      {
        field: 'kind',
        headerName: 'Kind',
        width: 120,
        sortable: false,
        cellRenderer: renderKind,
        valueGetter: (row) => parseIssueData(row).kind ?? '—',
      },
      {
        field: 'code',
        headerName: 'Code',
        width: 180,
        sortable: false,
        valueGetter: (row) => parseIssueData(row).code ?? '—',
      },
      {
        field: 'operation',
        headerName: 'Operation',
        width: 190,
        sortable: false,
        valueGetter: (row) => parseIssueData(row).operation ?? '—',
      },
      {
        field: 'message',
        headerName: 'Message',
        flex: 1,
        minWidth: 240,
        sortable: false,
        cellRenderer: renderMessage,
      },
    ],
    []
  );

  return (
    <DuncitTable<ErrorLogRow>
      tableId="tech-error-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText="No server-operation errors logged yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search page, source or message"
      refetchRef={refetchRef}
      onRowClick={onOpen}
      externalFilters={ERROR_MODULE_FILTER}
    />
  );
}
