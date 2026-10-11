import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translator } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { STATUS_COLORS, fmt } from './helpers';
import { renderPaymentCustomer, renderPaymentIds } from './cells';
import type { PaymentRow, PaymentShop } from './queries';

type T = Translator['t'];

/** The gateway name a pet-store Cash-on-Delivery payment is recorded under (server: COD_GATEWAY). */
const COD_GATEWAY = 'COD';

/** The filter's options carry translated labels but untranslated values — the
 * value is the PaymentStatus the server filters on, not copy. */
const statusOptions = (t: T) => [
  { value: 'PENDING', label: t('finance.payment.statusPending') },
  { value: 'SUCCESS', label: t('finance.payment.statusSuccess') },
  { value: 'FAILED', label: t('finance.payment.statusFailed') },
  { value: 'REFUNDED', label: t('finance.payment.statusRefunded') },
];

const whenValue = (p: PaymentRow) => new Date(p.created_at).toLocaleString('en-IN');

const renderStatus = (p: PaymentRow) => <StatusChip status={p.status} colorMap={STATUS_COLORS} />;

const wholeCoins = (value: number | null | undefined) => Math.max(0, Math.floor(Number(value) || 0));

/**
 * The column one shop's log adds after the description.
 *
 * Pod Shop: which checkout made the payment — a shop cart, or a pod booking
 * that carried shop add-ons (`target_type` POD). Ecomm: how it is paid, because
 * a Cash-on-Delivery order is a payment nobody has made yet.
 */
function shopColumn(t: T, shop: PaymentShop): DuncitColumn<PaymentRow> {
  if (shop === 'POD_SHOP') {
    const label = (p: PaymentRow) =>
      p.target_type === 'POD' ? t('finance.payment.checkoutPodAddOn') : t('finance.payment.checkoutShopCart');
    return {
      field: 'target_type',
      headerName: t('finance.payment.colCheckout'),
      width: 170,
      type: 'enum',
      sortable: false,
      options: [
        { value: 'PRODUCT', label: t('finance.payment.checkoutShopCart') },
        { value: 'POD', label: t('finance.payment.checkoutPodAddOn') },
      ],
      cellRenderer: (p) => <Chip size="small" variant="outlined" label={label(p)} />,
      valueGetter: label,
    };
  }
  const label = (p: PaymentRow) =>
    p.gateway === COD_GATEWAY ? t('finance.payment.methodCod') : t('finance.payment.methodPrepaid');
  return {
    // Derived from the gateway, which has its own (hidden) column to sort and filter by.
    field: 'payment_method',
    headerName: t('finance.payment.colPaymentMethod'),
    width: 150,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (p) => (
      <Chip size="small" variant="outlined" color={p.gateway === COD_GATEWAY ? 'warning' : 'default'} label={label(p)} />
    ),
    valueGetter: label,
  };
}

interface Options {
  t: T;
  renderActions: (p: PaymentRow) => ReactNode;
  /** One shop's log: adds that shop's column and brings the coin split forward. */
  shop?: PaymentShop;
}

/**
 * The payments table's columns — one definition for the all-payments log and
 * for each shop's, so the three can never label the same figure differently.
 */
export function buildPaymentColumns({ t, renderActions, shop }: Readonly<Options>): DuncitColumn<PaymentRow>[] {
  return [
    { field: 'created_at', headerName: t('finance.payment.colWhen'), width: 160, type: 'date', valueGetter: whenValue },
    {
      field: 'user_name',
      headerName: t('finance.payment.colCustomer'),
      flex: 1,
      minWidth: 170,
      type: 'text',
      cellRenderer: renderPaymentCustomer,
      valueGetter: (p) => p.user_name,
    },
    { field: 'description', headerName: t('finance.payment.colDescription'), minWidth: 160, type: 'text' },
    ...(shop ? [shopColumn(t, shop)] : []),
    // Ahead of the subtotal: the tier came off the price before GST was
    // worked out, so the row reads discount → taxable subtotal → GST → total,
    // the same order as the payment's Amount Breakup and the checkout.
    {
      field: 'ticket_discount_amount',
      headerName: t('finance.payment.colTicketDiscount'),
      width: 150,
      // A shop order has no ticket, so its log does not lead with this column.
      hide: !!shop,
      type: 'number',
      valueGetter: (p) => fmt(p.ticket_discount_amount, p.currency_symbol),
    },
    { field: 'subtotal', headerName: t('finance.payment.colSubtotal'), width: 100, type: 'number', valueGetter: (p) => fmt(p.subtotal, p.currency_symbol) },
    { field: 'platform_fee_amount', headerName: t('finance.payment.colFee'), width: 90, type: 'number', valueGetter: (p) => fmt(p.platform_fee_amount, p.currency_symbol) },
    { field: 'gst_amount', headerName: t('finance.payment.colGst'), width: 90, type: 'number', valueGetter: (p) => fmt(p.gst_amount, p.currency_symbol) },
    {
      // After the tax lines, before the total: subtotal + GST + round off = total.
      field: 'round_off',
      headerName: t('finance.payment.colRoundOff'),
      width: 110,
      hide: true,
      type: 'number',
      valueGetter: (p) => fmt(Number(p.round_off) || 0, p.currency_symbol),
    },
    {
      // What was PAID splits two ways — coins here, cash in the total beside
      // it — so a shop's log shows the pair; the all-payments log keeps it tucked away.
      field: 'coins_redeemed',
      headerName: t('finance.payment.colCoinsUsed'),
      width: 110,
      hide: !shop,
      type: 'number',
      valueGetter: (p) => wholeCoins(p.coins_redeemed),
    },
    {
      field: 'coins_earned',
      headerName: t('finance.payment.colCoinsEarned'),
      width: 120,
      hide: true,
      type: 'number',
      valueGetter: (p) => wholeCoins(p.coins_earned),
    },
    {
      field: 'total',
      headerName: shop ? t('finance.payment.colCashPaid') : t('finance.payment.colTotal'),
      width: shop ? 120 : 100,
      type: 'number',
      valueGetter: (p) => fmt(p.total, p.currency_symbol),
    },
    {
      field: 'status',
      headerName: t('finance.payment.colStatus'),
      width: 120,
      type: 'enum',
      options: statusOptions(t),
      cellRenderer: renderStatus,
      valueGetter: (p) => p.status,
    },
    {
      field: 'payment_id',
      headerName: t('finance.payment.colIds'),
      minWidth: 190,
      type: 'text',
      cellRenderer: renderPaymentIds,
      valueGetter: (p) => [p.payment_id, p.invoice_no].filter(Boolean).join(' '),
    },
    {
      field: 'paid_at',
      headerName: t('finance.payment.colPaidAt'),
      hide: true,
      width: 160,
      type: 'date',
      valueGetter: (p) => (p.paid_at ? new Date(p.paid_at).toLocaleString('en-IN') : EM_DASH),
    },
    {
      field: 'gateway',
      headerName: t('finance.payment.colGateway'),
      hide: true,
      width: 120,
      type: 'text',
    },
    { field: 'actions', headerName: t('finance.payment.colActions'), type: 'actions', width: 110, cellRenderer: renderActions },
  ];
}
