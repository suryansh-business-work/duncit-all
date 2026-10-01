import Chip from '@mui/material/Chip';
import { fallbackT, useTranslation } from '../i18n';
import type { DuncitColumn } from '../types';

/** The two words an is_active chip shows, resolved outside the React tree. */
function activeChipText(
  active: boolean,
  activeLabel: string | undefined,
  inactiveLabel: string | undefined,
): string {
  if (active) return activeLabel ?? fallbackT('shell.common.active');
  return inactiveLabel ?? fallbackT('shell.common.inactive');
}

/** The chip itself, so the words follow the reader's language. */
function ActiveChip(
  props: Readonly<{
    active: boolean;
    activeLabel?: string;
    inactiveLabel?: string;
    variant: 'filled' | 'outlined';
  }>,
) {
  const { active, activeLabel, inactiveLabel, variant } = props;
  const { t } = useTranslation();
  let label: string;
  if (active) label = activeLabel ?? t('shell.common.active');
  else label = inactiveLabel ?? t('shell.common.inactive');
  return (
    <Chip size="small" color={active ? 'success' : 'default'} label={label} variant={variant} />
  );
}

export interface ActiveChipColumnOptions<T> {
  field?: string; // default 'is_active'
  /** The header. Omit it and the grid renders the shared `Status` copy. */
  headerName?: string;
  width?: number; // default 110
  /** Omit either one and the chip renders the shared `Active` / `Inactive` copy. */
  activeLabel?: string;
  inactiveLabel?: string;
  /** Render the inactive chip with variant "outlined" (challenge-portal style). */
  outlineInactive?: boolean;
  filterable?: boolean; // default true
  /** Reads the flag off the row; defaults to `Boolean(row[field])`. */
  getActive?: (row: T) => boolean;
}

/** is_active status column: success/default Chip + boolean filter + label valueGetter. */
export function activeChipColumn<T>(options: ActiveChipColumnOptions<T> = {}): DuncitColumn<T> {
  const {
    field = 'is_active',
    headerName,
    width = 110,
    activeLabel,
    inactiveLabel,
    outlineInactive = false,
    filterable = true,
    getActive,
  } = options;
  const readActive = getActive ?? ((row: T) => Boolean((row as Record<string, unknown>)[field]));
  const variantOf = (active: boolean): 'filled' | 'outlined' => {
    if (outlineInactive && !active) return 'outlined';
    return 'filled';
  };
  return {
    field,
    headerName,
    headerKey: headerName ? undefined : 'shell.common.status',
    width,
    type: 'boolean',
    filterable,
    cellRenderer: (row) => (
      <ActiveChip
        active={readActive(row)}
        activeLabel={activeLabel}
        inactiveLabel={inactiveLabel}
        variant={variantOf(readActive(row))}
      />
    ),
    // The sort/export value follows the chip, so it needs the same words —
    // resolved through the provider-free translator because a value getter runs
    // outside the React tree.
    valueGetter: (row) => activeChipText(readActive(row), activeLabel, inactiveLabel),
  };
}
