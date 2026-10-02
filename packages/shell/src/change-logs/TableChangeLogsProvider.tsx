import { useMemo, type ReactNode } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import {
  TableChangeLogProvider,
  tableQueryToGql,
  type TableChangeLogApi,
  type TableChangeLogRow,
  type TablePage,
} from '@duncit/table';
import { useTranslation } from '../i18n/useTranslation';

export const TABLE_CHANGE_LOGS = gql`
  query TableChangeLogs($table: String!, $variables: String!, $query: TableQueryInput) {
    tableChangeLogs(table: $table, variables: $variables, query: $query) {
      total
      rows {
        id
        doc_id
        action
        field
        old_value
        new_value
        actor_name
        actor_email
        actor_roles
        source
        ip
        user_agent
        created_at
      }
    }
  }
`;

export interface TableChangeLogsProviderProps {
  /** No signed-in person, no change log — a grid then shows no button. */
  enabled: boolean;
  /** Also show who-by email and roles, surface, address and browser. */
  detailed: boolean;
  children: ReactNode;
}

/**
 * Gives every grid in the console its change log. The grid names its
 * `<name>Table` query and the view's variables; the server runs that read as
 * the signed-in person to decide which rows' history they may see.
 */
export function TableChangeLogsProvider({ enabled, detailed, children }: Readonly<TableChangeLogsProviderProps>) {
  const client = useApolloClient();
  const { t } = useTranslation();
  const api = useMemo<TableChangeLogApi | null>(() => {
    if (!enabled) return null;
    return {
      detailed,
      fetch: async (table, variables, query): Promise<TablePage<TableChangeLogRow>> => {
        const { data } = await client.query<{ tableChangeLogs: TablePage<TableChangeLogRow> }>({
          query: TABLE_CHANGE_LOGS,
          variables: { table, variables: JSON.stringify(variables), query: tableQueryToGql(query).query },
          fetchPolicy: 'network-only',
        });
        if (!data) throw new Error(t('shell.table.changeLogsLoadFailed'));
        return data.tableChangeLogs;
      },
    };
  }, [client, enabled, detailed, t]);
  return <TableChangeLogProvider value={api}>{children}</TableChangeLogProvider>;
}
