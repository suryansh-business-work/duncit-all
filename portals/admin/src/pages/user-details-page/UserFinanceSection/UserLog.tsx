import { useCallback } from 'react';
import type { DocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn, type TableQueryState } from '@duncit/table';

interface Props<T> {
  userId: string;
  /** Remembers this table's column state on its own. */
  tableId: string;
  title: string;
  emptyText: string;
  searchPlaceholder: string;
  document: DocumentNode;
  /** The Query field the document reads, e.g. `paymentsTable`. */
  rootField: string;
  columns: DuncitColumn<T>[];
  defaultSortField: string;
}

const getRowId = (row: { id: string }) => row.id;

/**
 * One of the user's three logs: a platform-wide Finance table narrowed to this
 * account by the `user_id` filter its server allowlists.
 */
export default function UserLog<T extends { id: string }>({
  userId,
  tableId,
  title,
  emptyText,
  searchPlaceholder,
  document,
  rootField,
  columns,
  defaultSortField,
}: Readonly<Props<T>>) {
  const client = useApolloClient();
  const fetchTable = useApolloTableFetch<T>(
    client,
    document,
    rootField,
    { extraFilters: [{ field: 'user_id', op: 'eq', value: userId }] },
    [userId],
  );
  const fetchRows = useCallback(
    async (q: TableQueryState) => (userId ? fetchTable(q) : { rows: [], total: 0 }),
    [userId, fetchTable],
  );

  return (
    <Stack spacing={1} data-testid={tableId}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <DuncitTable<T>
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={emptyText}
        defaultSort={{ field: defaultSortField, dir: 'desc' }}
        searchPlaceholder={searchPlaceholder}
      />
    </Stack>
  );
}
