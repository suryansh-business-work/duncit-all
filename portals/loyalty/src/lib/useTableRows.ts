import type { DocumentNode } from 'graphql';
import { useApolloClient } from '@apollo/client/react';
import { useApolloTableFetch } from '@duncit/table';
import { useCountedFetch } from './useCountedFetch';

/**
 * Server-side table rows from one `*Table` query, plus the matching count for
 * the page header. `variables` are the query's own top-level arguments (a
 * batch id), which the table engine's column allowlist would otherwise drop.
 */
export function useTableRows<T>(query: DocumentNode, field: string, variables?: Record<string, unknown>) {
  const client = useApolloClient();
  const fetchTable = useApolloTableFetch<T>(
    client,
    query,
    field,
    variables ? { extraVariables: variables } : undefined,
    [JSON.stringify(variables ?? {})],
  );
  return useCountedFetch(fetchTable);
}
