import './agGridSetup';
import { useCallback, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import GlobalStyles from '@mui/material/GlobalStyles';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
import { useTheme } from '@mui/material/styles';
import type { GetRowIdParams, RowClickedEvent, SortChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { buildColDefs, TRUNCATE_CELL_CLASS } from './columnDefs';
import { buildAgTheme } from './theme';
import { DuncitTableToolbar } from './toolbar/DuncitTableToolbar';
import type { DuncitColumn, TableFetch, TableSortDir } from './types';
import { useTablePrefs } from './useTablePrefs';
import { useTableQuery } from './useTableQuery';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const HEADER_HEIGHT = { compact: 36, standard: 48 } as const;
const LOADING_DIM_OPACITY = 0.55;

// Rows auto-size to their content, so multi-line cells never clip. Density is the
// per-cell vertical padding (auto-height measures it): compact = tight, standard =
// roomy. `alignItems: center` keeps content vertically centred within the padding.
const ROW_PAD_Y = { compact: 4, standard: 12 } as const;

// AG Grid's per-cell autoHeight measures real rendered layout; jsdom (the test
// runner) reports none and silently drops rows past the first couple. Keep the
// content-fit rows in real browsers, skip the measurement pass under jsdom.
const IS_JSDOM = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');

// Restore single-line ellipsis for plain-text cells. defaultColDef's `display:flex`
// makes the value span a flex child, which defeats AG Grid's built-in truncation, so
// re-apply it (with min-width:0 so the flex child can shrink) only on plain-text
// columns — custom renderers keep their own multi-line layout.
const TRUNCATE_STYLES = {
  [`.${TRUNCATE_CELL_CLASS} .ag-cell-value`]: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

interface DuncitTableProps<T> {
  tableId: string; // REQUIRED unique key; persistence namespace
  columns: ReadonlyArray<DuncitColumn<T>>;
  fetchRows: TableFetch<T>; // THE server bridge — the only data path
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  toolbarActions?: ReactNode; // right-aligned extras (e.g. "+ Create" button)
  emptyText?: string;
  defaultSort?: { field: string; dir: TableSortDir };
  defaultPageSize?: 10 | 25 | 50 | 100; // default 25
  searchPlaceholder?: string;
  refetchRef?: MutableRefObject<(() => void) | null>; // parent-triggered reload after mutations
}

/** Server-driven table: MUI chrome (toolbar/progress/error/pagination), AG Grid rows only. */
export function DuncitTable<T>(props: Readonly<DuncitTableProps<T>>): JSX.Element {
  const {
    tableId,
    columns,
    fetchRows,
    getRowId,
    onRowClick,
    toolbarActions,
    emptyText,
    defaultSort,
    defaultPageSize,
    searchPlaceholder,
    refetchRef,
  } = props;
  const table = useTableQuery({ fetchRows, defaultSort, defaultPageSize });
  const prefs = useTablePrefs(tableId);
  const muiTheme = useTheme();
  const gridRef = useRef<AgGridReact<T>>(null);
  const { refetch, setSort } = table;
  const { sortBy, sortDir } = table.query;

  const agTheme = useMemo(() => buildAgTheme(muiTheme, prefs.density), [muiTheme, prefs.density]);
  const defaultColDef = useMemo(() => {
    const padY = `${ROW_PAD_Y[prefs.density]}px`;
    return {
      autoHeight: !IS_JSDOM,
      // minWidth/overflow let a cell shrink below its content so nothing bleeds into
      // the neighbouring column; plain-text cells then ellipsize via TRUNCATE_CELL_CLASS.
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        overflow: 'hidden',
        paddingTop: padY,
        paddingBottom: padY,
      },
    };
  }, [prefs.density]);
  const columnDefs = useMemo(
    () => buildColDefs(columns, prefs.hiddenOverrides, sortBy, sortDir),
    [columns, prefs.hiddenOverrides, sortBy, sortDir],
  );

  useEffect(() => {
    if (!refetchRef) return undefined;
    refetchRef.current = refetch;
    return () => {
      refetchRef.current = null;
    };
  }, [refetchRef, refetch]);

  // Defs carry the controlled sort, so the grid echoes our own updates back — only
  // forward header-click changes that actually differ from the current query state.
  const handleSortChanged = useCallback(
    (event: SortChangedEvent<T>) => {
      const sorted = event.api.getColumnState().find((state) => state.sort);
      const nextBy = sorted?.colId ?? null;
      const nextDir: TableSortDir = sorted?.sort === 'desc' ? 'desc' : 'asc';
      if (nextBy === sortBy && (nextBy === null || nextDir === sortDir)) return;
      setSort(nextBy, nextDir);
    },
    [setSort, sortBy, sortDir],
  );

  // Ignore clicks bubbling from buttons/links inside cells so row actions don't double-fire.
  const handleRowClicked = useCallback(
    (event: RowClickedEvent<T>) => {
      if (!onRowClick || !event.data) return;
      const target = event.event?.target;
      if (target instanceof Element && target.closest('button, a')) return;
      onRowClick(event.data);
    },
    [onRowClick],
  );

  const agGetRowId = useCallback((params: GetRowIdParams<T>) => getRowId(params.data), [getRowId]);

  const handleExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: `${tableId}.csv` });
  }, [tableId]);

  const noRowsTemplate = useMemo(
    () => `<span>${escapeHtml(emptyText ?? 'No rows to display')}</span>`,
    [emptyText],
  );
  const gridOpacity = table.loading ? LOADING_DIM_OPACITY : 1;

  return (
    <>
      <GlobalStyles styles={TRUNCATE_STYLES} />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
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
          onExportCsv={handleExportCsv}
          onRefresh={refetch}
        />
      </Box>
      {/* Always rendered so the grid never jumps; visibility flips with loading. */}
      <LinearProgress sx={{ visibility: table.loading ? 'visible' : 'hidden' }} />
      {table.error ? (
        <Alert
          severity="error"
          sx={{ m: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {table.error}
        </Alert>
      ) : (
        <Box sx={{ opacity: gridOpacity, transition: (theme) => theme.transitions.create('opacity') }}>
          <AgGridReact<T>
            ref={gridRef}
            theme={agTheme}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowData={table.rows}
            getRowId={agGetRowId}
            domLayout="autoHeight"
            headerHeight={HEADER_HEIGHT[prefs.density]}
            suppressCellFocus
            enableBrowserTooltips
            overlayNoRowsTemplate={noRowsTemplate}
            onSortChanged={handleSortChanged}
            onRowClicked={handleRowClicked}
          />
        </Box>
      )}
      <TablePagination
        component="div"
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
