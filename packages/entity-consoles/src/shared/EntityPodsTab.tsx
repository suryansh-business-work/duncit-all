import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import type { DocumentNode } from 'graphql';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';

/**
 * The pods belonging to one directory record, off the shared pods table engine.
 *
 * `venue_id` and `host_user_id` are both allowlisted `podsTable` filters, so a
 * venue's pods and a host's pods are the same query with a different filter —
 * which is why the fetch, the chrome and the row click live here once and each
 * console supplies only its own columns and copy (rule 34).
 */
export interface EntityPodsTabProps<Row extends { id: string }> {
  /** The allowlisted `podsTable` filter field, e.g. `venue_id`. */
  filterField: string;
  filterValue: string;
  /** The console's own `podsTable` document. */
  document: DocumentNode;
  columns: DuncitColumn<Row>[];
  tableId: string;
  title: string;
  subtitle: string;
  emptyText: string;
}

export default function EntityPodsTab<Row extends { id: string }>({
  filterField,
  filterValue,
  document,
  columns,
  tableId,
  title,
  subtitle,
  emptyText,
}: Readonly<EntityPodsTabProps<Row>>) {
  const navigate = useNavigate();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<Row>(
    client,
    document,
    'podsTable',
    { extraFilters: [{ field: filterField, op: 'eq', value: filterValue }] },
    [filterField, filterValue],
  );

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

      <DuncitTable<Row>
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
        emptyText={emptyText}
        defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
        onRowClick={(pod) => navigate(`/pods/${pod.id}`)}
      />
    </Stack>
  );
}
