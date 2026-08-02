import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch, type TableFilterValue } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  BUCKET_COLORS,
  BUCKET_LABELS,
  fmtDate,
  type VenuePodRow,
} from './queries';

const getRowId = (row: VenuePodRow) => row.id;

const renderPod = (row: VenuePodRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {row.pod_title}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {row.host_names.join(', ') || '—'}
    </Typography>
  </Stack>
);

const renderBucket = (row: VenuePodRow) => (
  <StatusChip status={row.bucket} label={BUCKET_LABELS[row.bucket]} colorMap={BUCKET_COLORS} />
);

interface Props {
  fetchRows: TableFetch<VenuePodRow>;
  externalFilters: TableFilterValue[];
  refetchRef: React.MutableRefObject<(() => void) | null>;
  onRowClick: (row: VenuePodRow) => void;
}

/** All pods booked at the partner's venues; click a row for attendees. */
export default function VenuePodsTable({
  fetchRows,
  externalFilters,
  refetchRef,
  onRowClick,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<VenuePodRow>[]>(
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
        field: 'venue_name',
        headerName: 'Venue',
        minWidth: 150,
        sortable: false,
      },
      {
        field: 'pod_date_time',
        headerName: 'Date',
        width: 170,
        valueGetter: (row) => fmtDate(row.pod_date_time),
      },
      {
        field: 'pod_amount',
        headerName: 'Price',
        width: 110,
        valueGetter: (row) => (row.pod_type === 'FREE' ? 'Free' : `₹${row.pod_amount}`),
      },
      {
        field: 'attendee_count',
        headerName: 'Attendees',
        width: 120,
        valueGetter: (row) =>
          row.no_of_spots > 0 ? `${row.attendee_count} / ${row.no_of_spots}` : String(row.attendee_count),
      },
      {
        field: 'bucket',
        headerName: 'Status',
        width: 130,
        sortable: false,
        cellRenderer: renderBucket,
        valueGetter: (row) => BUCKET_LABELS[row.bucket],
      },
      {
        field: 'completed_at',
        headerName: 'Completed',
        width: 170,
        hide: true,
        sortable: false,
        valueGetter: (row) => fmtDate(row.completed_at),
      },
      {
        field: 'cancelled_at',
        headerName: 'Cancelled',
        width: 170,
        hide: true,
        sortable: false,
        valueGetter: (row) => fmtDate(row.cancelled_at),
      },
    ],
    [],
  );

  return (
    <DuncitTable<VenuePodRow>
      tableId="partners-venue-pods"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      externalFilters={externalFilters}
      refetchRef={refetchRef}
      emptyText="No pods at your venues yet."
      searchPlaceholder="Search pod, host or venue"
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
    />
  );
}
