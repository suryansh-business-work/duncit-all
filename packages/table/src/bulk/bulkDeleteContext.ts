import { createContext, useContext } from 'react';

/** SELECTED deletes the ticked rows; ALL every row matching the current view. */
export type BulkDeleteMode = 'SELECTED' | 'ALL';

/** What a table hands over when someone asks it to delete rows. */
export interface BulkDeleteRequest {
  /** The `<name>Table` query behind the grid. */
  table: string;
  mode: BulkDeleteMode;
  /** That query's variables for the view on screen — pinned filters included. */
  variables: Record<string, unknown>;
  /** SELECTED only: the ticked row ids. */
  ids: string[];
  /** What the person was looking at, for the progress drawer. */
  label: string;
  /** The page it was started from. */
  url: string;
}

/**
 * The server-side bulk delete, as a table sees it.
 *
 * The table does not run the delete: it names the rows and hands them over, and
 * the console's shell owns the job — its progress lives in the header, and it
 * keeps going after the page that started it is gone. The shell provides this;
 * a grid rendered without it shows no delete controls at all.
 */
export interface TableBulkDeleteApi {
  /** The `<name>Table` queries the signed-in person may bulk delete from. */
  tables: ReadonlySet<string>;
  /** Start a job. Resolves true once the server accepted it. */
  start: (request: BulkDeleteRequest) => Promise<boolean>;
  /** Called when a job on `table` stops running. Returns the unsubscribe. */
  onSettled: (table: string, listener: () => void) => () => void;
}

const TableBulkDeleteContext = createContext<TableBulkDeleteApi | null>(null);

export const TableBulkDeleteProvider = TableBulkDeleteContext.Provider;

export function useTableBulkDeleteApi(): TableBulkDeleteApi | null {
  return useContext(TableBulkDeleteContext);
}
