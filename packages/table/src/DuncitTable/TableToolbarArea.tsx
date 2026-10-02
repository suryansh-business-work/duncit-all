import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { TableBulkDelete } from '../bulk/TableBulkDelete';
import { TableChangeLog } from '../changeLog/TableChangeLog';
import type { BulkDeleteBinding } from '../bulk/useBulkDelete';
import { DuncitTableToolbar } from '../toolbar/DuncitTableToolbar';
import { TableDataActions } from '../toolbar/TableDataActions';
import type { DuncitColumn, TableFetch } from '../types';
import type { UseTablePrefsResult } from '../useTablePrefs';
import type { UseTableQueryResult } from '../useTableQuery';

interface TableToolbarAreaProps<T> {
  tableId: string;
  columns: ReadonlyArray<DuncitColumn<T>>;
  fetchRows: TableFetch<T>;
  table: UseTableQueryResult<T>;
  prefs: UseTablePrefsResult;
  bulk: BulkDeleteBinding | null;
  selectedIds: readonly string[];
  clearSelection: () => void;
  toolbarActions?: ReactNode;
  searchPlaceholder?: string;
  ariaLabel?: string;
}

/** The strip above the grid: search, filters, columns, density and the data actions. */
export function TableToolbarArea<T>(props: Readonly<TableToolbarAreaProps<T>>) {
  const {
    tableId,
    columns,
    fetchRows,
    table,
    prefs,
    bulk,
    selectedIds,
    clearSelection,
    toolbarActions,
    searchPlaceholder,
    ariaLabel,
  } = props;
  const { appliedQuery, total, refetch } = table;

  return (
    <Box sx={{ p: 1.5 }}>
      <DuncitTableToolbar
        columns={columns}
        searchInput={table.searchInput}
        setSearchInput={table.setSearchInput}
        searchPlaceholder={searchPlaceholder}
        filters={table.query.filters}
        setFilters={table.setFilters}
        toolbarActions={toolbarActions}
        hiddenOverrides={prefs.hiddenOverrides}
        toggleColumn={prefs.toggleColumn}
        resetColumns={prefs.resetColumns}
        density={prefs.density}
        toggleDensity={prefs.toggleDensity}
        dataActions={
          <>
            {bulk && (
              <TableBulkDelete
                binding={bulk}
                query={appliedQuery}
                total={total}
                selectedIds={selectedIds}
                loading={table.loading}
                label={ariaLabel}
                onStarted={clearSelection}
              />
            )}
            <TableChangeLog
              tableId={tableId}
              fetchRows={fetchRows}
              query={appliedQuery}
              loading={table.loading}
              label={ariaLabel}
            />
            <TableDataActions
              tableId={tableId}
              columns={columns}
              hiddenOverrides={prefs.hiddenOverrides}
              fetchRows={fetchRows}
              query={appliedQuery}
              rows={table.rows}
              total={total}
              loading={table.loading}
            />
          </>
        }
        onRefresh={refetch}
        loading={table.loading}
      />
    </Box>
  );
}
