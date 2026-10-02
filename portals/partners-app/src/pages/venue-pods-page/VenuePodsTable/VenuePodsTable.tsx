import { useCallback, useMemo } from 'react';
import {
  DuncitTable,
  type DuncitColumn,
  type TableFilterValue,
  type TableQueryState,
} from '@duncit/table';
import {
  applyVenuePodsQuery,
  BUCKET_LABELS,
  fmtDate,
  type VenuePodRow,
} from '../queries';
import { useTranslation } from '@duncit/shell';
import { actionsColumn, BUCKET_OPTIONS, getRowId, renderBucket, renderPod } from './cells';

interface Props {
  /** Every venuePods row; the table searches, filters, sorts and pages them in memory. */
  rows: readonly VenuePodRow[];
  externalFilters: TableFilterValue[];
  refetchRef: React.MutableRefObject<(() => void) | null>;
  onRowClick: (row: VenuePodRow) => void;
  onCancel: (row: VenuePodRow) => void;
  onRequestChange: (row: VenuePodRow) => void;
  /** Already translated — the label lives in the shared `changeRequest.*`. */
  requestChangeLabel: string;
}

/** All pods booked at the partner's venues; click a row for attendees. */
export default function VenuePodsTable({
  rows,
  externalFilters,
  refetchRef,
  onRowClick,
  onCancel,
  onRequestChange,
  requestChangeLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<VenuePodRow>[]>(
    () => [
      {
        field: 'pod_title',
        headerName: t('partners.common.pod'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderPod,
        valueGetter: (row) => `${row.pod_title} ${row.host_names.join(' ')}`,
      },
      {
        field: 'venue_name',
        headerName: t('partners.common.venue'),
        minWidth: 150,
        type: 'text',
      },
      {
        field: 'pod_date_time',
        headerName: t('partners.common.date'),
        width: 170,
        type: 'date',
        valueGetter: (row) => fmtDate(row.pod_date_time),
      },
      {
        field: 'pod_amount',
        headerName: t('partners.common.price'),
        width: 110,
        type: 'number',
        valueGetter: (row) => (row.pod_type === 'FREE' ? 'Free' : `₹${row.pod_amount}`),
      },
      {
        field: 'attendee_count',
        headerName: t('partners.common.attendees'),
        width: 120,
        type: 'number',
        valueGetter: (row) =>
          row.no_of_spots > 0 ? `${row.attendee_count} / ${row.no_of_spots}` : String(row.attendee_count),
      },
      {
        field: 'bucket',
        headerName: t('shell.common.status'),
        width: 130,
        type: 'enum',
        options: BUCKET_OPTIONS,
        cellRenderer: renderBucket,
        valueGetter: (row) => BUCKET_LABELS[row.bucket],
      },
      {
        field: 'completed_at',
        headerName: t('partners.common.completed'),
        width: 170,
        hide: true,
        type: 'date',
        valueGetter: (row) => fmtDate(row.completed_at),
      },
      {
        field: 'cancelled_at',
        headerName: t('partners.common.cancelled'),
        width: 170,
        hide: true,
        type: 'date',
        valueGetter: (row) => fmtDate(row.cancelled_at),
      },
      actionsColumn(onCancel, onRequestChange, requestChangeLabel, t),
    ],
    [onCancel, onRequestChange, requestChangeLabel],
  );

  const fetchRows = useCallback(
    (q: TableQueryState) => applyVenuePodsQuery(rows, q, columns),
    [rows, columns],
  );

  return (
    <DuncitTable<VenuePodRow>
      tableId="partners-venue-pods"
      ariaLabel={t('shell.nav.pods')}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      externalFilters={externalFilters}
      refetchRef={refetchRef}
      emptyText={t('partners.venuePodsPage.noPodsAtYourVenuesYet')}
      searchPlaceholder="Search pod, host or venue"
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
    />
  );
}
