import type { ReactNode } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { storePaymentIds, usePaymentColumns } from '../../src/pages/logs/usePaymentColumns';
import type { StorePaymentRow } from '../../src/pages/logs/queries';

/**
 * The pet store's Payment logs columns. The IDs cell must name every id by
 * the system it belongs to — Razorpay's ids are what the store compares with
 * the Razorpay dashboard, and the Duncit ref never matches anything there.
 */
const t = (key: string) => key;

const row = (over: Partial<StorePaymentRow> = {}): StorePaymentRow => ({
  id: 'p1',
  payment_id: 'DPAY-123',
  invoice_no: 'INV-9',
  razorpay_payment_id: 'pay_U39NBNks4J5RtV',
  razorpay_order_id: 'order_Qx81',
  razorpay_refund_ids: ['rfnd_a', 'rfnd_b'],
  user_name: 'Asha',
  user_email: 'asha@x.com',
  description: 'Dog food',
  total: 499,
  currency_symbol: '₹',
  coupon_code: null,
  coupon_discount: 0,
  coins_redeemed: 0,
  status: 'SUCCESS',
  gateway: 'RAZORPAY',
  paid_at: '2026-11-20T10:00:00.000Z',
  created_at: '2026-11-20T09:59:00.000Z',
  ...over,
});

const columns = () => renderHook(() => usePaymentColumns()).result.current;
const column = (field: string) => {
  const found = columns().find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const draw = (node: unknown) => render(<>{node as ReactNode}</>);

describe('storePaymentIds', () => {
  it('lists Razorpay ids first, then the Duncit ref and the invoice, each under its own label', () => {
    expect(storePaymentIds(t, row())).toEqual([
      { label: 'ecommPortal.paymentLogs.idRazorpayPayment', value: 'pay_U39NBNks4J5RtV' },
      { label: 'ecommPortal.paymentLogs.idRazorpayOrder', value: 'order_Qx81' },
      { label: 'ecommPortal.paymentLogs.idRazorpayRefund', value: 'rfnd_a, rfnd_b' },
      { label: 'ecommPortal.paymentLogs.idDuncitRef', value: 'DPAY-123' },
      { label: 'ecommPortal.paymentLogs.idInvoice', value: 'INV-9' },
    ]);
  });

  it('gives an empty refund value when the payment was never refunded', () => {
    expect(storePaymentIds(t, row({ razorpay_refund_ids: null }))[2].value).toBe('');
  });
});

describe('usePaymentColumns — IDs column', () => {
  it('draws every id with its label, so the Razorpay payment id reads exactly as the dashboard shows it', () => {
    draw(column('payment_id').cellRenderer?.(row()));
    const cell = screen.getByTestId('payment-logs-ids');
    expect(cell).toHaveProperty(
      'textContent',
      'ecommPortal.paymentLogs.idRazorpayPayment pay_U39NBNks4J5RtV' +
        'ecommPortal.paymentLogs.idRazorpayOrder order_Qx81' +
        'ecommPortal.paymentLogs.idRazorpayRefund rfnd_a, rfnd_b' +
        'ecommPortal.paymentLogs.idDuncitRef DPAY-123' +
        'ecommPortal.paymentLogs.idInvoice INV-9',
    );
  });

  it('leaves Razorpay ids out of a cash-on-delivery payment that never went through Razorpay', () => {
    const cod = row({ gateway: 'COD', razorpay_payment_id: null, razorpay_order_id: null, razorpay_refund_ids: [], invoice_no: null });
    draw(column('payment_id').cellRenderer?.(cod));
    const cell = screen.getByTestId('payment-logs-ids');
    expect(cell.textContent).toBe('ecommPortal.paymentLogs.idDuncitRef DPAY-123');
    expect(cell.textContent).not.toContain('idRazorpay');
  });

  it('exports and copies the ids as one labelled line', () => {
    expect(column('payment_id').valueGetter?.(row({ razorpay_order_id: null, razorpay_refund_ids: [], invoice_no: null }))).toBe(
      'ecommPortal.paymentLogs.idRazorpayPayment: pay_U39NBNks4J5RtV · ecommPortal.paymentLogs.idDuncitRef: DPAY-123',
    );
  });

  it('is headed IDs', () => {
    expect(column('payment_id').headerName).toBe('ecommPortal.paymentLogs.ids');
  });
});

describe('usePaymentColumns — the other columns', () => {
  it('shows the buyer as name over email', () => {
    draw(column('user_name').cellRenderer?.(row()));
    const buyer = screen.getByTestId('payment-logs-buyer');
    expect(buyer.children[0].textContent).toBe('Asha');
    expect(buyer.children[1].textContent).toBe('asha@x.com');
    expect(column('user_name').valueGetter?.(row())).toBe('Asha');
  });

  it('prints the total in the payment currency', () => {
    expect(column('total').valueGetter?.(row({ total: 1099 }))).toContain('1,099.00');
  });

  it('names the status in words, and keeps an unknown code readable', () => {
    draw(column('status').cellRenderer?.(row({ status: 'REFUNDED' })));
    expect(screen.getByTestId('payment-logs-status').textContent).toBe('ecommPortal.paymentLogs.statusRefunded');
    expect(column('status').valueGetter?.(row({ status: 'PENDING' }))).toBe('ecommPortal.paymentLogs.statusPending');
    expect(column('status').valueGetter?.(row({ status: 'ON_HOLD' }))).toBe('ON_HOLD');
    expect(column('status').options).toEqual([
      { value: 'PENDING', label: 'ecommPortal.paymentLogs.statusPending' },
      { value: 'SUCCESS', label: 'ecommPortal.paymentLogs.statusSuccess' },
      { value: 'FAILED', label: 'ecommPortal.paymentLogs.statusFailed' },
      { value: 'REFUNDED', label: 'ecommPortal.paymentLogs.statusRefunded' },
    ]);
  });

  it('shows the coupon, or an em dash when none was used', () => {
    expect(column('coupon_code').valueGetter?.(row({ coupon_code: 'WOOF10' }))).toBe('WOOF10');
    expect(column('coupon_code').valueGetter?.(row({ coupon_code: null }))).toBe('—');
  });

  it('keeps the column order the table shows', () => {
    expect(columns().map((c) => c.field)).toEqual([
      'created_at',
      'user_name',
      'gateway',
      'total',
      'status',
      'payment_id',
      'paid_at',
      'coupon_code',
      'coins_redeemed',
    ]);
  });
});
