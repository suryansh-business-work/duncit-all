import './agGridSetup';
import { JSX, type MutableRefObject, type ReactNode, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ambientDateSettings, subscribeAmbientDateSettings } from '@duncit/datetime';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
import { useTheme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import type {
  GetRowIdParams,
  RowClassParams,
  RowClickedEvent,
  RowSelectionOptions,
  RowStyle,
  SelectionChangedEvent,
  SortChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { buildColDefs, TRUNCATE_CELL_CLASS } from './columnDefs';
import { useTranslation } from './i18n';
import { SelectionCheckbox, SelectionHeaderCheckbox } from './SelectionCheckbox';
import { buildAgTheme } from './theme';
import { DuncitTableToolbar } from './toolbar/DuncitTableToolbar';
import type { DuncitColumn, TableFetch, TableFilterValue, TableSortDir } from './types';
import { useTablePrefs } from './useTablePrefs';
import { useTableQuery } from './useTableQuery';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const HEADER_HEIGHT = { compact: 36, standard: 48 } as const;

/** The id of the checkbox column this table adds — never a data field. */
export const SELECT_COL_ID = 'duncit-select';

/**
 * What a row click must NOT fire from: a cell's own button, link or form
 * control, and the entire selection column — its checkbox is 16px inside a
 * 50px cell, so the cell around it has to be dead to the row handler too.
 *
 * The form controls are listed because an editable cell is not a button: the
 * partners' quantity box opened the product's detail page instead of taking
 * the click. `.MuiInputBase-root` is there because an MUI input's padding and
 * its notched outline are SIBLINGS of the `<input>`, so aiming at the box and
 * landing on its border still bubbled with only `input` in this list.
 */
const ROW_CLICK_IGNORE = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'label',
  '[role="button"]',
  '[role="combobox"]',
  '.MuiInputBase-root',
  '[data-row-click="ignore"]',
  `[col-id="${SELECT_COL_ID}"]`,
].join(', ');
const LOADING_DIM_OPACITY = 0.55;

// AG Grid 34 took `rowSelection="multiple"`, `colDef.checkboxSelection` and
// `headerCheckboxSelection` away; selection is this one object now.
//
// Its own checkboxes are OFF. The portals are MUI everywhere else, AG Grid's
// checkbox sat at the top of a two-line row rather than beside it, and a
// renderer on the column it generates draws BESIDE that checkbox instead of
// replacing it — two ticks per row, one of them not ours.
//
// Hoisted so the reference is stable: a fresh object each render makes the grid
// reconfigure selection mid-interaction. enableClickSelection stays at its
// default false, so a row click only opens whatever drawer the page wires to
// onRowClick; ROW_CLICK_IGNORE keeps the checkbox cell out of that handler.
const MULTI_ROW_SELECTION: RowSelectionOptions = {
  mode: 'multiRow',
  checkboxes: false,
  headerCheckbox: false,
};

// Our own column, prepended when selection is on. AG Grid still owns the STATE —
// the renderer reads node.isSelected() and calls setSelected() — so there is no
// second source of truth to drift, which is what a checkbox held in React state
// would have been.
const SELECT_COLUMN = {
  colId: SELECT_COL_ID,
  headerName: '',
  width: 52,
  minWidth: 52,
  maxWidth: 52,
  resizable: false,
  sortable: false,
  suppressMovable: true,
  lockPosition: true as const,
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerComponent: SelectionHeaderCheckbox,
  cellRenderer: SelectionCheckbox,
};

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

/**
 * Opt-in checkbox multi-select. Selection is PER PAGE and what you get is a MIRROR of
 * the grid, never a running total — see the note on handleSelectionChanged for why an
 * accumulator across pages is a bug rather than a feature.
 */
interface DuncitTableSelection<T> {
  /** The rows ticked right now. Fires with `[]` when a page change wipes them. */
  onChange: (rows: T[]) => void;
  /** Filled with a "clear the ticks" fn, like refetchRef — call it after a bulk action. */
  clearRef?: MutableRefObject<(() => void) | null>;
}

interface DuncitTableProps<T> {
  tableId: string; // REQUIRED unique key; persistence namespace
  columns: ReadonlyArray<DuncitColumn<T>>;
  fetchRows: TableFetch<T>; // THE server bridge — the only data path
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  // Optional per-row inline style (e.g. tint a low-stock row). Backward-compatible.
  getRowStyle?: (row: T) => RowStyle | undefined;
  toolbarActions?: ReactNode; // right-aligned extras (e.g. "+ Create" button)
  emptyText?: string;
  defaultSort?: { field: string; dir: TableSortDir };
  defaultPageSize?: 10 | 25 | 50 | 100; // default 25
  searchPlaceholder?: string;
  refetchRef?: MutableRefObject<(() => void) | null>; // parent-triggered reload after mutations
  /**
   * Filled with a "replace this one row" fn, like refetchRef.
   *
   * The row-level answer to the same problem refetchRef solves: an action whose
   * mutation already returned the updated entity can put it straight into the
   * grid instead of re-asking the server for the whole page. Only that row
   * repaints, so an open menu, the scroll position and the current page all
   * survive. Reach for refetchRef instead when the change could move the row
   * OUT of the current view — that is a membership change, and only the query
   * can answer it.
   */
  updateRowRef?: MutableRefObject<((row: T) => void) | null>;
  // Page-level filters from controls outside the table (tabs/selects/URL params).
  // Compared by value; a change resets to page 1 and refetches. Not shown as chips.
  externalFilters?: ReadonlyArray<TableFilterValue>;
  // Opt in to a checkbox column. Absent means no selection config reaches the grid at
  // all, which is what every table that never asked for it keeps getting.
  selection?: DuncitTableSelection<T>;
}

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
  const muiTheme = useTheme();
  const gridRef = useRef<AgGridReact<T>>(null);
  const { refetch, setSort, updateRow } = table;
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
  const columnDefs = useMemo(() => {
    const defs = buildColDefs(columns, prefs.hiddenOverrides, sortBy, sortDir, t);
    return selection ? [SELECT_COLUMN, ...defs] : defs;
  }, [columns, prefs.hiddenOverrides, sortBy, sortDir, selection, t]);

  useEffect(() => {
    if (!refetchRef) return undefined;
    refetchRef.current = refetch;
    return () => {
      refetchRef.current = null;
    };
  }, [refetchRef, refetch]);

  useEffect(() => {
    if (!updateRowRef) return undefined;
    updateRowRef.current = updateRow;
    return () => {
      updateRowRef.current = null;
    };
  }, [updateRowRef, updateRow]);

  /*
   * Date cells read the admin's pattern inside their value getter, and the
   * settings arrive over the network — a grid that mounted first would keep
   * painting the fallback pattern until something else made it repaint. AG Grid
   * caches getter results, so a React re-render alone is not enough; the cells
   * have to be told.
   */
  const dateSettings = useSyncExternalStore(subscribeAmbientDateSettings, ambientDateSettings);
  useEffect(() => {
    gridRef.current?.api?.refreshCells({ force: true });
  }, [dateSettings]);

  const selectionOnChange = selection?.onChange;
  const selectionClearRef = selection?.clearRef;

  /**
   * Selection is per page, and the parent gets a mirror of the grid.
   *
   * `getRowId` is always set here, so AG Grid runs its immutable update path, and
   * retention is BY ID: on new row data it deletes the nodes whose ids are gone and
   * deselects those, dispatching selectionChanged with source 'rowDataChanged'. A
   * page turn drops the ticks and calls this again — with an empty array when nothing
   * survived. A refetch that returns the same ids keeps them ticked and fires nothing
   * at all, so the objects the parent is holding are the PRE-refetch ones: act on
   * their ids, not on the rest of their fields.
   *
   * The parent must store what it is handed and nothing else. A Set of ids accumulated
   * across pages would claim "47 selected" while the grid holds 25 rows, and would act
   * on rows nobody saw.
   *
   * The header checkbox is not "select all" either. AG Grid's client-side row model
   * only ever holds the rows the server returned for this page, so every SelectAllMode
   * ticks this page. Say so on screen; do not imply otherwise.
   */
  const handleSelectionChanged = useMemo(() => {
    if (!selectionOnChange) return undefined;
    return (event: SelectionChangedEvent<T>) => {
      selectionOnChange(event.api.getSelectedRows());
    };
  }, [selectionOnChange]);

  // Clearing has to happen in the GRID: resetting only the parent's state leaves the
  // checkboxes ticked. deselectAll fires selectionChanged, so the parent's own mirror
  // empties through the handler above rather than needing a second reset.
  const clearSelection = useCallback(() => {
    gridRef.current?.api?.deselectAll();
  }, []);

  useEffect(() => {
    if (!selectionClearRef) return undefined;
    selectionClearRef.current = clearSelection;
    return () => {
      selectionClearRef.current = null;
    };
  }, [selectionClearRef, clearSelection]);

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

  /**
   * Ignore clicks bubbling from buttons/links inside cells so row actions don't
   * double-fire — and from the whole selection cell, not just its checkbox.
   *
   * AG Grid's checkbox stops propagation itself, but it is a 16px input inside a
   * 50px cell. Every other pixel of that cell bubbles, so aiming at the tick box
   * and missing used to open the row's drawer with nothing selected.
   */
  const handleRowClicked = useCallback(
    (event: RowClickedEvent<T>) => {
      if (!onRowClick || !event.data) return;
      const target = event.event?.target;
      if (target instanceof Element && target.closest(ROW_CLICK_IGNORE)) return;
      onRowClick(event.data);
    },
    [onRowClick],
  );

  const agGetRowId = useCallback((params: GetRowIdParams<T>) => getRowId(params.data), [getRowId]);
  const agGetRowStyle = useCallback(
    (params: RowClassParams<T>) => (getRowStyle && params.data ? getRowStyle(params.data) : undefined),
    [getRowStyle]
  );

  const handleExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: `${tableId}.csv` });
  }, [tableId]);

  const noRowsTemplate = useMemo(
    () => `<span>${escapeHtml(emptyText ?? t('shell.table.empty'))}</span>`,
    [emptyText, t],
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
            <DuncitButton color="inherit" size="small" onClick={refetch}>
              Retry
            </DuncitButton>
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
            getRowStyle={agGetRowStyle}
            rowSelection={selection ? MULTI_ROW_SELECTION : undefined}
            domLayout="autoHeight"
            headerHeight={HEADER_HEIGHT[prefs.density]}
            suppressCellFocus
            enableBrowserTooltips
            overlayNoRowsTemplate={noRowsTemplate}
            onSortChanged={handleSortChanged}
            onRowClicked={handleRowClicked}
            onSelectionChanged={handleSelectionChanged}
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
