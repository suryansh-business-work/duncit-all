import { useMemo, type MutableRefObject } from 'react';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { fmtDate, REFUND_STATUS_COLORS, money, type BackoutRefundRequest } from './queries';

const REFUND_STATUS_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSED', label: 'Processed' },
  { value: 'NOT_ELIGIBLE', label: 'Not eligible' },
];

const getBackoutRowId = (row: BackoutRefundRequest) => row.id;

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

/** Server-paged table of backed-out members. Rows navigate to detail; the
 * per-row Refund button opens the breakup dialog (button clicks never row-click). */
export default function BackoutRefundTable({
  fetchRows,
  refetchRef,
  sym,
  onRowClick,
  onRefund,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<BackoutRefundRequest>[]>(() => {
    const renderActions = (row: BackoutRefundRequest) => (
      <Tooltip title="Process refund">
        <Button size="small" color="warning" variant="outlined" onClick={() => onRefund(row)}>
          Refund
        </Button>
      </Tooltip>
    );
    return [
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
        minWidth: 180,
        valueGetter: (row) => row.pod?.pod_title ?? '—',
      },
      {
        field: 'backed_out_at',
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
        width: 150,
        filter: { type: 'select', options: REFUND_STATUS_OPTIONS },
        cellRenderer: renderRefundStatus,
        valueGetter: (row) => row.refund_status,
      },
      {
        field: 'joined_at',
        headerName: 'Joined',
        hide: true,
        width: 170,
        filter: { type: 'date' },
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
      defaultSort={{ field: 'backed_out_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
