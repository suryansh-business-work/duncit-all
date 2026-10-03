import { useMemo } from 'react';
import { Chip } from '@mui/material';
import { DuncitTable, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { envOptions } from '../../components/telemetry-identity';
import type { ErrorLogRow } from '../error-logs-page/queries';
import {
  getErrorRowId,
  renderEnvironment,
  renderMessage,
  renderUser,
  renderWhen,
  type ErrorLogTableProps,
} from '../error-logs-page/errorLogCells';
import { BOUNDARY_FILTER, parseBoundaryData, surfaceOf } from './boundary-data';

/** A crash the boundary caught, or a Report an Issue pressed on one — told apart by colour. */
function EventChip({ row }: Readonly<{ row: ErrorLogRow }>) {
  const { t } = useTranslation();
  const reported = parseBoundaryData(row).event === 'REPORTED';
  return (
    <Chip
      size="small"
      variant={reported ? 'filled' : 'outlined'}
      color={reported ? 'warning' : 'error'}
      label={reported ? t('tech.errorBoundaries.reported') : t('tech.errorBoundaries.caught')}
    />
  );
}

const renderEvent = (row: ErrorLogRow) => <EventChip row={row} />;

/** One row per crash a boundary caught, and one per Report an Issue pressed on it. */
export default function ErrorBoundariesTable({
  fetchRows,
  refetchRef,
  onOpen,
  selection,
  onQueryChange,
  toolbarActions,
}: Readonly<ErrorLogTableProps>) {
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
        cellRenderer: renderEvent,
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
      getRowId={getErrorRowId}
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
