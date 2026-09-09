import { useEffect, useState, type ChangeEvent } from 'react';
import Checkbox from '@mui/material/Checkbox';
import type { GridApi } from 'ag-grid-community';
import type { CustomCellRendererProps, CustomHeaderProps } from 'ag-grid-react';
import { useTranslation } from './i18n';

/**
 * The row a shift-click ranges FROM: the last row ticked without shift.
 *
 * Kept per grid rather than in React state because the anchor outlives every
 * checkbox that reads it — a cell renderer is unmounted and rebuilt as rows
 * scroll and repaint, and an anchor held inside one would be gone by the time
 * the second click of the range arrives. Weak, so a destroyed grid takes its
 * anchor with it.
 */
const rangeAnchor = new WeakMap<GridApi, number>();

/**
 * React maps a checkbox's `onChange` onto the native CLICK, so the modifier
 * keys of the gesture are right there on the native event. Guarded rather than
 * asserted: a change fired by anything but a pointer (a test, a keyboard) has
 * no modifiers, and that correctly reads as a plain single tick.
 */
function isShiftClick(event: ChangeEvent<HTMLInputElement>): boolean {
  return event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey;
}

/**
 * The selection column drawn in MUI, like the rest of this table's chrome.
 *
 * AG Grid still owns the selection — these read `node.isSelected()` and call
 * `setSelected()`, and re-render off the grid's own events. Holding the tick in
 * React state instead would put two sources of truth against each other, and the
 * grid's would win on every page change.
 */
export function SelectionCheckbox({ node, api }: Readonly<CustomCellRendererProps>) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => node.isSelected() ?? false);

  useEffect(() => {
    const sync = () => setChecked(node.isSelected() ?? false);
    node.addEventListener('rowSelected', sync);
    sync();
    return () => node.removeEventListener('rowSelected', sync);
  }, [node]);

  /**
   * Plain click ticks this row and becomes the anchor; shift-click applies the
   * SAME new value to every row between the anchor and here — the file-manager
   * gesture, so ticking 40 of 100 rows is two clicks rather than forty.
   *
   * The anchor moves either way. Leaving it pinned after a range would make a
   * second shift-click re-sweep from the original row, silently un-ticking rows
   * the first range had just taken.
   */
  const apply = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    const here = node.rowIndex;
    const anchor = here === null ? undefined : rangeAnchor.get(api);
    if (isShiftClick(event) && anchor !== undefined && here !== null) {
      const low = Math.min(anchor, here);
      const high = Math.max(anchor, here);
      api.forEachNode((row) => {
        if (row.rowIndex !== null && row.rowIndex >= low && row.rowIndex <= high)
          row.setSelected(next);
      });
    } else {
      node.setSelected(next);
    }
    if (here !== null) rangeAnchor.set(api, here);
  };

  return (
    <Checkbox
      size="small"
      checked={checked}
      onChange={apply}
      sx={{ p: 0.5 }}
      slotProps={{
        input: { 'aria-label': t('shell.table.selectRow') }
      }}
    />
  );
}

/**
 * Ticks every row ON THIS PAGE — the client-side model holds nothing else, so
 * calling it "select all" would promise rows the grid has never seen.
 */
export function SelectionHeaderCheckbox({ api }: Readonly<CustomHeaderProps>) {
  const { t } = useTranslation();
  const [state, setState] = useState({ selected: 0, total: 0 });

  useEffect(() => {
    const sync = () => {
      let total = 0;
      api.forEachNode(() => {
        total += 1;
      });
      setState({ selected: api.getSelectedNodes().length, total });
    };
    api.addEventListener('selectionChanged', sync);
    api.addEventListener('modelUpdated', sync);
    sync();
    return () => {
      // The header outlives the grid on unmount, and AG Grid warns loudly about
      // any api call after it is destroyed.
      if (api.isDestroyed()) return;
      api.removeEventListener('selectionChanged', sync);
      api.removeEventListener('modelUpdated', sync);
    };
  }, [api]);

  const all = state.total > 0 && state.selected === state.total;
  return (
    <Checkbox
      size="small"
      checked={all}
      indeterminate={state.selected > 0 && !all}
      disabled={state.total === 0}
      onChange={(event) => {
        if (event.target.checked) api.selectAll();
        else api.deselectAll();
      }}
      sx={{ p: 0.5 }}
      slotProps={{
        input: { 'aria-label': t('shell.table.selectAllRows') }
      }}
    />
  );
}
