import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

/**
 * The signed-in person's table GET API access: their personal token and the
 * API's base URL. Read by every portal table's "GET API" dialog and managed in
 * Tech → Table API → Settings — one document, so rotating the token there
 * refreshes the URL every open dialog builds.
 */
export const MY_TABLE_API_ACCESS = gql`
  query MyTableApiAccess {
    myTableApiAccess {
      token
      base_url
      created_at
      last_used_at
    }
  }
`;

export interface TableApiAccess {
  loading: boolean;
  /** Null until the person generates one. */
  token: string | null;
  /** e.g. `https://server.duncit.com/table-api`; empty until the query answers. */
  baseUrl: string;
  error: boolean;
}

interface MyTableApiAccessData {
  myTableApiAccess: { token: string | null; base_url: string };
}

/** Skipped until `enabled`, so a table only asks once its GET API dialog is opened. */
export function useTableApiAccess(enabled: boolean): TableApiAccess {
  const { data, loading, error } = useQuery<MyTableApiAccessData>(MY_TABLE_API_ACCESS, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
  });
  return {
    loading,
    token: data?.myTableApiAccess.token ?? null,
    baseUrl: data?.myTableApiAccess.base_url ?? '',
    error: Boolean(error),
  };
}
