import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import { coinColumns } from '../UserFinanceSection/coinColumns';
import { paymentColumns, refundColumns } from '../UserFinanceSection/paymentColumns';
import type { UserCoinRow, UserPaymentRow, UserRefundRow } from '../UserFinanceSection/queries';

/** A translator that echoes the key, so every header/label proves which key it asked for. */
const t = ((key: string) => key) as Parameters<typeof coinColumns>[0];
/** A visible stand-in for the admin's date format: the ISO instant, prefixed. */
const formatDateTime: Parameters<typeof coinColumns>[1] = (input) => `at ${new Date(input ?? 0).toISOString()}`;

const columnOf = <T,>(columns: DuncitColumn<T>[], field: string) => {
  const column = columns.find((c) => c.field === field);
  if (!column) throw new Error(`column ${field} not found`);
  return column;
};
const optionsOf = <T,>(column: DuncitColumn<T>) => (column.type === 'enum' ? column.options : undefined);
const valueOf = <T,>(columns: DuncitColumn<T>[], field: string, row: T) => columnOf(columns, field).valueGetter?.(row);
const renderCell = <T,>(columns: DuncitColumn<T>[], field: string, row: T) => {
  const renderer = columnOf(columns, field).cellRenderer;
  if (!renderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{renderer(row)}</>);
};

const payment = (over: Partial<UserPaymentRow> = {}): UserPaymentRow => ({
  id: 'p-1',
  payment_id: 'pay_123',
  invoice_no: 'INV-9',
  description: 'Pod: Sunday run',
  total: 1234.5,
  coins_redeemed: 20,
  coins_earned: 12,
  currency_symbol: '₹',
  status: 'SUCCESS',
  gateway: 'RAZORPAY',
  paid_at: '2026-03-01T10:00:00.000Z',
  created_at: '2026-02-28T09:30:00.000Z',
  ...over,
});

const refund = (over: Partial<UserRefundRow> = {}): UserRefundRow => ({
  id: 'r-1',
  payment_id: 'pay_456',
  invoice_no: null,
  description: 'Pod: Yoga',
  total: 500,
  currency_symbol: '$',
  status: 'REFUNDED',
  refund_amount: 250,
  refund_reason: 'Pod cancelled',
  refund_initiated_by: 'admin@x',
  refunded_at: '2026-03-05T12:00:00.000Z',
  partial: true,
  ...over,
});

const coin = (over: Partial<UserCoinRow> = {}): UserCoinRow => ({
  id: 'c-1',
  type: 'CREDIT',
  amount: 40,
  balance_after: 140,
  source: 'PAYMENT_EARN',
  reason: 'Reward for pay_123',
  payment_id: 'pay_123',
  created_at: '2026-03-02T08:00:00.000Z',
  ...over,
});

describe('paymentColumns', () => {
  const cols = paymentColumns(t, formatDateTime);

  it('lists the payment columns in order, with translated headers', () => {
    expect(cols.map((c) => c.field)).toEqual([
      'created_at',
      'payment_id',
      'description',
      'total',
      'status',
      'coins_redeemed',
      'coins_earned',
      'gateway',
      'paid_at',
    ]);
    expect(cols.map((c) => c.headerName)).toEqual([
      'admin.userFinance.colCreatedAt',
      'admin.userFinance.colPaymentId',
      'admin.userFinance.colDescription',
      'admin.userFinance.colTotal',
      'admin.userFinance.colStatus',
      'admin.userFinance.colCoinsRedeemed',
      'admin.userFinance.colCoinsEarned',
      'admin.userFinance.colGateway',
      'admin.userFinance.colPaidAt',
    ]);
  });

  it('marks the fields paymentsTable cannot sort or filter, and hides the gateway', () => {
    expect(columnOf(cols, 'coins_earned').filterable).toBe(false);
    expect(columnOf(cols, 'gateway')).toMatchObject({ sortable: false, hide: true });
    expect(columnOf(cols, 'created_at').hide).toBe(false);
    expect(optionsOf(columnOf(cols, 'status'))).toEqual([
      { value: 'SUCCESS', label: 'SUCCESS' },
      { value: 'PENDING', label: 'PENDING' },
      { value: 'FAILED', label: 'FAILED' },
      { value: 'REFUNDED', label: 'REFUNDED' },
    ]);
  });

  it('formats dates with the admin formatter and an em dash when unpaid', () => {
    expect(valueOf(cols, 'created_at', payment())).toBe('at 2026-02-28T09:30:00.000Z');
    expect(valueOf(cols, 'paid_at', payment())).toBe('at 2026-03-01T10:00:00.000Z');
    expect(valueOf(cols, 'paid_at', payment({ paid_at: null }))).toBe('—');
  });

  it('renders the total in the row currency with two decimals', () => {
    expect(valueOf(cols, 'total', payment())).toBe('₹1,234.50');
    expect(valueOf(cols, 'total', payment({ currency_symbol: '$', total: 7 }))).toBe('$7.00');
  });

  it('shows coin counts, and an em dash for none or zero', () => {
    expect(valueOf(cols, 'coins_redeemed', payment())).toBe('20');
    expect(valueOf(cols, 'coins_earned', payment())).toBe('12');
    expect(valueOf(cols, 'coins_redeemed', payment({ coins_redeemed: null }))).toBe('—');
    expect(valueOf(cols, 'coins_earned', payment({ coins_earned: 0 }))).toBe('—');
  });

  it('renders the payment id with its invoice number under it, or an em dash', () => {
    const { unmount } = renderCell(cols, 'payment_id', payment());
    expect(screen.getByText('pay_123')).toBeInTheDocument();
    expect(screen.getByText('INV-9')).toBeInTheDocument();
    unmount();

    renderCell(cols, 'payment_id', payment({ invoice_no: null }));
    expect(screen.getByText('pay_123')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the status as a chip', () => {
    renderCell(cols, 'status', payment({ status: 'FAILED' }));
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });
});

describe('refundColumns', () => {
  const cols = refundColumns(t, formatDateTime);

  it('lists the refund columns in order, keyed by refunded_at', () => {
    expect(cols.map((c) => c.field)).toEqual([
      'refunded_at',
      'payment_id',
      'description',
      'refund_amount',
      'total',
      'partial',
      'status',
      'refund_reason',
      'refund_initiated_by',
    ]);
    expect(columnOf(cols, 'refunded_at')).toMatchObject({
      headerName: 'admin.userFinance.colRefundedAt',
      hide: false,
      filterable: false,
    });
    expect(columnOf(cols, 'refund_amount')).toMatchObject({ sortable: false, filterable: false });
    expect(columnOf(cols, 'partial').filterable).toBe(false);
  });

  it('formats amounts in the row currency and the refund date with the admin formatter', () => {
    expect(valueOf(cols, 'refunded_at', refund())).toBe('at 2026-03-05T12:00:00.000Z');
    expect(valueOf(cols, 'refunded_at', refund({ refunded_at: null }))).toBe('—');
    expect(valueOf(cols, 'refund_amount', refund())).toBe('$250.00');
    expect(valueOf(cols, 'total', refund())).toBe('$500.00');
  });

  it('says whether the refund was partial', () => {
    expect(valueOf(cols, 'partial', refund({ partial: true }))).toBe('admin.userFinance.yes');
    expect(valueOf(cols, 'partial', refund({ partial: false }))).toBe('admin.userFinance.no');
  });

  it('shows the reason and initiator, or an em dash when missing', () => {
    expect(valueOf(cols, 'refund_reason', refund())).toBe('Pod cancelled');
    expect(valueOf(cols, 'refund_initiated_by', refund())).toBe('admin@x');
    expect(valueOf(cols, 'refund_reason', refund({ refund_reason: null }))).toBe('—');
    expect(valueOf(cols, 'refund_initiated_by', refund({ refund_initiated_by: '' }))).toBe('—');
  });

  it('renders the payment id with an em dash for a missing invoice', () => {
    renderCell(cols, 'payment_id', refund());
    expect(screen.getByText('pay_456')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('coinColumns', () => {
  const cols = coinColumns(t, formatDateTime);

  it('lists the ledger columns in order, with the type and source filters', () => {
    expect(cols.map((c) => c.field)).toEqual([
      'created_at',
      'type',
      'amount',
      'balance_after',
      'source',
      'payment_id',
      'reason',
    ]);
    expect(optionsOf(columnOf(cols, 'type'))).toEqual([
      { value: 'CREDIT', label: 'admin.userFinance.credit' },
      { value: 'DEBIT', label: 'admin.userFinance.debit' },
    ]);
    expect((optionsOf(columnOf(cols, 'source')) ?? []).map((o) => o.value)).toEqual([
      'PAYMENT_EARN',
      'PAYMENT_REDEEM',
      'PAYMENT_REFUND',
      'REFERRAL_EARN',
      'REFERRAL_SIGNUP',
      'GIFT_CARD_REDEEM',
      'POD_FEEDBACK',
      'ADMIN_GRANT',
      'ADMIN_DEDUCT',
      'COIN_EXPIRY',
      'EARN_REVOKE',
    ]);
    expect(valueOf(cols, 'created_at', coin())).toBe('at 2026-03-02T08:00:00.000Z');
  });

  it('signs the amount by direction', () => {
    expect(valueOf(cols, 'amount', coin({ type: 'CREDIT', amount: 40 }))).toBe('+40');
    expect(valueOf(cols, 'amount', coin({ type: 'DEBIT', amount: 15 }))).toBe('-15');
  });

  it('labels a known source and falls back to the raw value for an unknown one', () => {
    expect(valueOf(cols, 'source', coin({ source: 'ADMIN_GRANT' }))).toBe('admin.userFinance.sourceAdminGrant');
    expect(valueOf(cols, 'source', coin({ source: 'COIN_EXPIRY' }))).toBe('admin.userFinance.sourceExpired');
    expect(valueOf(cols, 'source', coin({ source: 'NEW_KIND' }))).toBe('NEW_KIND');
  });

  it('shows the payment id and note, or an em dash when absent', () => {
    expect(valueOf(cols, 'payment_id', coin())).toBe('pay_123');
    expect(valueOf(cols, 'reason', coin())).toBe('Reward for pay_123');
    expect(valueOf(cols, 'payment_id', coin({ payment_id: null }))).toBe('—');
    expect(valueOf(cols, 'reason', coin({ reason: '' }))).toBe('—');
  });

  it('renders a Credit chip for credits and a Debit chip for debits', () => {
    const { unmount } = renderCell(cols, 'type', coin({ type: 'CREDIT' }));
    expect(screen.getByText('admin.userFinance.credit')).toBeInTheDocument();
    expect(screen.getByText('admin.userFinance.credit').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    unmount();

    renderCell(cols, 'type', coin({ type: 'DEBIT' }));
    expect(screen.getByText('admin.userFinance.debit').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
  });
});
