import { useCallback, useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn, type TableQueryState } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  cancellationSearchText,
  fmtDate,
  KIND_COLORS,
  KIND_LABELS,
  money,
  type PodCancelKind,
  type PodCancellationRow,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

const getRowId = (row: PodCancellationRow) => `${row.pod_id}-${row.kind}`;

const renderPod = (row: PodCancellationRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{
      fontWeight: 700
    }}>
      {row.pod_title}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
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
      <Typography variant="caption" component="span" sx={{
        color: "warning.main"
      }}>
        {money(row.currency_symbol, row.unrefunded_total)} · {row.unrefunded_count} not refunded
      </Typography>
    )}
  </Stack>
);

const KIND_OPTIONS = (Object.keys(KIND_LABELS) as PodCancelKind[]).map((kind) => ({
  value: kind,
  label: KIND_LABELS[kind],
}));

interface Props {
  tableId: string;
  /** The whole bounded list; the table searches/filters/sorts/pages it in memory. */
  loadRows: () => Promise<readonly PodCancellationRow[]>;
  onRowClick: (row: PodCancellationRow) => void;
  showKind?: boolean;
  emptyText: string;
}

/** One table for every Cancel & Refunds list — dashboard shows the canceller
 * kind, the scoped Venue/Host pages hide it. */
export default function CancellationsTable({
  tableId,
  loadRows,
  onRowClick,
  showKind = false,
  emptyText,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PodCancellationRow>[]>(
    () => [
      {
        field: 'pod_title',
        headerName: t('finance.common.pod'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderPod,
        valueGetter: (row) => `${row.pod_title} ${row.host_names.join(' ')}`,
      },
      {
        field: 'kind',
        headerName: t('finance.cancellations.cancelledBy'),
        width: 130,
        hide: !showKind,
        type: 'enum',
        options: KIND_OPTIONS,
        cellRenderer: renderKind,
        valueGetter: (row) => KIND_LABELS[row.kind],
      },
      {
        field: 'actor_name',
        headerName: t('finance.cancellations.actor'),
        minWidth: 150,
        type: 'text',
        valueGetter: (row) => row.actor_name || '—',
      },
      {
        field: 'reason',
        headerName: t('finance.common.reason'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        valueGetter: (row) => row.reason || '—',
      },
      {
        field: 'cancelled_at',
        headerName: t('finance.cancellations.cancelled'),
        width: 170,
        type: 'date',
        valueGetter: (row) => fmtDate(row.cancelled_at),
      },
      { field: 'attendee_count', headerName: t('finance.cancellations.attendees'), width: 110, type: 'number' },
      {
        field: 'refunded_total',
        headerName: t('finance.cancellations.attendeeRefunds'),
        minWidth: 190,
        type: 'number',
        cellRenderer: renderRefunds,
        valueGetter: (row) => money(row.currency_symbol, row.refunded_total),
      },
      {
        field: 'venue_name',
        headerName: t('finance.common.venue'),
        minWidth: 150,
        type: 'text',
        valueGetter: (row) => row.venue_name ?? '—',
      },
      {
        field: 'venue_amount',
        headerName: "Venue's money",
        width: 140,
        type: 'number',
        valueGetter: (row) => (row.venue_id ? money(row.currency_symbol, row.venue_amount) : '—'),
      },
    ],
    [showKind],
  );

  const fetchRows = useCallback(
    async (q: TableQueryState) =>
      clientTableFetch(await loadRows(), cancellationSearchText, columns)(q),
    [loadRows, columns],
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
