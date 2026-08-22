import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { ENV_COLOR, envOptions, UserCell } from '../../components/telemetry-identity';
import { ERROR_MODULE_FILTER, parseIssueData, type ErrorLogRow } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/app-settings';

const getRowId = (row: ErrorLogRow) => row.id;

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

const renderUser = (row: ErrorLogRow) => <UserCell user={row.user} />;

const renderWhen = (row: ErrorLogRow) => (
  <Typography variant="body2" color="text.secondary">
    {formatDateTime(row.created_at)}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<ErrorLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: ErrorLogRow) => void;
}

export default function ErrorLogsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ErrorLogRow>[]>(
    () => [
      { field: 'created_at', headerName: t('tech.common.when'), width: 175, cellRenderer: renderWhen },
      {
        field: 'environment',
        headerName: t('tech.common.env'),
        width: 115,
        filter: { type: 'select', options: envOptions(t) },
        cellRenderer: renderEnvironment,
      },
      { field: 'source', headerName: t('tech.common.source'), width: 130, filter: { type: 'text' } },
      { field: 'page', headerName: t('tech.common.page'), width: 140, filter: { type: 'text' } },
      {
        field: 'kind',
        headerName: t('tech.errorLogs.kind'),
        width: 120,
        sortable: false,
        cellRenderer: renderKind,
        valueGetter: (row) => parseIssueData(row).kind ?? '—',
      },
      {
        field: 'code',
        headerName: t('tech.errorLogs.code'),
        width: 180,
        sortable: false,
        valueGetter: (row) => parseIssueData(row).code ?? '—',
      },
      {
        field: 'operation',
        headerName: t('tech.errorLogs.operation'),
        width: 190,
        sortable: false,
        valueGetter: (row) => parseIssueData(row).operation ?? '—',
      },
      {
        field: 'user',
        headerName: t('tech.common.user'),
        width: 165,
        sortable: false,
        cellRenderer: renderUser,
      },
      {
        field: 'message',
        headerName: t('tech.common.message'),
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
