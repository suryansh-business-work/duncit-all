import { useMemo } from 'react';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { DuncitTable, type DuncitColumn, type TableFetch, type TableFilterValue } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  BUCKET_COLORS,
  BUCKET_LABELS,
  cancelDisabledReason,
  fmtDate,
  type VenuePodRow,
} from './queries';
import { useTranslation } from '@duncit/shell';

const CANCEL_HINT = 'Cancel this pod and refund every paid attendee';

const getRowId = (row: VenuePodRow) => row.id;

const renderPod = (row: VenuePodRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{
      fontWeight: 700
    }}>
      {row.pod_title}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.host_names.join(', ') || '—'}
    </Typography>
  </Stack>
);

const renderBucket = (row: VenuePodRow) => (
  <StatusChip status={row.bucket} label={BUCKET_LABELS[row.bucket]} colorMap={BUCKET_COLORS} />
);

/** Per-row Cancel action; the span keeps the tooltip alive while disabled. */
function CancelPodCell({
  row,
  onCancel,
}: Readonly<{ row: VenuePodRow; onCancel: (row: VenuePodRow) => void }>) {
  const disabledReason = cancelDisabledReason(row);
  return (
    <Tooltip title={disabledReason ?? CANCEL_HINT}>
      <span>
        <Button
          size="small"
          variant="outlined"
          color="error"
          disabled={!!disabledReason}
          startIcon={<EventBusyIcon fontSize="small" />}
          onClick={(event) => {
            event.stopPropagation();
            onCancel(row);
          }}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Cancel pod
        </Button>
      </span>
    </Tooltip>
  );
}

/**
 * Built at module scope so the cell renderer is never a component defined inside
 * a component. Renderer-only columns freeze on the pre-mutation row after a
 * refetch, so the `valueGetter` keys the cell on the button's own state — and
 * because AG Grid exports the value, not the renderer, it reads as plain
 * English in a CSV instead of a machine key.
 */
type Translate = ReturnType<typeof useTranslation>['t'];

const actionsColumn = (onCancel: (row: VenuePodRow) => void, t: Translate): DuncitColumn<VenuePodRow> => ({
  field: 'actions',
  headerName: t('shell.common.actions'),
  width: 160,
  sortable: false,
  valueGetter: (row) => cancelDisabledReason(row) ?? CANCEL_HINT,
  cellRenderer: (row: VenuePodRow) => <CancelPodCell row={row} onCancel={onCancel} />,
});

interface Props {
  fetchRows: TableFetch<VenuePodRow>;
  externalFilters: TableFilterValue[];
  refetchRef: React.MutableRefObject<(() => void) | null>;
  onRowClick: (row: VenuePodRow) => void;
  onCancel: (row: VenuePodRow) => void;
}

/** All pods booked at the partner's venues; click a row for attendees. */
export default function VenuePodsTable({
  fetchRows,
  externalFilters,
  refetchRef,
  onRowClick,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<VenuePodRow>[]>(
    () => [
      {
        field: 'pod_title',
        headerName: t('partners.common.pod'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (row) => `${row.pod_title} ${row.host_names.join(' ')}`,
      },
      {
        field: 'venue_name',
        headerName: t('partners.common.venue'),
        minWidth: 150,
        sortable: false,
      },
      {
        field: 'pod_date_time',
        headerName: t('partners.common.date'),
        width: 170,
        valueGetter: (row) => fmtDate(row.pod_date_time),
      },
      {
        field: 'pod_amount',
        headerName: t('partners.common.price'),
        width: 110,
        valueGetter: (row) => (row.pod_type === 'FREE' ? 'Free' : `₹${row.pod_amount}`),
      },
      {
        field: 'attendee_count',
        headerName: t('partners.common.attendees'),
        width: 120,
        valueGetter: (row) =>
          row.no_of_spots > 0 ? `${row.attendee_count} / ${row.no_of_spots}` : String(row.attendee_count),
      },
      {
        field: 'bucket',
        headerName: t('shell.common.status'),
        width: 130,
        sortable: false,
        cellRenderer: renderBucket,
        valueGetter: (row) => BUCKET_LABELS[row.bucket],
      },
      {
        field: 'completed_at',
        headerName: t('partners.common.completed'),
        width: 170,
        hide: true,
        sortable: false,
        valueGetter: (row) => fmtDate(row.completed_at),
      },
      {
        field: 'cancelled_at',
        headerName: t('partners.common.cancelled'),
        width: 170,
        hide: true,
        sortable: false,
        valueGetter: (row) => fmtDate(row.cancelled_at),
      },
      actionsColumn(onCancel, t),
    ],
    [onCancel],
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
      emptyText={t('partners.venuePodsPage.noPodsAtYourVenuesYet')}
      searchPlaceholder="Search pod, host or venue"
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
    />
  );
}
