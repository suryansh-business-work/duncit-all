import { useMemo, type MutableRefObject } from 'react';
import { CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLORS, fmt } from './helpers';
import type { PaymentRow } from './queries';

/** The filter's options carry translated labels but untranslated values — the
 * value is the PaymentStatus the server filters on, not copy. */
const statusOptions = (t: Translator['t']) => [
  { value: 'PENDING', label: t('finance.payment.statusPending') },
  { value: 'SUCCESS', label: t('finance.payment.statusSuccess') },
  { value: 'FAILED', label: t('finance.payment.statusFailed') },
  { value: 'REFUNDED', label: t('finance.payment.statusRefunded') },
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
  /** Opens the payment's audit page. Row actions stop propagation so they never open it. */
  onOpen: (p: PaymentRow) => void;
}

export default function PaymentsTable({
  fetchRows,
  refetchRef,
  downloadingId,
  onDownload,
  onRefund,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PaymentRow>[]>(() => {
    const renderActions = (p: PaymentRow) => (
      <Stack direction="row" spacing={0.5} component="span">
        <Tooltip title={p.invoice_no ? t('finance.payment.downloadInvoice') : t('finance.payment.noInvoiceGenerated')}>
          <span>
            <IconButton
              size="small"
              disabled={!p.invoice_no || downloadingId === p.id}
              onClick={(event) => {
                // The row opens the detail page; downloading must not also navigate.
                event.stopPropagation();
                onDownload(p);
              }}
            >
              {downloadingId === p.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={p.status === 'SUCCESS' ? t('finance.payment.refund') : t('finance.payment.refundOnlySuccess')}>
          <span>
            <IconButton
              size="small"
              color="warning"
              disabled={p.status !== 'SUCCESS'}
              onClick={(event) => {
                event.stopPropagation();
                onRefund(p);
              }}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'created_at', headerName: t('finance.payment.colWhen'), width: 160, filter: { type: 'date' }, valueGetter: whenValue },
      {
        field: 'user_name',
        headerName: t('finance.payment.colCustomer'),
        flex: 1,
        minWidth: 170,
        cellRenderer: renderCustomer,
        valueGetter: (p) => p.user_name,
      },
      { field: 'description', headerName: t('finance.payment.colDescription'), minWidth: 160 },
      { field: 'subtotal', headerName: t('finance.payment.colSubtotal'), width: 100, valueGetter: (p) => fmt(p.subtotal, p.currency_symbol) },
      { field: 'platform_fee_amount', headerName: t('finance.payment.colFee'), width: 90, valueGetter: (p) => fmt(p.platform_fee_amount, p.currency_symbol) },
      { field: 'gst_amount', headerName: t('finance.payment.colGst'), width: 90, valueGetter: (p) => fmt(p.gst_amount, p.currency_symbol) },
      {
        field: 'coins_redeemed',
        headerName: t('finance.payment.colCoinsUsed'),
        width: 110,
        hide: true,
        sortable: false,
        valueGetter: (p) => Math.max(0, Math.floor(Number(p.coins_redeemed) || 0)),
      },
      {
        field: 'coins_earned',
        headerName: t('finance.payment.colCoinsEarned'),
        width: 120,
        hide: true,
        sortable: false,
        valueGetter: (p) => Math.max(0, Math.floor(Number(p.coins_earned) || 0)),
      },
      {
        field: 'total',
        headerName: t('finance.payment.colTotal'),
        width: 100,
        filter: { type: 'number' },
        valueGetter: (p) => fmt(p.total, p.currency_symbol),
      },
      {
        field: 'status',
        headerName: t('finance.payment.colStatus'),
        width: 120,
        filter: { type: 'select', options: statusOptions(t) },
        cellRenderer: renderStatus,
        valueGetter: (p) => p.status,
      },
      {
        field: 'payment_id',
        headerName: t('finance.payment.colIds'),
        minWidth: 190,
        cellRenderer: renderIds,
        valueGetter: (p) => [p.payment_id, p.invoice_no].filter(Boolean).join(' '),
      },
      {
        field: 'paid_at',
        headerName: t('finance.payment.colPaidAt'),
        hide: true,
        width: 160,
        filter: { type: 'date' },
        valueGetter: (p) => (p.paid_at ? new Date(p.paid_at).toLocaleString('en-IN') : '—'),
      },
      {
        field: 'gateway',
        headerName: t('finance.payment.colGateway'),
        hide: true,
        width: 120,
        filter: { type: 'text' },
      },
      { field: 'actions', headerName: t('finance.payment.colActions'), sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [downloadingId, onDownload, onRefund, t]);

  return (
    <DuncitTable<PaymentRow>
      tableId="finance-payments"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPaymentRowId}
      onRowClick={onOpen}
      emptyText={t('finance.payment.logsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('finance.payment.logsSearch')}
      refetchRef={refetchRef}
    />
  );
}
