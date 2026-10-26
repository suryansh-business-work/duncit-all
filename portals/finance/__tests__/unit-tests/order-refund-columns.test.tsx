/**
 * Finance > Pod Shop / Ecomm > Order Refunds columns. A refund splits two ways:
 * the cash that goes back to the original payment method and the coins that go
 * back to the buyer's wallet. Every figure and label below is read off the
 * column definition the table renders.
 */
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import { buildOrderRefundColumns } from '../../src/pages/finance/order-refunds-page/orderRefundColumns';
import type { OrderRefundRow } from '../../src/pages/finance/order-refunds-page/queries';

/** Echoes the key, so a label assertion names the exact translation key shown. */
const t = (key: string) => key;

const row = (over: Partial<OrderRefundRow> = {}): OrderRefundRow => ({
  id: 'r1',
  kind: 'CANCELLATION',
  ref_no: 'ORD-1001',
  order_no: 'ORD-1001',
  order_id: 'o1',
  buyer_name: 'Riya Sharma',
  buyer_email: 'riya@duncit.com',
  payment_doc_id: 'p1',
  payment_ref: 'DUN-PAY-4821',
  currency_symbol: '₹',
  order_total: 1250,
  cash_amount: 1000,
  coins: 250,
  refund_value: 1250,
  razorpay_refund_id: 'rfnd_Nx12',
  status: 'PROCESSED',
  mode: 'RAZORPAY_COINS',
  initiated_by: 'finance@duncit.com',
  error: '',
  derived: false,
  manual_payout: false,
  event_at: '2026-09-01T10:00:00.000Z',
  ...over,
});

const columns = (shop: 'POD_SHOP' | 'ECOMM' = 'POD_SHOP') => buildOrderRefundColumns(t, shop);
const column = (field: string, shop: 'POD_SHOP' | 'ECOMM' = 'POD_SHOP'): DuncitColumn<OrderRefundRow> => {
  const found = columns(shop).find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const valueOf = (field: string, r: OrderRefundRow) => {
  const getter = column(field).valueGetter;
  if (!getter) throw new Error(`no valueGetter on ${field}`);
  return getter(r);
};
const draw = (field: string, r: OrderRefundRow, shop: 'POD_SHOP' | 'ECOMM' = 'POD_SHOP') => {
  const renderer = column(field, shop).cellRenderer;
  if (!renderer) throw new Error(`no cellRenderer on ${field}`);
  return render(<>{renderer(r) as ReactNode}</>);
};

describe('buildOrderRefundColumns', () => {
  it('lays the columns out in the order Finance reconciles them', () => {
    expect(columns().map((c) => c.field)).toEqual([
      'event_at',
      'ref_no',
      'kind',
      'buyer_name',
      'payment_ref',
      'order_total',
      'cash_amount',
      'coins',
      'refund_value',
      'mode',
      'status',
      'manual_payout',
      'initiated_by',
      'error',
    ]);
  });

  it('shows when the refund happened, and a dash for one with no date or an unreadable one', () => {
    const iso = '2026-09-01T10:00:00.000Z';
    expect(valueOf('event_at', row({ event_at: iso }))).toBe(formatDateTime(iso));
    expect(valueOf('event_at', row({ event_at: iso }))).not.toBe('—');
    expect(valueOf('event_at', row({ event_at: null }))).toBe('—');
    expect(valueOf('event_at', row({ event_at: 'not a date' }))).toBe('—');
  });

  it('keys a cancellation by its order number and a return by its return number under the order', () => {
    expect(valueOf('ref_no', row())).toBe('ORD-1001');
    expect(valueOf('ref_no', row({ kind: 'RETURN', ref_no: 'RET-77', order_no: 'ORD-1001' }))).toBe(
      'RET-77 ORD-1001',
    );

    const cancellation = draw('ref_no', row());
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    cancellation.unmount();

    draw('ref_no', row({ kind: 'RETURN', ref_no: 'RET-77', order_no: 'ORD-1001' }));
    expect(screen.getByText('RET-77')).toBeInTheDocument();
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();
  });

  it('names the kind of refund', () => {
    expect(valueOf('kind', row())).toBe('finance.orderRefunds.kindCancellation');
    expect(valueOf('kind', row({ kind: 'RETURN' }))).toBe('finance.orderRefunds.kindReturn');
    draw('kind', row({ kind: 'RETURN' }));
    expect(screen.getByText('finance.orderRefunds.kindReturn')).toBeInTheDocument();
  });

  it('names the buyer and their e-mail', () => {
    expect(valueOf('buyer_name', row())).toBe('Riya Sharma');
    draw('buyer_name', row());
    expect(screen.getByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('riya@duncit.com')).toBeInTheDocument();
  });

  it('shows the payment id the refund reverses, or a dash when there is none', () => {
    expect(valueOf('payment_ref', row())).toBe('DUN-PAY-4821');
    expect(valueOf('payment_ref', row({ payment_ref: '' }))).toBe('—');
  });

  it('prints the order total, the cash refunded and the refund value as exact amounts', () => {
    expect(valueOf('order_total', row())).toBe('₹1250.00');
    expect(valueOf('refund_value', row())).toBe('₹1250.00');
    expect(valueOf('cash_amount', row())).toBe('₹1000.00 rfnd_Nx12');
    expect(valueOf('coins', row())).toBe(250);
  });

  it('reconciles a Razorpay refund by its gateway id, beside the cash amount', () => {
    draw('cash_amount', row());
    expect(screen.getByText('₹1000.00')).toBeInTheDocument();
    expect(screen.getByText('rfnd_Nx12')).toBeInTheDocument();
  });

  it('shows a dash instead of a zero cash amount, and no gateway id, for a coins-only pet-store refund', () => {
    const coinsOnly = row({ cash_amount: 0, razorpay_refund_id: '', coins: 1250, mode: 'COINS' });
    expect(valueOf('cash_amount', coinsOnly)).toBe('₹0.00');
    draw('cash_amount', coinsOnly);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('rfnd_Nx12')).not.toBeInTheDocument();
  });

  it('says where the refund went, and marks a figure that was worked out rather than read back', () => {
    expect(valueOf('mode', row({ mode: 'RAZORPAY' }))).toBe('finance.orderRefunds.modeRazorpay');
    expect(valueOf('mode', row({ mode: 'COINS' }))).toBe('finance.orderRefunds.modeCoins');
    expect(valueOf('mode', row({ mode: 'RAZORPAY_COINS' }))).toBe('finance.orderRefunds.modeBoth');

    const plain = draw('mode', row({ mode: 'RAZORPAY' }));
    expect(screen.getByText('finance.orderRefunds.modeRazorpay')).toBeInTheDocument();
    expect(screen.queryByLabelText('finance.orderRefunds.derivedHint')).not.toBeInTheDocument();
    plain.unmount();

    draw('mode', row({ mode: 'COINS', derived: true }));
    expect(screen.getByLabelText('finance.orderRefunds.derivedHint')).toHaveTextContent(
      'finance.orderRefunds.modeCoins',
    );
  });

  it('shows where the refund stands, and flags a manual payout with the reason the gateway gave', () => {
    expect(valueOf('status', row())).toBe('finance.orderRefunds.statusProcessed');
    expect(valueOf('status', row({ status: 'FAILED', manual_payout: true }))).toBe(
      'finance.orderRefunds.statusFailed · finance.orderRefunds.manualPayout',
    );

    const settled = draw('status', row());
    expect(screen.getByText('finance.orderRefunds.statusProcessed')).toBeInTheDocument();
    expect(screen.queryByText('finance.orderRefunds.manualPayout')).not.toBeInTheDocument();
    settled.unmount();

    draw('status', row({ status: 'FAILED', manual_payout: true, error: 'Razorpay refused: insufficient balance' }));
    expect(screen.getByLabelText('Razorpay refused: insufficient balance')).toHaveTextContent(
      'finance.orderRefunds.manualPayout',
    );
  });

  it('keeps a status it has no label for, rather than hiding it', () => {
    expect(valueOf('status', row({ status: 'REVERSED' }))).toBe('REVERSED');
    draw('status', row({ status: 'REVERSED' }));
    expect(screen.getByText('REVERSED')).toBeInTheDocument();
  });

  it('explains a manual payout with the shop-specific hint when the gateway gave no reason', () => {
    const podShop = draw('status', row({ manual_payout: true }), 'POD_SHOP');
    expect(screen.getByLabelText('finance.orderRefunds.manualPayoutHintPodShop')).toBeInTheDocument();
    podShop.unmount();

    draw('status', row({ manual_payout: true }), 'ECOMM');
    expect(screen.getByLabelText('finance.orderRefunds.manualPayoutHintEcomm')).toBeInTheDocument();
  });

  it('lists a manual-payout flag as a hidden filter column', () => {
    expect(column('manual_payout').hide).toBe(true);
    expect(valueOf('manual_payout', row({ manual_payout: true }))).toBe('finance.orderRefunds.manualPayout');
    expect(valueOf('manual_payout', row())).toBe('—');
  });

  it('shows who started the refund and why the gateway refused it, with a dash where there is nothing', () => {
    expect(valueOf('initiated_by', row())).toBe('finance@duncit.com');
    expect(valueOf('initiated_by', row({ initiated_by: '' }))).toBe('—');
    expect(valueOf('error', row({ error: 'Gateway timeout' }))).toBe('Gateway timeout');
    expect(valueOf('error', row())).toBe('—');
  });
});
