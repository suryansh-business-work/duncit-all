import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import type { DocumentNode } from 'graphql';
import {
  DuncitTable,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFilterValue,
} from '@duncit/table';

/**
 * The records related to one directory record, off a shared `<name>Table`.
 *
 * A venue's pods, a host's pods, a club's pods and a club's hosts are all the
 * same screen — a heading, a server-side table pinned to one filter, a row that
 * opens the record — so the fetch and the chrome live here once and each tab
 * supplies only its query, its columns and its copy (rule 34).
 */
export interface EntityRecordsTabProps<Row extends { id: string }> {
  /** The server table document and the key its page comes back under. */
  document: DocumentNode;
  resultKey: string;
  /** The allowlisted filter that scopes the table to this record. */
  filter: TableFilterValue;
  columns: DuncitColumn<Row>[];
  tableId: string;
  title: string;
  subtitle: string;
  emptyText: string;
  defaultSortField: string;
  /** Where a row opens. */
  rowPath: (row: Row) => string;
}

/**
 * An `in` filter with no values is DROPPED by the table engine rather than
 * matching nothing, so asking would widen the table to every row. A record with
 * nothing related gets an empty page without a round trip instead.
 */
const noRows = async () => ({ rows: [], total: 0 });

export default function EntityRecordsTab<Row extends { id: string }>({
  document,
  resultKey,
  filter,
  columns,
  tableId,
  title,
  subtitle,
  emptyText,
  defaultSortField,
  rowPath,
}: Readonly<EntityRecordsTabProps<Row>>) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<Row>(client, document, resultKey);
  const nothingToAsk = filter.op === 'in' && !filter.values?.length;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Stack>

      {/* The scope rides as an EXTERNAL filter: the table compares it by value
          and refetches when it moves, which a filter baked into the fetch
          closure would not. */}
      <DuncitTable<Row>
        tableId={tableId}
        columns={columns}
        fetchRows={nothingToAsk ? noRows : fetchRows}
        externalFilters={[filter]}
        getRowId={(row) => row.id}
        emptyText={emptyText}
        defaultSort={{ field: defaultSortField, dir: 'desc' }}
        onRowClick={(row) => navigate(rowPath(row))}
      />
    </Stack>
  );
}
