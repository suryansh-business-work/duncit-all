import type { RowSelectionOptions } from 'ag-grid-community';
import { TRUNCATE_CELL_CLASS } from '../columnDefs';
import { SelectionCheckbox, SelectionHeaderCheckbox } from '../SelectionCheckbox';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const HEADER_HEIGHT = { compact: 36, standard: 48 } as const;

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
export const ROW_CLICK_IGNORE = [
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
export const LOADING_DIM_OPACITY = 0.55;

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
export const MULTI_ROW_SELECTION: RowSelectionOptions = {
  mode: 'multiRow',
  checkboxes: false,
  headerCheckbox: false,
};

// Our own column, prepended when selection is on. AG Grid still owns the STATE —
// the renderer reads node.isSelected() and calls setSelected() — so there is no
// second source of truth to drift, which is what a checkbox held in React state
// would have been.
export const SELECT_COLUMN = {
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
export const ROW_PAD_Y = { compact: 4, standard: 12 } as const;

// AG Grid's per-cell autoHeight measures real rendered layout; jsdom (the test
// runner) reports none and silently drops rows past the first couple. Keep the
// content-fit rows in real browsers, skip the measurement pass under jsdom.
export const IS_JSDOM = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');

// Restore single-line ellipsis for plain-text cells. defaultColDef's `display:flex`
// makes the value span a flex child, which defeats AG Grid's built-in truncation, so
// re-apply it (with min-width:0 so the flex child can shrink) only on plain-text
// columns — custom renderers keep their own multi-line layout.
export const TRUNCATE_STYLES = {
  [`.${TRUNCATE_CELL_CLASS} .ag-cell-value`]: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
