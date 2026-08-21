import type { UserChangeLogRow } from '../queries';

/**
 * How the enum columns of the change log read and filter.
 *
 * One list per enum, shared by the filter dropdown and the cell chip, so the
 * label an admin filters by is always the label they just read in the table.
 */

export interface ChangeLogOption {
  value: string;
  label: string;
}

export const ACTION_OPTIONS: ChangeLogOption[] = [
  { value: 'CREATE', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
];

export const ACTOR_OPTIONS: ChangeLogOption[] = [
  { value: 'USER', label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SYSTEM', label: 'System' },
];

export const SOURCE_OPTIONS: ChangeLogOption[] = [
  { value: 'NATIVE', label: 'Native' },
  { value: 'MWEB', label: 'mWeb' },
  { value: 'ADMIN_PORTAL', label: 'Admin Portal' },
  { value: 'PORTAL', label: 'Portal' },
  { value: 'SERVER', label: 'System' },
];

/** The label for a stored enum value, falling back to the raw value. */
export const labelOf = (options: ChangeLogOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export const ACTION_COLORS: Record<UserChangeLogRow['action'], 'success' | 'info' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
};

export const ACTOR_COLORS: Record<UserChangeLogRow['actor_type'], 'primary' | 'warning' | 'default'> = {
  USER: 'primary',
  ADMIN: 'warning',
  SYSTEM: 'default',
};
