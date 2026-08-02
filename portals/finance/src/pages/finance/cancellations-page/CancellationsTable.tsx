import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  fmtDate,
  KIND_COLORS,
  KIND_LABELS,
  money,
  type PodCancellationRow,
} from './queries';

const getRowId = (row: PodCancellationRow) => `${row.pod_id}-${row.kind}`;

const renderPod = (row: PodCancellationRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {row.pod_title}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {row.host_names.join(', ')}
    </Typography>
  </Stack>
);

const renderKind = (row: PodCancellationRow) => (
  <StatusChip status={row.kind} label={KIND_LABELS[row.kind]} colorMap={KIND_COLORS} />
);

const renderRefunds = (row: PodCancellationRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span">
      {money(row.currency_symbol, row.refunded_total)} · {row.refunded_count} refunded
    </Typography>
    {row.unrefunded_count > 0 && (
      <Typography variant="caption" color="warning.main" component="span">
        {money(row.currency_symbol, row.unrefunded_total)} · {row.unrefunded_count} not refunded
      </Typography>
    )}
  </Stack>
);

interface Props {
  tableId: string;
  fetchRows: TableFetch<PodCancellationRow>;
  onRowClick: (row: PodCancellationRow) => void;
  showKind?: boolean;
  emptyText: string;
}

/** One table for every Cancel & Refunds list — dashboard shows the canceller
 * kind, the scoped Venue/Host pages hide it. */
export default function CancellationsTable({
  tableId,
  fetchRows,
  onRowClick,
  showKind = false,
  emptyText,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PodCancellationRow>[]>(
    () => [
      {
        field: 'pod_title',
        headerName: 'Pod',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (row) => `${row.pod_title} ${row.host_names.join(' ')}`,
      },
      {
        field: 'kind',
        headerName: 'Cancelled by',
        width: 130,
        hide: !showKind,
        sortable: false,
        cellRenderer: renderKind,
        valueGetter: (row) => KIND_LABELS[row.kind],
      },
      {
        field: 'actor_name',
        headerName: 'Actor',
        minWidth: 150,
        sortable: false,
        valueGetter: (row) => row.actor_name || '—',
      },
      {
        field: 'reason',
        headerName: 'Reason',
        flex: 1,
        minWidth: 200,
        sortable: false,
        valueGetter: (row) => row.reason || '—',
      },
      {
        field: 'cancelled_at',
        headerName: 'Cancelled',
        width: 170,
        valueGetter: (row) => fmtDate(row.cancelled_at),
      },
      { field: 'attendee_count', headerName: 'Attendees', width: 110 },
      {
        field: 'refunded_total',
        headerName: 'Attendee refunds',
        minWidth: 190,
        cellRenderer: renderRefunds,
        valueGetter: (row) => money(row.currency_symbol, row.refunded_total),
      },
      {
        field: 'venue_name',
        headerName: 'Venue',
        minWidth: 150,
        sortable: false,
        valueGetter: (row) => row.venue_name ?? '—',
      },
      {
        field: 'venue_amount',
        headerName: "Venue's money",
        width: 140,
        valueGetter: (row) => (row.venue_id ? money(row.currency_symbol, row.venue_amount) : '—'),
      },
    ],
    [showKind],
  );

  return (
    <DuncitTable<PodCancellationRow>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyText={emptyText}
      searchPlaceholder="Search pod, reason, actor or venue"
      defaultSort={{ field: 'cancelled_at', dir: 'desc' }}
    />
  );
}
