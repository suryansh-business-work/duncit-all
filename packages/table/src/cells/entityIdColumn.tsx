import Typography from '@mui/material/Typography';
import type { DuncitColumn } from '../types';
import { EM_DASH } from './shared';

export interface EntityIdColumnOptions<T> {
  /** Row field holding the id, e.g. 'contract_no'. */
  field: string;
  headerName: string; // e.g. 'Contract ID'
  width?: number; // default 150
  minWidth?: number;
  filterable?: boolean; // default true
  /** Reads the id off the row; defaults to `row[field]`. */
  getId?: (row: T) => string | null | undefined;
}

/**
 * A permanent entity handle (CTR-000001, DOC-000001 …).
 *
 * Monospace and non-wrapping because an id is read character by character when
 * someone quotes it back to you, and an em-dash when a record predates the id —
 * a blank cell there looks like a loading bug rather than a missing value.
 */
export function entityIdColumn<T>(options: EntityIdColumnOptions<T>): DuncitColumn<T> {
  const { field, headerName, width = 150, minWidth, filterable = true, getId } = options;
  const readId =
    getId ?? ((row: T) => (row as Record<string, unknown>)[field] as string | null | undefined);
  const toText = (row: T) => readId(row) || EM_DASH;
  return {
    field,
    headerName,
    width,
    minWidth,
    type: 'text',
    filterable,
    cellRenderer: (row) => (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {toText(row)}
      </Typography>
    ),
    valueGetter: toText,
  };
}
