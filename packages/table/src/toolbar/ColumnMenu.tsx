import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { columnHeader, isColumnHidden } from '../columnDefs';
import { useTranslation } from '../i18n';
import type { DuncitColumn } from '../types';

interface ColumnMenuProps<T> {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  columns: ReadonlyArray<DuncitColumn<T>>;
  hiddenOverrides: Record<string, boolean>;
  toggleColumn: (field: string, currentlyHidden: boolean) => void;
  resetColumns: () => void;
}

/** Checkbox menu to show/hide columns (persisted via useTablePrefs), plus a reset item. */
export function ColumnMenu<T>(props: Readonly<ColumnMenuProps<T>>) {
  const { open, anchorEl, onClose, columns, hiddenOverrides, toggleColumn, resetColumns } = props;
  const { t } = useTranslation();

  const handleReset = () => {
    resetColumns();
    onClose();
  };

  return (
    <Menu open={open} anchorEl={anchorEl} onClose={onClose}>
      {columns.map((column) => {
        const hidden = isColumnHidden(column, hiddenOverrides);
        return (
          <MenuItem key={column.field} dense onClick={() => toggleColumn(column.field, hidden)}>
            <Checkbox size="small" edge="start" disableRipple checked={!hidden} tabIndex={-1} />
            <ListItemText primary={columnHeader(column, t)} />
          </MenuItem>
        );
      })}
      <Divider />
      <MenuItem dense onClick={handleReset}>
        <ListItemText primary={t('shell.table.resetColumns')} />
      </MenuItem>
    </Menu>
  );
}
