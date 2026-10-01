import { ambientDateFormat, ambientDateFormatter } from '@duncit/datetime';
import type { DuncitColumn } from '../types';
import { EM_DASH } from './shared';

/**
 * A date cell in the admin's configured pattern, with the shared em-dash empty
 * fallback.
 *
 * The pattern is read at CALL time rather than baked into a column definition:
 * a value getter runs per repaint, so a grid built before the settings landed
 * still ends up rendering them. It used to default to a hardcoded 'd MMM yyyy',
 * which is how a table column and the detail page it opened could show the same
 * date two different ways.
 *
 * Formatting goes through the shared formatter rather than date-fns directly,
 * because that one already refuses to throw: a value getter runs inside the
 * grid's paint, so an unparseable date raised there took the whole page down
 * rather than the one cell holding it. An unreadable value reads as an
 * em-dash, the same as an absent one.
 */
export function formatDateCell(
  iso: string | null | undefined,
  dateFormat: string = ambientDateFormat(),
): string {
  if (!iso) return EM_DASH;
  return ambientDateFormatter().formatPattern(iso, dateFormat) || EM_DASH;
}

export interface DateColumnOptions<T> {
  field?: string; // default 'created_at'
  /** The header. Omit it and the grid renders the shared `Created` copy. */
  headerName?: string;
  hide?: boolean; // default true (the usual hidden created_at column)
  width?: number; // default 130
  flex?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean; // default true
  /** date-fns pattern; defaults to the admin's configured date format. */
  format?: string;
  /** Full custom formatter (e.g. toLocaleDateString); wins over `format`. */
  formatDate?: (date: Date) => string;
  /** Reads the ISO string off the row; defaults to `row[field]`. */
  getDate?: (row: T) => string | null | undefined;
}

/** Date column with em-dash fallback; defaults to the hidden `created_at` column. */
export function dateColumn<T>(options: DateColumnOptions<T> = {}): DuncitColumn<T> {
  const {
    field = 'created_at',
    headerName,
    hide = true,
    width = 130,
    flex,
    minWidth,
    sortable,
    filterable = true,
    format,
    formatDate,
    getDate,
  } = options;
  const readIso =
    getDate ?? ((row: T) => (row as Record<string, unknown>)[field] as string | null | undefined);
  // Resolved inside the getter, not at column-build time — see formatDateCell.
  const toText = (iso: string | null | undefined): string => {
    if (!iso) return EM_DASH;
    if (formatDate) return formatDate(new Date(iso));
    return formatDateCell(iso, format ?? ambientDateFormat());
  };
  return {
    field,
    headerName,
    headerKey: headerName ? undefined : 'shell.common.created',
    hide,
    width,
    flex,
    minWidth,
    sortable,
    type: 'date',
    filterable,
    valueGetter: (row) => toText(readIso(row)),
  };
}
