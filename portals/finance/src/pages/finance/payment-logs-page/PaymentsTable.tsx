import { useMemo, type MutableRefObject } from 'react';
import { CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLORS, fmt } from './helpers';
import type { PaymentRow } from './queries';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const getPaymentRowId = (p: PaymentRow) => p.id;

const whenValue = (p: PaymentRow) => new Date(p.created_at).toLocaleString('en-IN');

const renderCustomer = (p: PaymentRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="span">
      {p.user_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {p.user_email}
    </Typography>
  </Stack>
);

const renderStatus = (p: PaymentRow) => (
  <StatusChip status={p.status} colorMap={STATUS_COLORS} />
);

const renderIds = (p: PaymentRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
      {p.payment_id}
    </Typography>
    {p.invoice_no && (
      <Typography variant="caption" color="text.secondary" component="span" sx={{ fontFamily: 'monospace' }}>
        {p.invoice_no}
      </Typography>
    )}
  </Stack>
);

interface Props {
  fetchRows: TableFetch<PaymentRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  downloadingId: string | null;
  onDownload: (p: PaymentRow) => void;
  onRefund: (p: PaymentRow) => void;
}

export default function PaymentsTable({
  fetchRows,
  refetchRef,
  downloadingId,
  onDownload,
  onRefund,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PaymentRow>[]>(() => {
    const renderActions = (p: PaymentRow) => (
      <Stack direction="row" spacing={0.5} component="span">
        <Tooltip title={p.invoice_no ? 'Download invoice' : 'No invoice generated'}>
          <span>
            <IconButton
              size="small"
              disabled={!p.invoice_no || downloadingId === p.id}
              onClick={() => onDownload(p)}
            >
              {downloadingId === p.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={p.status === 'SUCCESS' ? 'Refund' : 'Only successful payments can be refunded'}>
          <span>
            <IconButton
              size="small"
              color="warning"
              disabled={p.status !== 'SUCCESS'}
              onClick={() => onRefund(p)}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'created_at', headerName: 'When', width: 160, filter: { type: 'date' }, valueGetter: whenValue },
      {
        field: 'user_name',
        headerName: 'Customer',
        flex: 1,
        minWidth: 170,
        cellRenderer: renderCustomer,
        valueGetter: (p) => p.user_name,
      },
      { field: 'description', headerName: 'Description', minWidth: 160 },
      { field: 'subtotal', headerName: 'Subtotal', width: 100, valueGetter: (p) => fmt(p.subtotal, p.currency_symbol) },
      { field: 'platform_fee_amount', headerName: 'Fee', width: 90, valueGetter: (p) => fmt(p.platform_fee_amount, p.currency_symbol) },
      { field: 'gst_amount', headerName: 'GST', width: 90, valueGetter: (p) => fmt(p.gst_amount, p.currency_symbol) },
      {
        field: 'total',
        headerName: 'Total',
        width: 100,
        filter: { type: 'number' },
        valueGetter: (p) => fmt(p.total, p.currency_symbol),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (p) => p.status,
      },
      {
        field: 'payment_id',
        headerName: 'IDs',
        minWidth: 190,
        cellRenderer: renderIds,
        valueGetter: (p) => [p.payment_id, p.invoice_no].filter(Boolean).join(' '),
      },
      {
        field: 'paid_at',
        headerName: 'Paid at',
        hide: true,
        width: 160,
        filter: { type: 'date' },
        valueGetter: (p) => (p.paid_at ? new Date(p.paid_at).toLocaleString('en-IN') : '—'),
      },
      {
        field: 'gateway',
        headerName: 'Gateway',
        hide: true,
        width: 120,
        filter: { type: 'text' },
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [downloadingId, onDownload, onRefund]);

  return (
    <DuncitTable<PaymentRow>
      tableId="finance-payments"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPaymentRowId}
      emptyText="No payments yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search txn id, invoice, name or email"
      refetchRef={refetchRef}
    />
  );
}
