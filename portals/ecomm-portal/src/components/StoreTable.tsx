import type { MutableRefObject, ReactNode, RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  DuncitTable,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFilterValue,
} from '@duncit/table';

export interface StoreTableSelection<T> {
  onChange: (rows: T[]) => void;
  clearRef?: RefObject<(() => void) | null>;
}

interface StoreTableProps<T> {
  /** Persistence namespace for the reader's column prefs — unique per table. */
  tableId: string;
  /** A `store*Table(query: TableQueryInput)` document. */
  query: unknown;
  /** The document's root field, e.g. `storeOrdersTable`. */
  resultKey: string;
  columns: ReadonlyArray<DuncitColumn<T>>;
  ariaLabel: string;
  emptyText: string;
  searchPlaceholder: string;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  /** Extra top-level variables the query takes beside `query` (e.g. `abandoned_only`). */
  extraVariables?: Record<string, unknown>;
  externalFilters?: ReadonlyArray<TableFilterValue>;
  onRowClick?: (row: T) => void;
  toolbarActions?: ReactNode;
  refetchRef?: MutableRefObject<(() => void) | null>;
  selection?: StoreTableSelection<T>;
}

const rowId = (row: { id: string }) => row.id;

/**
 * One server-paged store table: the Apollo bridge and the shared grid, so a
 * page only says which query, which columns and what a click opens.
 */
export default function StoreTable<T extends { id: string }>({
  query,
  resultKey,
  extraVariables,
  ...table
}: Readonly<StoreTableProps<T>>) {
  const client = useApolloClient();
  const variablesKey = JSON.stringify(extraVariables ?? {});
  const fetchRows = useApolloTableFetch<T>(client, query, resultKey, { extraVariables }, [variablesKey]);
  return <DuncitTable<T> {...table} fetchRows={fetchRows} getRowId={rowId} />;
}
