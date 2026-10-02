import { createContext, useContext } from 'react';
import type { TablePage, TableQueryState } from '../types';

/** What happened to the record, not to the field. */
export type TableChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';

/** One field of one row, changed once by a signed-in person. */
export interface TableChangeLogRow {
  id: string;
  doc_id: string;
  action: TableChangeAction;
  /** Document path of the field; '' on a CREATE or DELETE entry. */
  field: string;
  old_value: string;
  new_value: string;
  actor_name: string;
  actor_email: string;
  actor_roles: string[];
  source: string;
  ip: string;
  user_agent: string;
  created_at: string;
}

/**
 * A table's change log, as a grid reads it.
 *
 * The grid only names itself — its `<name>Table` query and the variables of the
 * view on screen; the console's shell runs the request, so this package needs
 * no GraphQL client. A grid rendered without the provider shows no change log.
 */
export interface TableChangeLogApi {
  fetch: (
    table: string,
    variables: Record<string, unknown>,
    query: TableQueryState
  ) => Promise<TablePage<TableChangeLogRow>>;
  /** Also show who-by email and roles, surface, address and browser (the Finance console). */
  detailed: boolean;
}

const TableChangeLogContext = createContext<TableChangeLogApi | null>(null);

export const TableChangeLogProvider = TableChangeLogContext.Provider;

export function useTableChangeLogApi(): TableChangeLogApi | null {
  return useContext(TableChangeLogContext);
}
