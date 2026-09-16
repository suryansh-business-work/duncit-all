import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import {
  DuncitTable,
  type DuncitColumn,
  type TableFetch,
  type TableQuerySnapshot,
} from '@duncit/table';
import { ENV_COLOR, envOptions, UserCell } from '../../components/telemetry-identity';
import { ERROR_MODULE_FILTER, parseIssueData, type ErrorLogRow } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

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

/** The chip shows the kind itself, so the filter lists the same raw values. */
const KIND_OPTIONS = Object.keys(KIND_COLOR).map((kind) => ({ value: kind, label: kind }));

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
  <Typography variant="body2" sx={{
    color: "text.secondary"
  }}>
    {formatDateTime(row.created_at)}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<ErrorLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: ErrorLogRow) => void;
  /** DuncitTable's checkbox column, for the bulk delete above the table. */
  selection: {
    onChange: (rows: ErrorLogRow[]) => void;
    clearRef: MutableRefObject<(() => void) | null>;
  };
  /**
   * Reports the query behind the rows — WITH the pinned error-module marker, so
   * a delete from this page can never reach a log the module never wrote.
   */
  onQueryChange: (snapshot: TableQuerySnapshot) => void;
  toolbarActions?: ReactNode;
}

export default function ErrorLogsTable({
  fetchRows,
  refetchRef,
  onOpen,
  selection,
  onQueryChange,
  toolbarActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ErrorLogRow>[]>(
    () => [
      { field: 'created_at', headerName: t('tech.common.when'), width: 175, type: 'date', cellRenderer: renderWhen },
      {
        field: 'environment',
        headerName: t('tech.common.env'),
        width: 115,
        type: 'enum',
        options: envOptions(t),
        cellRenderer: renderEnvironment,
      },
      { field: 'source', headerName: t('tech.common.source'), width: 130, type: 'text' },
      { field: 'page', headerName: t('tech.common.page'), width: 140, type: 'text' },
      // kind / code / operation live in the log's data blob; the server maps
      // each to its stored `data.*` path.
      {
        field: 'kind',
        headerName: t('tech.errorLogs.kind'),
        width: 120,
        type: 'enum',
        options: KIND_OPTIONS,
        cellRenderer: renderKind,
        valueGetter: (row) => parseIssueData(row).kind ?? '—',
      },
      {
        field: 'code',
        headerName: t('tech.errorLogs.code'),
        width: 180,
        type: 'text',
        valueGetter: (row) => parseIssueData(row).code ?? '—',
      },
      {
        field: 'operation',
        headerName: t('tech.errorLogs.operation'),
        width: 190,
        type: 'text',
        valueGetter: (row) => parseIssueData(row).operation ?? '—',
      },
      {
        field: 'user',
        headerName: t('tech.common.user'),
        width: 165,
        type: 'text',
        cellRenderer: renderUser,
      },
      {
        field: 'message',
        headerName: t('tech.common.message'),
        flex: 1,
        minWidth: 240,
        type: 'text',
        cellRenderer: renderMessage,
      },
    ],
    []
  );

  return (
    <DuncitTable<ErrorLogRow>
      ariaLabel={t('shell.nav.errorLogs')}
      tableId="tech-error-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.errorLogs.noServerOperationErrorsLoggedYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search page, source or message"
      refetchRef={refetchRef}
      onRowClick={onOpen}
      externalFilters={ERROR_MODULE_FILTER}
      selection={selection}
      onQueryChange={onQueryChange}
      toolbarActions={toolbarActions}
    />
  );
}
