import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch, type TableQuerySnapshot } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ENV_COLOR, envOptions, UserCell } from '../../components/telemetry-identity';
import type { ErrorLogRow } from '../error-logs-page/queries';
import { BOUNDARY_FILTER, parseBoundaryData, surfaceOf } from './boundary-data';

const getRowId = (row: ErrorLogRow) => row.id;

const renderEnvironment = (row: ErrorLogRow) => (
  <Chip size="small" label={row.environment} color={ENV_COLOR[row.environment] ?? 'default'} />
);

const renderMessage = (row: ErrorLogRow) => (
  <Typography variant="body2" noWrap title={row.error?.message ?? ''}>
    {row.error?.message ?? '—'}
  </Typography>
);

const renderUser = (row: ErrorLogRow) => <UserCell user={row.user} />;

const renderWhen = (row: ErrorLogRow) => (
  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
  /** Reports the query WITH the pinned boundary marker, so a delete here stays inside these rows. */
  onQueryChange: (snapshot: TableQuerySnapshot) => void;
  toolbarActions?: ReactNode;
}

/** One row per crash a boundary caught, and one per Report an Issue pressed on it. */
export default function ErrorBoundariesTable({
  fetchRows,
  refetchRef,
  onOpen,
  selection,
  onQueryChange,
  toolbarActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ErrorLogRow>[]>(() => {
    const eventLabel = (event?: string) =>
      event === 'REPORTED' ? t('tech.errorBoundaries.reported') : t('tech.errorBoundaries.caught');
    const scopeLabel = (scope?: string) =>
      scope === 'root' ? t('tech.errorBoundaries.scopeRoot') : t('tech.errorBoundaries.scopePage');
    return [
      { field: 'created_at', headerName: t('tech.common.when'), width: 175, type: 'date', cellRenderer: renderWhen },
      {
        field: 'event',
        headerName: t('tech.errorBoundaries.event'),
        width: 120,
        type: 'enum',
        options: [
          { value: 'CAUGHT', label: t('tech.errorBoundaries.caught') },
          { value: 'REPORTED', label: t('tech.errorBoundaries.reported') },
        ],
        valueGetter: (row) => eventLabel(parseBoundaryData(row).event),
        cellRenderer: (row) => {
          const event = parseBoundaryData(row).event;
          return (
            <Chip
              size="small"
              variant={event === 'REPORTED' ? 'filled' : 'outlined'}
              color={event === 'REPORTED' ? 'warning' : 'error'}
              label={eventLabel(event)}
            />
          );
        },
      },
      {
        field: 'environment',
        headerName: t('tech.common.env'),
        width: 115,
        type: 'enum',
        options: envOptions(t),
        cellRenderer: renderEnvironment,
      },
      { field: 'app', headerName: t('tech.errorBoundaries.surface'), width: 130, type: 'text', sortable: false, valueGetter: surfaceOf },
      { field: 'platform', headerName: t('tech.common.platform'), width: 110, type: 'text' },
      { field: 'page', headerName: t('tech.errorBoundaries.route'), width: 180, type: 'text' },
      {
        field: 'scope',
        headerName: t('tech.errorBoundaries.scope'),
        width: 140,
        type: 'enum',
        options: [
          { value: 'root', label: t('tech.errorBoundaries.scopeRoot') },
          { value: 'page', label: t('tech.errorBoundaries.scopePage') },
        ],
        valueGetter: (row) => scopeLabel(parseBoundaryData(row).scope),
      },
      { field: 'app_version', headerName: t('tech.common.appVersion'), width: 120, type: 'text', valueGetter: (row) => row.client?.app_version ?? '—' },
      { field: 'user', headerName: t('tech.common.user'), width: 165, type: 'text', cellRenderer: renderUser },
      { field: 'message', headerName: t('tech.common.message'), flex: 1, minWidth: 240, type: 'text', cellRenderer: renderMessage },
    ];
  }, [t]);

  return (
    <DuncitTable<ErrorLogRow>
      ariaLabel={t('shell.nav.errorBoundaries')}
      tableId="tech-error-boundaries"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.errorBoundaries.noCrashesYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.errorBoundaries.search')}
      refetchRef={refetchRef}
      onRowClick={onOpen}
      externalFilters={BOUNDARY_FILTER}
      selection={selection}
      onQueryChange={onQueryChange}
      toolbarActions={toolbarActions}
    />
  );
}
