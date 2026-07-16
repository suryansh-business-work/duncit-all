import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format as formatWithDateFns } from 'date-fns';
import type { DuncitColumn } from './types';

export const EM_DASH = '—';
export const DEFAULT_DATE_FORMAT = 'd MMM yyyy';

type RowLabel<T> = string | ((row: T) => string);
type ActionColor =
  | 'inherit'
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

function resolveLabel<T>(label: RowLabel<T> | undefined, row: T, fallback: string): string {
  if (typeof label === 'function') return label(row);
  return label ?? fallback;
}

/** date-fns formatted date string with the shared em-dash empty fallback. */
export function formatDateCell(
  iso: string | null | undefined,
  dateFormat: string = DEFAULT_DATE_FORMAT,
): string {
  return iso ? formatWithDateFns(new Date(iso), dateFormat) : EM_DASH;
}

export interface DateColumnOptions<T> {
  field?: string; // default 'created_at'
  headerName?: string; // default 'Created'
  hide?: boolean; // default true (the usual hidden created_at column)
  width?: number; // default 130
  flex?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean; // default true -> { type: 'date' }
  format?: string; // date-fns pattern, default 'd MMM yyyy'
  /** Full custom formatter (e.g. toLocaleDateString); wins over `format`. */
  formatDate?: (date: Date) => string;
  /** Reads the ISO string off the row; defaults to `row[field]`. */
  getDate?: (row: T) => string | null | undefined;
}

/** Date column with em-dash fallback; defaults to the hidden `created_at` column. */
export function dateColumn<T>(options: DateColumnOptions<T> = {}): DuncitColumn<T> {
  const {
    field = 'created_at',
    headerName = 'Created',
    hide = true,
    width = 130,
    flex,
    minWidth,
    sortable,
    filterable = true,
    format = DEFAULT_DATE_FORMAT,
    formatDate,
    getDate,
  } = options;
  const readIso =
    getDate ?? ((row: T) => (row as Record<string, unknown>)[field] as string | null | undefined);
  const toText = (iso: string | null | undefined): string => {
    if (!iso) return EM_DASH;
    if (formatDate) return formatDate(new Date(iso));
    return formatDateCell(iso, format);
  };
  return {
    field,
    headerName,
    hide,
    width,
    flex,
    minWidth,
    sortable,
    filter: filterable ? { type: 'date' } : undefined,
    valueGetter: (row) => toText(readIso(row)),
  };
}

export interface ActiveChipColumnOptions<T> {
  field?: string; // default 'is_active'
  headerName?: string; // default 'Status'
  width?: number; // default 110
  activeLabel?: string; // default 'Active'
  inactiveLabel?: string; // default 'Inactive'
  /** Render the inactive chip with variant "outlined" (challenge-portal style). */
  outlineInactive?: boolean;
  filterable?: boolean; // default true -> { type: 'boolean' }
  /** Reads the flag off the row; defaults to `Boolean(row[field])`. */
  getActive?: (row: T) => boolean;
}

/** is_active status column: success/default Chip + boolean filter + label valueGetter. */
export function activeChipColumn<T>(options: ActiveChipColumnOptions<T> = {}): DuncitColumn<T> {
  const {
    field = 'is_active',
    headerName = 'Status',
    width = 110,
    activeLabel = 'Active',
    inactiveLabel = 'Inactive',
    outlineInactive = false,
    filterable = true,
    getActive,
  } = options;
  const readActive = getActive ?? ((row: T) => Boolean((row as Record<string, unknown>)[field]));
  const labelOf = (active: boolean) => (active ? activeLabel : inactiveLabel);
  const variantOf = (active: boolean): 'filled' | 'outlined' => {
    if (outlineInactive && !active) return 'outlined';
    return 'filled';
  };
  return {
    field,
    headerName,
    width,
    filter: filterable ? { type: 'boolean' } : undefined,
    cellRenderer: (row) => {
      const active = readActive(row);
      return (
        <Chip
          size="small"
          color={active ? 'success' : 'default'}
          label={labelOf(active)}
          variant={variantOf(active)}
        />
      );
    },
    valueGetter: (row) => labelOf(readActive(row)),
  };
}

export interface RowActionOptions<T> {
  /** Tooltip text; default 'Edit' / 'Delete'. */
  title?: RowLabel<T>;
  /** aria-label; defaults to the resolved title. */
  ariaLabel?: RowLabel<T>;
  color?: ActionColor;
  icon?: ReactNode;
  disabled?: (row: T) => boolean;
  /** Tooltip shown while disabled (e.g. 'System (locked)'). */
  disabledTitle?: RowLabel<T>;
}

interface RowActionButtonProps<T> {
  row: T;
  fallbackTitle: string;
  icon: ReactNode;
  color?: ActionColor;
  config?: RowActionOptions<T>;
  onClick: (row: T) => void;
}

function RowActionButton<T>(props: Readonly<RowActionButtonProps<T>>): JSX.Element {
  const { row, fallbackTitle, icon, color, config, onClick } = props;
  const disabled = config?.disabled?.(row) ?? false;
  const baseTitle = resolveLabel(config?.title, row, fallbackTitle);
  let title = baseTitle;
  if (disabled && config?.disabledTitle) {
    title = resolveLabel(config.disabledTitle, row, baseTitle);
  }
  return (
    <Tooltip title={title}>
      {/* span keeps the Tooltip working when the button is disabled */}
      <span>
        <IconButton
          size="small"
          color={config?.color ?? color}
          disabled={disabled}
          onClick={() => onClick(row)}
          aria-label={resolveLabel(config?.ariaLabel, row, title)}
        >
          {config?.icon ?? icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export interface ActionsColumnOptions<T> {
  field?: string; // default 'actions'
  headerName?: string; // default 'Actions'
  width?: number; // default 110
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  edit?: RowActionOptions<T>;
  delete?: RowActionOptions<T>;
  /** Extra leading actions (e.g. a View button), rendered before Edit. */
  renderExtra?: (row: T) => ReactNode;
}

/** Right-aligned Edit/Delete IconButton actions column (sortable: false). */
export function actionsColumn<T>(options: ActionsColumnOptions<T>): DuncitColumn<T> {
  const {
    field = 'actions',
    headerName = 'Actions',
    width = 110,
    onEdit,
    onDelete,
    edit,
    delete: deleteConfig,
    renderExtra,
  } = options;
  return {
    field,
    headerName,
    width,
    sortable: false,
    cellRenderer: (row) => (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" component="span">
        {renderExtra?.(row)}
        {onEdit && (
          <RowActionButton
            row={row}
            fallbackTitle="Edit"
            icon={<EditIcon fontSize="small" />}
            config={edit}
            onClick={onEdit}
          />
        )}
        {onDelete && (
          <RowActionButton
            row={row}
            fallbackTitle="Delete"
            icon={<DeleteIcon fontSize="small" />}
            color="error"
            config={deleteConfig}
            onClick={onDelete}
          />
        )}
      </Stack>
    ),
  };
}
