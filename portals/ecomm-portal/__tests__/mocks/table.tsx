/**
 * '@duncit/table' without the grid. The id cell is the package's REAL
 * LabeledIds, imported by path, so the store column is tested against the
 * cell it actually ships with; only the grid-bound helpers are stand-ins.
 */
export { LabeledIds, labeledIdsText, type LabeledId } from '../../../../packages/table/src/cells/labeledIds';
export { EM_DASH } from '../../../../packages/table/src/cells/shared';

export interface DuncitColumn<T> {
  field: string;
  headerName?: string;
  cellRenderer?: (row: T) => unknown;
  valueGetter?: (row: T) => unknown;
  [key: string]: unknown;
}

export const dateColumn = <T,>(opts: Partial<DuncitColumn<T>>): DuncitColumn<T> => ({
  field: 'created_at',
  ...opts,
});
