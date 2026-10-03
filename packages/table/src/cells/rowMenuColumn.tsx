import { useState, type JSX, type ReactNode } from 'react';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import type { DuncitColumn } from '../types';
import { resolveLabel, type RowLabel } from './shared';

/** One entry in a row's menu. */
export interface RowMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Painted in the error colour — Delete, Deactivate. */
  destructive?: boolean;
}

export interface RowMenuColumnOptions<T> {
  field?: string; // default 'menu'
  /** The header. Omit it and the grid renders the shared `Actions` copy. */
  headerName?: string;
  width?: number; // default 64
  /** The menu button's accessible name, e.g. (row) => `Options for ${row.name}`. Default `Actions`. */
  ariaLabel?: RowLabel<T>;
  /** The entries for one row; an empty list renders no button. */
  items: (row: T) => RowMenuItem[];
}

interface RowActionsMenuProps {
  label: string;
  items: RowMenuItem[];
  testId: string;
}

/**
 * A kebab button opening the row's actions. The grid ignores clicks that start
 * on a button and the menu renders in a portal outside the grid, so choosing an
 * item never also opens the row.
 */
function RowActionsMenu({ label, items, testId }: Readonly<RowActionsMenuProps>): JSX.Element | null {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (items.length === 0) return null;
  const close = () => setAnchor(null);
  return (
    <>
      <DuncitIconButton
        size="small"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : 'false'}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid={testId}
      >
        <MoreVertIcon fontSize="small" />
      </DuncitIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {items.map((item) => (
          <MenuItem
            key={item.key}
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onClick();
            }}
            sx={item.destructive ? { color: 'error.main' } : undefined}
            data-testid={`${testId}-${item.key}`}
          >
            {item.icon && <ListItemIcon sx={item.destructive ? { color: 'error.main' } : undefined}>{item.icon}</ListItemIcon>}
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function RowMenuCell<T>({ row, options }: Readonly<{ row: T; options: RowMenuColumnOptions<T> }>): JSX.Element | null {
  const { t } = useTranslation();
  const label = resolveLabel(options.ariaLabel, row, t('shell.common.actions'));
  return <RowActionsMenu label={label} items={options.items(row)} testId="row-actions-menu" />;
}

/** A right-aligned kebab menu column — for rows with more actions than fit as icons. Never sorted or filtered. */
export function rowMenuColumn<T>(options: RowMenuColumnOptions<T>): DuncitColumn<T> {
  const { field = 'menu', headerName, width = 64 } = options;
  return {
    field,
    headerName,
    headerKey: headerName ? undefined : 'shell.common.actions',
    width,
    type: 'actions',
    cellRenderer: (row) => <RowMenuCell row={row} options={options} />,
  };
}
