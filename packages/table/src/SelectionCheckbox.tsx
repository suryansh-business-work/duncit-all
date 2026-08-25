import { useEffect, useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import type { CustomCellRendererProps, CustomHeaderProps } from 'ag-grid-react';
import { useTranslation } from './i18n';

/**
 * The selection column drawn in MUI, like the rest of this table's chrome.
 *
 * AG Grid still owns the selection — these read `node.isSelected()` and call
 * `setSelected()`, and re-render off the grid's own events. Holding the tick in
 * React state instead would put two sources of truth against each other, and the
 * grid's would win on every page change.
 */
export function SelectionCheckbox({ node }: Readonly<CustomCellRendererProps>) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => node.isSelected() ?? false);

  useEffect(() => {
    const sync = () => setChecked(node.isSelected() ?? false);
    node.addEventListener('rowSelected', sync);
    sync();
    return () => node.removeEventListener('rowSelected', sync);
  }, [node]);

  return (
    <Checkbox
      size="small"
      checked={checked}
      onChange={(event) => node.setSelected(event.target.checked)}
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
