import '../agGridSetup';
import { JSX, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
import { AgGridReact } from 'ag-grid-react';
import { TableHeaderContext } from '../header/headerState';
import { useTranslation } from '../i18n';
import { useBulkDelete } from '../bulk/useBulkDelete';
import { useGridSelection } from '../useGridSelection';
import { useTablePrefs } from '../useTablePrefs';
import { useTableQuery } from '../useTableQuery';
import {
  HEADER_HEIGHT,
  LOADING_DIM_OPACITY,
  MULTI_ROW_SELECTION,
  PAGE_SIZE_OPTIONS,
  TRUNCATE_STYLES,
  escapeHtml,
} from './constants';
import { TableErrorAlert } from './TableErrorAlert';
import { TableToolbarArea } from './TableToolbarArea';
import type { DuncitTableProps } from './types';
import { useGridDefs } from './useGridDefs';
import { useGridHandlers } from './useGridHandlers';
import { useTableBridges } from './useTableBridges';

export { SELECT_COL_ID } from './constants';

/** Server-driven table: MUI chrome (toolbar/progress/error/pagination), AG Grid rows only. */
export function DuncitTable<T>(props: Readonly<DuncitTableProps<T>>): JSX.Element {
  const {
    tableId,
    columns,
    fetchRows,
    getRowId,
    onRowClick,
    getRowStyle,
    toolbarActions,
    emptyText,
    defaultSort,
    defaultPageSize,
    searchPlaceholder,
    refetchRef,
    updateRowRef,
    externalFilters,
    selection,
    onQueryChange,
    ariaLabel,
  } = props;
  const { t } = useTranslation();
  const table = useTableQuery({
    fetchRows,
    defaultSort,
    defaultPageSize,
    externalFilters,
    getRowId,
  });
  const prefs = useTablePrefs(tableId);
  const gridRef = useRef<AgGridReact<T>>(null);
  const { refetch, setSort, updateRow, setFilters, appliedQuery, total } = table;
  const { sortBy, sortDir, filters } = table.query;
  const headerState = useMemo(
    () => ({ sortBy, sortDir, filters, setFilters }),
    [sortBy, sortDir, filters, setFilters],
  );
  const bulk = useBulkDelete(fetchRows, refetch);
  const { selectable, selectedIds, handleSelectionChanged, clearSelection } = useGridSelection({
    gridRef,
    selection,
    bulk: bulk !== null,
    getRowId,
  });
  const { agTheme, defaultColDef, columnDefs } = useGridDefs({
    columns,
    prefs,
    sortBy,
    sortDir,
    selectable,
    t,
  });
  useTableBridges({
    gridRef,
    refetchRef,
    refetch,
    updateRowRef,
    updateRow,
    onQueryChange,
    appliedQuery,
    total,
  });
  const handlers = useGridHandlers({
    tableId,
    getRowId,
    onRowClick,
    getRowStyle,
    ariaLabel,
    sortBy,
    sortDir,
    setSort,
  });

  const noRowsTemplate = useMemo(
    // A custom template is one AG Grid does not announce itself, so the text
    // carries its own polite live region (WCAG 4.1.3).
    () => `<span role="status">${escapeHtml(emptyText ?? t('shell.table.empty'))}</span>`,
    [emptyText, t],
  );
  const gridOpacity = table.loading ? LOADING_DIM_OPACITY : 1;
  // Dead as well as dimmed. The rows on screen still belong to the query being
  // replaced, so a header sort or a row click on them would act on a view that is
  // already gone — the same reason the toolbar and the pager switch off below.
  const gridPointerEvents = table.loading ? 'none' : undefined;

  return (
    <>
      <GlobalStyles styles={TRUNCATE_STYLES} />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableToolbarArea
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        table={table}
        prefs={prefs}
        bulk={bulk}
        selectedIds={selectedIds}
        clearSelection={clearSelection}
        toolbarActions={toolbarActions}
        searchPlaceholder={searchPlaceholder}
        ariaLabel={ariaLabel}
      />
      {/* Always rendered so the grid never jumps; visibility flips with loading. */}
      <LinearProgress sx={{ visibility: table.loading ? 'visible' : 'hidden' }} />
      {table.error ? (
        <TableErrorAlert error={table.error} onRetry={refetch} />
      ) : (
        <Box
          aria-busy={table.loading}
          data-testid="duncit-table-grid"
          sx={{
            opacity: gridOpacity,
            pointerEvents: gridPointerEvents,
            transition: (theme) => theme.transitions.create('opacity'),
          }}
        >
          <TableHeaderContext.Provider value={headerState}>
          <AgGridReact<T>
            ref={gridRef}
            theme={agTheme}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowData={table.rows}
            getRowId={handlers.agGetRowId}
            getRowStyle={handlers.agGetRowStyle}
            processRowPostCreate={handlers.handleRowPostCreate}
            rowSelection={selectable ? MULTI_ROW_SELECTION : undefined}
            domLayout="autoHeight"
            headerHeight={HEADER_HEIGHT[prefs.density]}
            // Cells only take focus where there is something to do with it:
            // opening the row. A read-only grid stays out of the tab order.
            suppressCellFocus={!onRowClick}
            enableBrowserTooltips
            overlayNoRowsTemplate={noRowsTemplate}
            onGridReady={handlers.handleGridReady}
            onSortChanged={handlers.handleSortChanged}
            onRowClicked={handlers.handleRowClicked}
            onCellKeyDown={handlers.handleCellKeyDown}
            onSelectionChanged={handleSelectionChanged}
          />
          </TableHeaderContext.Provider>
        </Box>
      )}
      <TablePagination
        component="div"
        disabled={table.loading}
        count={table.total}
        page={table.query.page - 1}
        onPageChange={(_event, nextPage) => table.setPage(nextPage + 1)}
        rowsPerPage={table.query.pageSize}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        onRowsPerPageChange={(event) => table.setPageSize(Number(event.target.value))}
      />
      </Paper>
    </>
  );
}
