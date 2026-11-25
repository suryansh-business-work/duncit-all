import type { ReactNode, RefObject } from 'react';
import type { DocumentNode } from 'graphql';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';

interface Props<T> {
  query: DocumentNode;
  /** The `<name>Table` field the query reads. */
  field: string;
  /** The tab's own arguments (view, channel); the table reads again when they change. */
  variables: Record<string, string>;
  tableId: string;
  ariaLabel: string;
  emptyText: string;
  searchPlaceholder: string;
  columns: DuncitColumn<T>[];
  getRowId: (row: T) => string;
  onOpen: (row: T) => void;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
}

/** One Inbox queue — comments, DMs or everything — server-paged on the slice the URL names; a row opens it. */
export default function InboxQueueTable<T>({ query, field, variables, onOpen, ...table }: Readonly<Props<T>>) {
  const client = useApolloClient();
  const deps = Object.values(variables);
  const fetchRows = useApolloTableFetch<T>(client, query, field, { extraVariables: variables }, deps);
  return <DuncitTable<T> key={deps.join('-')} fetchRows={fetchRows} onRowClick={onOpen} {...table} />;
}
