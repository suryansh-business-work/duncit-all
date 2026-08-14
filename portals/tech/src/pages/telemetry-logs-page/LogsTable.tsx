import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import {
  DuncitTable,
  type DuncitColumn,
  type TableFetch,
  type TableFilterValue,
} from '@duncit/table';
import { ENV_COLOR, ENV_OPTIONS, UserCell } from '../../components/telemetry-identity';
import { type TelemetryLevel, type TelemetryLogRow } from './queries';

const getRowId = (row: TelemetryLogRow) => row.id;

const renderWhen = (row: TelemetryLogRow) => (
  <Typography variant="body2" color="text.secondary">
    {new Date(row.created_at).toLocaleString()}
  </Typography>
);

const renderEnvironment = (row: TelemetryLogRow) => (
  <Chip size="small" label={row.environment} color={ENV_COLOR[row.environment] ?? 'default'} />
);

const renderUser = (row: TelemetryLogRow) => <UserCell user={row.user} />;

const renderMessage = (row: TelemetryLogRow) => {
  const text = row.error?.message ?? row.component;
  return (
    <Typography variant="body2" noWrap title={text}>
      {text}
    </Typography>
  );
};

interface Props {
  level: TelemetryLevel;
  fetchRows: TableFetch<TelemetryLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: TelemetryLogRow) => void;
  toolbarActions?: ReactNode;
}

/**
 * One level's rows.
 *
 * The level is pinned SERVER-side rather than filtered in the grid, so paging,
 * search and the row count all stay inside the level the tab claims to show —
 * a client-side filter would page through the whole collection and quietly
 * report the wrong total.
 */
export default function LogsTable({
  level,
  fetchRows,
  refetchRef,
  onOpen,
  toolbarActions,
}: Readonly<Props>) {
  const levelFilter = useMemo<readonly TableFilterValue[]>(
    () => [{ field: 'level', op: 'eq', value: level }],
    [level],
  );

  const columns = useMemo<DuncitColumn<TelemetryLogRow>[]>(
    () => [
      { field: 'created_at', headerName: 'When', width: 175, cellRenderer: renderWhen },
      {
        field: 'environment',
        headerName: 'Env',
        width: 110,
        filter: { type: 'select', options: ENV_OPTIONS },
        cellRenderer: renderEnvironment,
      },
      { field: 'source', headerName: 'Source', width: 135, filter: { type: 'text' } },
      { field: 'page', headerName: 'Page', width: 150, filter: { type: 'text' } },
      // Sorting is server-side and allowlisted (LOG_TABLE_CONFIG.sortFields).
      // A column the allowlist does not name must say so: otherwise the header
      // offers a sort the server drops, and AG Grid re-orders the 25 rows on
      // screen while the rest of the set stays in created_at order.
      {
        field: 'component',
        headerName: 'Component',
        width: 160,
        sortable: false,
        filter: { type: 'text' },
      },
      { field: 'user', headerName: 'User', width: 170, cellRenderer: renderUser },
      {
        field: 'user_email',
        headerName: 'Email',
        hide: true,
        width: 210,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (row) => row.user?.email ?? '—',
      },
      {
        field: 'message',
        headerName: 'Message',
        flex: 1,
        minWidth: 240,
        sortable: false,
        cellRenderer: renderMessage,
      },
      {
        field: 'app_version',
        headerName: 'Version',
        hide: true,
        width: 110,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (row) => row.client?.app_version ?? '—',
      },
      // Platform and OS are two allowlisted filters on the server, so they are
      // two columns here. Joining them into one cell would filter `platform`
      // while displaying `native · ios` — a mismatch invisible from the UI.
      {
        field: 'platform',
        headerName: 'Platform',
        hide: true,
        width: 110,
        sortable: false,
        filter: { type: 'text' },
      },
      {
        field: 'os',
        headerName: 'OS',
        hide: true,
        width: 100,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (row) => row.os ?? '—',
      },
      {
        field: 'session_id',
        headerName: 'Session',
        hide: true,
        width: 170,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (row) => row.session_id ?? '—',
      },
      {
        field: 'duid',
        headerName: 'Device',
        hide: true,
        width: 170,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (row) => row.duid ?? '—',
      },
      {
        field: 'ip',
        headerName: 'IP',
        hide: true,
        width: 130,
        sortable: false,
        filter: { type: 'text' },
        valueGetter: (row) => row.ip ?? '—',
      },
    ],
    [],
  );

  return (
    <DuncitTable<TelemetryLogRow>
      tableId={`tech-telemetry-logs-${level}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={`No ${level} logs inside the retention window.`}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search page, component, message or user"
      refetchRef={refetchRef}
      onRowClick={onOpen}
      externalFilters={levelFilter}
      toolbarActions={toolbarActions}
    />
  );
}
