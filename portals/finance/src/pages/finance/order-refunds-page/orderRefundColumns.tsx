import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { formatDateTime, type Translator } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { fmt } from '../payment-logs-page/helpers';
import { renderPaymentCustomer } from '../payment-logs-page/cells';
import type { OrderRefundKind, OrderRefundMode, OrderRefundRow, PaymentShop } from './queries';

type T = Translator['t'];
type ChipColor = 'default' | 'warning' | 'info' | 'success' | 'error';

/** Where a refund stands. RECORDED is "written to the ledger, nothing sent to a gateway". */
const REFUND_STATUS_COLORS: Record<string, ChipColor> = {
  PENDING: 'warning',
  PROCESSED: 'success',
  RECORDED: 'info',
  FAILED: 'error',
};

const MODE_COLORS: Record<OrderRefundMode, ChipColor> = {
  RAZORPAY: 'info',
  COINS: 'warning',
  RAZORPAY_COINS: 'success',
};

/* Every key below is a literal: the localization gate has to see it rendered. */
const kindLabels = (t: T): Record<OrderRefundKind, string> => ({
  CANCELLATION: t('finance.orderRefunds.kindCancellation'),
  RETURN: t('finance.orderRefunds.kindReturn'),
});

const modeLabels = (t: T): Record<OrderRefundMode, string> => ({
  RAZORPAY: t('finance.orderRefunds.modeRazorpay'),
  COINS: t('finance.orderRefunds.modeCoins'),
  RAZORPAY_COINS: t('finance.orderRefunds.modeBoth'),
});

const statusLabels = (t: T): Record<string, string> => ({
  PENDING: t('finance.orderRefunds.statusPending'),
  PROCESSED: t('finance.orderRefunds.statusProcessed'),
  RECORDED: t('finance.orderRefunds.statusRecorded'),
  FAILED: t('finance.orderRefunds.statusFailed'),
});

const asOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const dateText = (iso: string | null) => (iso ? formatDateTime(iso) || EM_DASH : EM_DASH);

/** The number plus what it is the number of — an order or a return. */
const renderRef = (r: OrderRefundRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
      {r.ref_no}
    </Typography>
    {r.kind === 'RETURN' && (
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
        {r.order_no}
      </Typography>
    )}
  </Stack>
);

/**
 * The cash half: how much goes back to the original payment method and, when
 * Razorpay took the refund, its id — the thing Finance reconciles a bank
 * statement against. A pet-store row has no id: nothing is sent to a gateway.
 */
const renderCash = (r: OrderRefundRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
      {r.cash_amount > 0 ? fmt(r.cash_amount, r.currency_symbol) : EM_DASH}
    </Typography>
    {r.razorpay_refund_id && (
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
        {r.razorpay_refund_id}
      </Typography>
    )}
  </Stack>
);

/**
 * The columns for one shop's Order Refunds. The same definition serves both
 * shops — the rows are never mixed, only the manual-payout wording differs:
 * the pod shop pays out by hand only when Razorpay refused, the pet store
 * always does.
 */
export function buildOrderRefundColumns(t: T, shop: PaymentShop): DuncitColumn<OrderRefundRow>[] {
  const kinds = kindLabels(t);
  const modes = modeLabels(t);
  const statuses = statusLabels(t);
  const manualLabel = t('finance.orderRefunds.manualPayout');
  const manualHint =
    shop === 'ECOMM' ? t('finance.orderRefunds.manualPayoutHintEcomm') : t('finance.orderRefunds.manualPayoutHintPodShop');
  const derivedHint = t('finance.orderRefunds.derivedHint');

  const renderState = (r: OrderRefundRow) => (
    <Stack component="span" direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <StatusChip status={r.status} label={statuses[r.status] ?? r.status} colorMap={REFUND_STATUS_COLORS} />
      {r.manual_payout && (
        <Tooltip title={r.error || manualHint}>
          <Chip size="small" color="warning" variant="outlined" label={manualLabel} />
        </Tooltip>
      )}
    </Stack>
  );

  const renderMode = (r: OrderRefundRow) => {
    const chip = <Chip size="small" color={MODE_COLORS[r.mode]} label={modes[r.mode]} />;
    // Only a row whose figures were worked out, not read back, needs saying so.
    return r.derived ? <Tooltip title={derivedHint}>{chip}</Tooltip> : chip;
  };

  return [
    { field: 'event_at', headerName: t('finance.orderRefunds.colRefundedAt'), width: 170, type: 'date', valueGetter: (r) => dateText(r.event_at) },
    {
      field: 'ref_no',
      headerName: t('finance.orderRefunds.colRef'),
      minWidth: 160,
      type: 'text',
      filterable: false,
      cellRenderer: renderRef,
      valueGetter: (r) => [r.ref_no, r.kind === 'RETURN' ? r.order_no : ''].filter(Boolean).join(' '),
    },
    {
      field: 'kind',
      headerName: t('finance.orderRefunds.colKind'),
      width: 130,
      type: 'enum',
      options: asOptions(kinds),
      cellRenderer: (r) => <Chip size="small" variant="outlined" label={kinds[r.kind]} />,
      valueGetter: (r) => kinds[r.kind],
    },
    {
      field: 'buyer_name',
      headerName: t('finance.payment.colCustomer'),
      flex: 1,
      minWidth: 170,
      type: 'text',
      cellRenderer: (r) => renderPaymentCustomer({ user_name: r.buyer_name, user_email: r.buyer_email }),
      valueGetter: (r) => r.buyer_name,
    },
    {
      // Read in for the page, not part of the refund record — nothing to sort or match on.
      field: 'payment_ref',
      headerName: t('finance.orderRefunds.colPayment'),
      minWidth: 170,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (r) => r.payment_ref || EM_DASH,
    },
    { field: 'order_total', headerName: t('finance.orderRefunds.colOrderTotal'), width: 120, type: 'number', filterable: false, valueGetter: (r) => fmt(r.order_total, r.currency_symbol) },
    {
      field: 'cash_amount',
      headerName: t('finance.orderRefunds.colCash'),
      width: 200,
      type: 'number',
      cellRenderer: renderCash,
      valueGetter: (r) => [fmt(r.cash_amount, r.currency_symbol), r.razorpay_refund_id].filter(Boolean).join(' '),
    },
    { field: 'coins', headerName: t('finance.orderRefunds.colCoins'), width: 150, type: 'number', valueGetter: (r) => r.coins },
    { field: 'refund_value', headerName: t('finance.orderRefunds.colRefundValue'), width: 140, type: 'number', filterable: false, valueGetter: (r) => fmt(r.refund_value, r.currency_symbol) },
    {
      field: 'mode',
      headerName: t('finance.orderRefunds.colMode'),
      width: 160,
      type: 'enum',
      options: asOptions(modes),
      cellRenderer: renderMode,
      valueGetter: (r) => modes[r.mode],
    },
    {
      field: 'status',
      headerName: t('finance.payment.colStatus'),
      width: 230,
      type: 'enum',
      options: asOptions(statuses),
      cellRenderer: renderState,
      valueGetter: (r) => [statuses[r.status] ?? r.status, r.manual_payout ? manualLabel : ''].filter(Boolean).join(' · '),
    },
    {
      field: 'manual_payout',
      headerName: manualLabel,
      width: 170,
      hide: true,
      type: 'boolean',
      sortable: false,
      valueGetter: (r) => (r.manual_payout ? manualLabel : EM_DASH),
    },
    {
      field: 'initiated_by',
      headerName: t('finance.refundLogs.colInitiatedBy'),
      width: 200,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (r) => r.initiated_by || EM_DASH,
    },
    {
      field: 'error',
      headerName: t('finance.orderRefunds.colError'),
      minWidth: 200,
      hide: true,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (r) => r.error || EM_DASH,
    },
  ];
}
