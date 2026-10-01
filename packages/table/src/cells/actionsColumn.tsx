import type { JSX, ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import type { DuncitColumn } from '../types';
import { resolveLabel, type ActionColor, type RowLabel } from './shared';

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
  /** Translation key for the tooltip when the caller names none. */
  fallbackTitleKey: string;
  icon: ReactNode;
  color?: ActionColor;
  config?: RowActionOptions<T>;
  onClick: (row: T) => void;
}

function RowActionButton<T>(props: Readonly<RowActionButtonProps<T>>): JSX.Element {
  const { row, fallbackTitleKey, icon, color, config, onClick } = props;
  const { t } = useTranslation();
  const disabled = config?.disabled?.(row) ?? false;
  const baseTitle = resolveLabel(config?.title, row, t(fallbackTitleKey));
  let title = baseTitle;
  if (disabled && config?.disabledTitle) {
    title = resolveLabel(config.disabledTitle, row, baseTitle);
  }
  return (
    <Tooltip title={title}>
      {/* span keeps the Tooltip working when the button is disabled */}
      <span>
        <DuncitIconButton
          size="small"
          color={config?.color ?? color}
          disabled={disabled}
          onClick={() => onClick(row)}
          aria-label={resolveLabel(config?.ariaLabel, row, title)}
        >
          {config?.icon ?? icon}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}

export interface ActionsColumnOptions<T> {
  field?: string; // default 'actions'
  /** The header. Omit it and the grid renders the shared `Actions` copy. */
  headerName?: string;
  width?: number; // default 110
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  edit?: RowActionOptions<T>;
  delete?: RowActionOptions<T>;
  /** Extra leading actions (e.g. a View button), rendered before Edit. */
  renderExtra?: (row: T) => ReactNode;
}

/** Right-aligned Edit/Delete IconButton actions column — never sorted or filtered. */
export function actionsColumn<T>(options: ActionsColumnOptions<T>): DuncitColumn<T> {
  const {
    field = 'actions',
    headerName,
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
    headerKey: headerName ? undefined : 'shell.common.actions',
    width,
    type: 'actions',
    cellRenderer: (row) => (
      <Stack direction="row" spacing={0.5} component="span" sx={{
        justifyContent: "flex-end"
      }}>
        {renderExtra?.(row)}
        {onEdit && (
          <RowActionButton
            row={row}
            fallbackTitleKey="shell.common.edit"
            icon={<EditIcon fontSize="small" />}
            config={edit}
            onClick={onEdit}
          />
        )}
        {onDelete && (
          <RowActionButton
            row={row}
            fallbackTitleKey="shell.common.delete"
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
