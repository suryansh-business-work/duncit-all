/**
 * The payments table's columns: one definition for the all-payments log and for
 * each shop's, so the three can never label the same figure differently. The
 * shop column is the part that differs — a Pod Shop row says which checkout
 * made the payment, an Ecomm row says how it is paid.
 */
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DuncitColumn } from '@duncit/table';
import { buildPaymentColumns } from '../../src/pages/finance/payment-logs-page/paymentColumns';
import type { PaymentRow } from '../../src/pages/finance/payment-logs-page/queries';

/** Echoes the key, so a label assertion names the exact translation key shown. */
const t = (key: string) => key;

const payment = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: 'p1',
  payment_id: 'DUN-PAY-4821',
  invoice_no: 'INV-2026-0042',
  user_name: 'Riya Sharma',
  user_email: 'riya@duncit.com',
  description: 'Pod Shop order',
  subtotal: 847.46,
  platform_fee_amount: 84.75,
  gst_amount: 152.54,
  coins_redeemed: 50,
  coins_earned: 10,
  ticket_discount_amount: 0,
  ticket_discount_pct: 0,
  total: 1000,
  round_off: 0.4,
  target_type: 'PRODUCT',
  currency_symbol: '₹',
  status: 'SUCCESS',
  gateway: 'razorpay',
  gateway_ref: 'pay_Nx12',
  paid_at: '2026-09-01T10:00:00.000Z',
  created_at: '2026-09-01T09:59:00.000Z',
  ...over,
});

const columnsFor = (shop?: 'POD_SHOP' | 'ECOMM') => buildPaymentColumns({ t, renderActions: () => null, shop });
const column = (field: string, shop?: 'POD_SHOP' | 'ECOMM'): DuncitColumn<PaymentRow> => {
  const found = columnsFor(shop).find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const valueOf = (field: string, row: PaymentRow, shop?: 'POD_SHOP' | 'ECOMM') => {
  const getter = column(field, shop).valueGetter;
  if (!getter) throw new Error(`no valueGetter on ${field}`);
  return getter(row);
};
const draw = (field: string, row: PaymentRow, shop?: 'POD_SHOP' | 'ECOMM') => {
  const renderer = column(field, shop).cellRenderer;
  if (!renderer) throw new Error(`no cellRenderer on ${field}`);
  return render(<>{renderer(row) as ReactNode}</>);
};

describe('buildPaymentColumns — the Pod Shop checkout column', () => {
  it('sits after the description, only in a shop log', () => {
    expect(columnsFor().map((c) => c.field)).not.toContain('target_type');
    const podShop = columnsFor('POD_SHOP').map((c) => c.field);
    expect(podShop.indexOf('target_type')).toBe(podShop.indexOf('description') + 1);
  });

  it('calls a PRODUCT payment a shop cart and a POD payment a pod booking with add-ons', () => {
    expect(valueOf('target_type', payment({ target_type: 'PRODUCT' }), 'POD_SHOP')).toBe(
      'finance.payment.checkoutShopCart',
    );
    expect(valueOf('target_type', payment({ target_type: 'POD' }), 'POD_SHOP')).toBe(
      'finance.payment.checkoutPodAddOn',
    );
    expect(column('target_type', 'POD_SHOP').options).toEqual([
      { value: 'PRODUCT', label: 'finance.payment.checkoutShopCart' },
      { value: 'POD', label: 'finance.payment.checkoutPodAddOn' },
    ]);
  });

  it('draws the checkout as a chip', () => {
    const cart = draw('target_type', payment({ target_type: 'PRODUCT' }), 'POD_SHOP');
    expect(screen.getByText('finance.payment.checkoutShopCart')).toBeInTheDocument();
    cart.unmount();
    draw('target_type', payment({ target_type: 'POD' }), 'POD_SHOP');
    expect(screen.getByText('finance.payment.checkoutPodAddOn')).toBeInTheDocument();
  });
});

describe('buildPaymentColumns — the Ecomm payment-method column', () => {
  it('says how the order is paid: Cash on Delivery for the COD gateway, prepaid for any other', () => {
    expect(valueOf('payment_method', payment({ gateway: 'COD' }), 'ECOMM')).toBe('finance.payment.methodCod');
    expect(valueOf('payment_method', payment({ gateway: 'razorpay' }), 'ECOMM')).toBe(
      'finance.payment.methodPrepaid',
    );
  });

  it('flags a Cash-on-Delivery payment — one nobody has made yet — in warning colour, and a prepaid one plainly', () => {
    const cod = draw('payment_method', payment({ gateway: 'COD' }), 'ECOMM');
    expect(screen.getByText('finance.payment.methodCod').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    cod.unmount();

    draw('payment_method', payment({ gateway: 'razorpay' }), 'ECOMM');
    const prepaid = screen.getByText('finance.payment.methodPrepaid').closest('.MuiChip-root');
    expect(prepaid).toHaveClass('MuiChip-colorDefault');
    expect(prepaid).not.toHaveClass('MuiChip-colorWarning');
  });
});

describe('buildPaymentColumns — the shared columns', () => {
  it('brings the coin split forward in a shop log and tucks it away in the all-payments log', () => {
    expect(column('coins_redeemed').hide).toBe(true);
    expect(column('coins_redeemed', 'POD_SHOP').hide).toBe(false);
    expect(column('ticket_discount_amount').hide).toBe(false);
    expect(column('ticket_discount_amount', 'ECOMM').hide).toBe(true);
  });

  it('labels the total as cash paid in a shop log, where coins pay the rest', () => {
    expect(column('total').headerName).toBe('finance.payment.colTotal');
    expect(column('total', 'POD_SHOP').headerName).toBe('finance.payment.colCashPaid');
  });

  it('prints each money figure to the paisa, and whole coins only', () => {
    const row = payment();
    expect(valueOf('subtotal', row)).toBe('₹847.46');
    expect(valueOf('platform_fee_amount', row)).toBe('₹84.75');
    expect(valueOf('gst_amount', row)).toBe('₹152.54');
    expect(valueOf('round_off', row)).toBe('₹0.40');
    expect(valueOf('total', row)).toBe('₹1000.00');
    expect(valueOf('coins_redeemed', payment({ coins_redeemed: 50.9 }))).toBe(50);
    expect(valueOf('coins_redeemed', payment({ coins_redeemed: null }))).toBe(0);
    expect(valueOf('coins_earned', payment({ coins_earned: -3 }))).toBe(0);
  });

  it('treats a payment with no round off as zero, and shows a dash for one never paid', () => {
    expect(valueOf('round_off', payment({ round_off: null }))).toBe('₹0.00');
    expect(valueOf('paid_at', payment({ paid_at: null }))).toBe('—');
    expect(valueOf('paid_at', payment())).toBe(new Date('2026-09-01T10:00:00.000Z').toLocaleString('en-IN'));
  });

  it('joins the payment id and invoice number for searching', () => {
    expect(valueOf('payment_id', payment())).toBe('DUN-PAY-4821 INV-2026-0042');
    expect(valueOf('payment_id', payment({ invoice_no: null }))).toBe('DUN-PAY-4821');
  });
});
