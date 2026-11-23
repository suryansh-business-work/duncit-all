/**
 * The payments table's columns: one definition for the all-payments log and for
 * each shop's, so the three can never label the same figure differently. The
 * shop column is the part that differs — a Pod Shop row says which checkout
 * made the payment, an Ecomm row says how it is paid.
 */
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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
  smart_incentive_amount: 0,
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
  // Ids render as Payment Trace links, which need a router.
  return render(<>{renderer(row) as ReactNode}</>, { wrapper: MemoryRouter });
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
    expect(column('smart_incentive_amount').hide).toBe(false);
    expect(column('smart_incentive_amount', 'ECOMM').hide).toBe(true);
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

  it('names every id: the Razorpay payment, order and refund ids first, then the Duncit ref and the invoice', () => {
    const paid = payment({
      razorpay_payment_id: 'pay_U39hOwzQiUFqHT',
      razorpay_order_id: 'order_U39IVJblWttbgN',
      razorpay_refund_ids: ['rfnd_A1', 'rfnd_B2'],
    });
    expect(valueOf('payment_id', paid)).toBe(
      'finance.payment.idRazorpayPayment: pay_U39hOwzQiUFqHT · finance.payment.idRazorpayOrder: order_U39IVJblWttbgN · ' +
        'finance.payment.idRazorpayRefund: rfnd_A1 · finance.payment.idRazorpayRefund: rfnd_B2 · ' +
        'finance.payment.idDuncitRef: DUN-PAY-4821 · ' +
        'finance.payment.idInvoice: INV-2026-0042',
    );
    draw('payment_id', paid);
    // Every id opens Payment Trace; each refund id on its own line, so each can be traced.
    for (const id of ['pay_U39hOwzQiUFqHT', 'order_U39IVJblWttbgN', 'rfnd_A1', 'rfnd_B2', 'DUN-PAY-4821', 'INV-2026-0042']) {
      expect(screen.getByRole('link', { name: `Trace ${id}` })).toHaveAttribute('href', `/payment-trace?ref=${encodeURIComponent(id)}`);
    }
  });

  it('never passes the Duncit reference off as a Razorpay id when the payment did not go through Razorpay', () => {
    const text = valueOf('payment_id', payment({ gateway: 'COD', invoice_no: null }));
    expect(text).toBe('finance.payment.idDuncitRef: DUN-PAY-4821');
    expect(text).not.toContain('idRazorpay');
  });
});

describe('buildPaymentColumns — a log a person can read at a glance', () => {
  it('hides the accounting columns until asked for, and keeps what a reader looks for in view', () => {
    for (const accounting of ['subtotal', 'platform_fee_amount', 'gst_amount']) {
      expect(column(accounting).hide).toBe(true);
      expect(column(accounting, 'POD_SHOP').hide).toBe(true);
    }
    for (const shown of ['created_at', 'user_name', 'description', 'total', 'status', 'refund_status', 'payment_id']) {
      expect(column(shown).hide).toBeFalsy();
    }
  });

  it('keeps the hidden columns in the grid, so the column chooser can still bring them back', () => {
    const fields = columnsFor().map((c) => c.field);
    expect(fields).toEqual(expect.arrayContaining(['subtotal', 'platform_fee_amount', 'gst_amount']));
  });

  it('puts the refund right after the status it explains', () => {
    const fields = columnsFor().map((c) => c.field);
    expect(fields.indexOf('refund_status')).toBe(fields.indexOf('status') + 1);
  });

  it('reads the status in plain words: a successful payment is "Paid"', () => {
    expect(valueOf('status', payment({ status: 'SUCCESS' }))).toBe('finance.payment.statusPaid');
    expect(valueOf('status', payment({ status: 'PENDING' }))).toBe('finance.payment.statusPending');
    expect(valueOf('status', payment({ status: 'FAILED' }))).toBe('finance.payment.statusFailed');
    expect(valueOf('status', payment({ status: 'REFUNDED' }))).toBe('finance.payment.statusRefunded');
    // A status the table does not know is shown as it is, never blank.
    expect(valueOf('status', payment({ status: 'ON_HOLD' }))).toBe('ON_HOLD');
  });

  it('filters by the real status value but labels it in the same plain words', () => {
    expect(column('status').options).toEqual([
      { value: 'PENDING', label: 'finance.payment.statusPending' },
      { value: 'SUCCESS', label: 'finance.payment.statusPaid' },
      { value: 'FAILED', label: 'finance.payment.statusFailed' },
      { value: 'REFUNDED', label: 'finance.payment.statusRefunded' },
    ]);
  });

  it('draws the status chip with the plain word, not the raw code', () => {
    draw('status', payment({ status: 'SUCCESS' }));
    expect(screen.getByText('finance.payment.statusPaid').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(screen.queryByText('SUCCESS')).not.toBeInTheDocument();
  });
});

describe('buildPaymentColumns — the Refund column', () => {
  it.each([
    ['a refund Razorpay confirmed', { status: 'REFUNDED', refund_status: 'SUCCEEDED' }, 'finance.payment.refundStateRefunded', 'Success'],
    ['part of a payment given back', { status: 'SUCCESS', refund_status: 'SUCCEEDED' }, 'finance.payment.refundStatePart', 'Info'],
    ['a refund the bank has not confirmed', { status: 'REFUNDED', refund_status: 'PROCESSING' }, 'finance.payment.refundStateProcessing', 'Warning'],
    ['a refund waiting to be sent', { status: 'REFUNDED', refund_status: 'REQUESTED' }, 'finance.payment.refundStatePending', 'Warning'],
    ['money still owed after a capture that booked nothing', { status: 'SUCCESS', needs_refund: true }, 'finance.payment.refundStatePending', 'Warning'],
    ['a refund Razorpay refused', { status: 'REFUNDED', refund_status: 'FAILED' }, 'finance.payment.refundStateAttention', 'Error'],
    ['a refund whose retries are used up', { status: 'REFUNDED', refund_status: 'RECONCILIATION_REQUIRED' }, 'finance.payment.refundStateAttention', 'Error'],
    ['an older refund with no engine record', { status: 'REFUNDED', refund_status: null }, 'finance.payment.refundStateRefunded', 'Success'],
    ['a refund with no gateway money to send', { status: 'REFUNDED', refund_status: 'NOT_APPLICABLE' }, 'finance.payment.refundStateRefunded', 'Success'],
  ] as const)('says %s in words and in the matching colour', (_label, facts, word, colour) => {
    const row = payment({ ...facts });
    expect(valueOf('refund_status', row)).toBe(word);
    draw('refund_status', row);
    expect(screen.getByText(word).closest('.MuiChip-root')).toHaveClass(`MuiChip-color${colour}`);
  });

  it('shows a dash, and no chip, for a payment with no refund', () => {
    const row = payment({ status: 'SUCCESS', refund_status: null, needs_refund: false });
    expect(valueOf('refund_status', row)).toBe('—');
    const drawn = draw('refund_status', row);
    expect(drawn.container.querySelector('.MuiChip-root')).toBeNull();
    expect(drawn.container).toHaveTextContent('—');
  });

  it('is derived, so it cannot be sorted or filtered on the server', () => {
    const refund = column('refund_status');
    expect(refund.sortable).toBe(false);
    expect(refund.filterable).toBe(false);
  });
});
