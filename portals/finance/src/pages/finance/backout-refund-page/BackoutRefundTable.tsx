import { useMemo, type MutableRefObject } from 'react';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  BACKOUT_STATUS_COLORS,
  BACKOUT_STATUS_LABELS,
  canProcessRefund,
  fmtDate,
  money,
  REFUND_STATUS_COLORS,
  type BackoutRefundRequest,
} from './queries';

const BACKOUT_STATUS_OPTIONS = (['IN_PROCESS', 'CANCELLED', 'SPOT_FILLED'] as const).map((s) => ({
  value: s,
  label: BACKOUT_STATUS_LABELS[s],
}));

const getBackoutRowId = (row: BackoutRefundRequest) => row.id;

const renderBackoutNo = (row: BackoutRefundRequest) => (
  <Typography variant="body2" fontWeight={800} component="span" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
    {row.backout_no}
  </Typography>
);

const renderMember = (row: BackoutRefundRequest) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {row.user_name ?? '—'}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {row.user_email ?? ''}
    </Typography>
  </Stack>
);

const renderBackoutStatus = (row: BackoutRefundRequest) => (
  <StatusChip
    status={row.backout_status}
    label={BACKOUT_STATUS_LABELS[row.backout_status]}
    colorMap={BACKOUT_STATUS_COLORS}
  />
);

const renderRefundStatus = (row: BackoutRefundRequest) => (
  <StatusChip status={row.refund_status} colorMap={REFUND_STATUS_COLORS} />
);

interface Props {
  fetchRows: TableFetch<BackoutRefundRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  sym: string;
  onRowClick: (row: BackoutRefundRequest) => void;
  onRefund: (row: BackoutRefundRequest) => void;
}

/** Server-paged table of Backout requests. Rows navigate to detail; the Refund
 * button appears only for refund-eligible (Spot Filled) requests. */
export default function BackoutRefundTable({
  fetchRows,
  refetchRef,
  sym,
  onRowClick,
  onRefund,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<BackoutRefundRequest>[]>(() => {
    // Refund processing is enabled ONLY for Spot Filled requests (spec) —
    // Backout In Process / Backout Cancelled rows render a plain dash.
    const renderActions = (row: BackoutRefundRequest) => {
      if (!canProcessRefund(row)) {
        return (
          <Typography variant="caption" color="text.secondary" component="span">
            —
          </Typography>
        );
      }
      return (
        <Tooltip title="Process refund">
          <Button size="small" color="warning" variant="outlined" onClick={() => onRefund(row)}>
            Refund
          </Button>
        </Tooltip>
      );
    };
    return [
      {
        field: 'backout_no',
        headerName: 'Backout ID',
        minWidth: 160,
        filter: { type: 'text' },
        cellRenderer: renderBackoutNo,
        valueGetter: (row) => row.backout_no,
      },
      {
        field: 'user_name',
        headerName: 'Member',
        sortable: false,
        flex: 1,
        minWidth: 180,
        cellRenderer: renderMember,
        valueGetter: (row) => [row.user_name, row.user_email].filter(Boolean).join(' '),
      },
      {
        field: 'pod_title',
        headerName: 'Pod',
        sortable: false,
        minWidth: 160,
        valueGetter: (row) => row.pod?.pod_title ?? '—',
      },
      {
        field: 'backout_status',
        headerName: 'Status',
        width: 170,
        filter: { type: 'select', options: BACKOUT_STATUS_OPTIONS },
        cellRenderer: renderBackoutStatus,
        valueGetter: (row) => BACKOUT_STATUS_LABELS[row.backout_status],
      },
      {
        field: 'created_at',
        headerName: 'Backed out',
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => fmtDate(row.backed_out_at),
      },
      {
        field: 'payment_amount',
        headerName: 'Amount',
        sortable: false,
        width: 110,
        valueGetter: (row) => money(sym, Number(row.payment_amount ?? 0)),
      },
      {
        field: 'refund_status',
        headerName: 'Refund status',
        sortable: false,
        width: 150,
        cellRenderer: renderRefundStatus,
        valueGetter: (row) => row.refund_status,
      },
      {
        field: 'joined_at',
        headerName: 'Joined',
        hide: true,
        sortable: false,
        width: 170,
        valueGetter: (row) => fmtDate(row.joined_at),
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [sym, onRefund]);

  return (
    <DuncitTable<BackoutRefundRequest>
      tableId="finance-backout-refunds"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBackoutRowId}
      onRowClick={onRowClick}
      emptyText="No backout refund requests yet."
      searchPlaceholder="Search by Backout ID"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
