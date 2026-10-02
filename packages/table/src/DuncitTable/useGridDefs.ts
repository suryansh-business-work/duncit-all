import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { buildColDefs } from '../columnDefs';
import type { Translate } from '../i18n';
import { buildAgTheme } from '../theme';
import type { DuncitColumn, TableSortDir } from '../types';
import type { UseTablePrefsResult } from '../useTablePrefs';
import { IS_JSDOM, ROW_PAD_Y, SELECT_COLUMN } from './constants';

interface GridDefOptions<T> {
  columns: ReadonlyArray<DuncitColumn<T>>;
  prefs: UseTablePrefsResult;
  sortBy: string | null;
  sortDir: TableSortDir;
  selectable: boolean;
  t: Translate;
}

/** The grid's theme, its default column and its column set, each rebuilt only when its inputs change. */
export function useGridDefs<T>({ columns, prefs, sortBy, sortDir, selectable, t }: GridDefOptions<T>) {
  const muiTheme = useTheme();
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
    return selectable ? [SELECT_COLUMN, ...defs] : defs;
  }, [columns, prefs.hiddenOverrides, sortBy, sortDir, selectable, t]);

  return { agTheme, defaultColDef, columnDefs };
}
