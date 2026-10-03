jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@services/invoice/invoice.pdf', () => ({ generateInvoicePdf: jest.fn() }));
jest.mock('../../payment.invoice', () => ({ invoiceDataForPayment: jest.fn().mockResolvedValue({ invoice: true }) }));

import { Types } from 'mongoose';
import { sendEmail } from '@services/email/email.service';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { getUrlConfigs } from '@config/url-configs';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { CoinBalanceModel } from '@modules/finance/coin/coin.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '../../payment.model';
import {
  applyCoins,
  buildBuyerFields,
  computeQuote,
  freeSettlement,
  paymentService,
  razorpaySheet,
} from '../../payment.service';

/**
 * The money arithmetic behind every checkout and the Finance reads over it.
 * Defaults are the FinanceSettings schema's: 5% platform fee, 18% GST, ₹.
 * Every figure below is worked out by hand in the test that pins it.
 */

const mockMail = sendEmail as jest.Mock;
let seq = 0;

const settings = (over: Record<string, unknown>) =>
  FinanceSettingsModel.updateOne({ singleton_key: 'finance' }, { $set: over }, { upsert: true });

const seedPayment = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return PaymentModel.create({
    payment_id: `PAY-PR-${seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: `pr${seq}@x.com`,
    subtotal: 500,
    total: 500,
    ...over,
  });
};

describe('computeQuote', () => {
  it('extracts GST from an inclusive amount and takes the platform fee from the net', async () => {
    // 1180 incl. 18% GST: GST = 1180 × 18/118 = 180, net 1000, fee 5% of net = 50.
    expect(await computeQuote(1180)).toEqual({
      subtotal: 1000,
      platform_fee_pct: 5,
      platform_fee_amount: 50,
      gst_pct: 18,
      gst_amount: 180,
      total: 1180,
      currency_symbol: '₹',
      dummy_mode: true,
    });
  });

  it('adds GST on top when the amount is exclusive', async () => {
    expect(await computeQuote(1000, { inclusive: false })).toMatchObject({
      subtotal: 1000,
      gst_amount: 180,
      total: 1180,
      platform_fee_amount: 50,
    });
  });

  it('rounds each line to the paisa and never goes negative', async () => {
    // 499: GST = 499 × 18/118 = 76.118… → 76.12; net 422.88; fee 21.144 → 21.14.
    expect(await computeQuote(499)).toMatchObject({ gst_amount: 76.12, subtotal: 422.88, platform_fee_amount: 21.14, total: 499 });
    expect(await computeQuote(-50)).toMatchObject({ subtotal: 0, gst_amount: 0, total: 0, platform_fee_amount: 0 });
    expect(await computeQuote(Number.NaN)).toMatchObject({ total: 0 });
  });

  it('follows the configured rates', async () => {
    await settings({ gst_pct: 0, platform_fee_pct: 10, currency_symbol: '$', dummy_mode: false });
    expect(await computeQuote(200)).toEqual({
      subtotal: 200,
      platform_fee_pct: 10,
      platform_fee_amount: 20,
      gst_pct: 0,
      gst_amount: 0,
      total: 200,
      currency_symbol: '$',
      dummy_mode: false,
    });
  });
});

describe('applyCoins', () => {
  const user = () => new Types.ObjectId().toHexString();
  const wallet = (userId: string, balance: number) =>
    CoinBalanceModel.create({ user_id: new Types.ObjectId(userId), balance, lifetime_earned: balance });

  it('spends nothing when none are asked for', async () => {
    const quote = await computeQuote(500);
    expect(await applyCoins(0, user(), quote)).toEqual({ quote, coinsRedeemed: 0 });
    expect(await applyCoins('abc', user(), quote)).toEqual({ quote, coinsRedeemed: 0 });
  });

  it('clamps the ask to the live balance and re-prices the reduced bill', async () => {
    const id = user();
    await wallet(id, 100);
    const { quote, coinsRedeemed } = await applyCoins(500, id, await computeQuote(1180));
    expect(coinsRedeemed).toBe(100);
    expect(quote.total).toBe(1080);
  });

  it('clamps to the bill: a whole-rupee bill can be paid to exactly zero', async () => {
    const id = user();
    await wallet(id, 1000);
    const { quote, coinsRedeemed } = await applyCoins(1000, id, await computeQuote(500));
    expect(coinsRedeemed).toBe(500);
    expect(quote.total).toBe(0);
  });

  it('hands one coin back rather than leave a sub-₹1 remainder the gateway would reject', async () => {
    const id = user();
    await wallet(id, 1000);
    // ₹499.50: flooring to 499 coins would leave ₹0.50 to charge.
    const { quote, coinsRedeemed } = await applyCoins(1000, id, await computeQuote(499.5));
    expect(coinsRedeemed).toBe(498);
    expect(quote.total).toBe(1.5);
  });

  it('a bill too small to absorb any whole coin spends none', async () => {
    const id = user();
    await wallet(id, 10);
    const tiny = await computeQuote(1.5);
    expect(await applyCoins(10, id, tiny)).toEqual({ quote: tiny, coinsRedeemed: 0 });
    expect(await applyCoins(10, user(), await computeQuote(100))).toMatchObject({ coinsRedeemed: 0 });
  });
});

describe('pure checkout helpers', () => {
  it('freeSettlement names what paid for a zero-charge order', () => {
    expect(freeSettlement('FREE100')).toEqual({ gateway: 'COUPON', label: 'Coupon (100% off)' });
    expect(freeSettlement(null)).toEqual({ gateway: 'COINS', label: 'Duncit Coins' });
  });

  it('buildBuyerFields prefers structured billing and composes the one-line address', () => {
    const fields = buildBuyerFields(
      {
        contact_name: '  Ravi K ',
        contact_email: ' Ravi@X.com ',
        contact_phone_extension: '+91',
        contact_phone_number: ' 9876543210 ',
        billing: { line1: '12 MG Rd', city: 'Pune', pincode: '411001', gstin: ' 29abcde1234f1z5 ', email: 'Bills@X.com' },
      },
      { profile: { first_name: 'Ignored' } }
    );
    expect(fields).toMatchObject({
      user_name: 'Ravi K',
      user_email: 'ravi@x.com',
      user_phone: '+91 9876543210',
      billing: { name: 'Ravi K', email: 'bills@x.com', phone: '+91 9876543210', gstin: '29ABCDE1234F1Z5', line1: '12 MG Rd', city: 'Pune', country: 'India' },
    });
    expect(fields.billing_address).toContain('12 MG Rd');
    expect(fields.billing_address).toContain('411001');
  });

  it('buildBuyerFields falls back to the account name and keeps legacy free text verbatim, with no lone dialling code', () => {
    const fields = buildBuyerFields(
      { contact_email: 'a@x.com', contact_phone_extension: '+91', billing_address: ' Flat 4, Some Street ' },
      { profile: { first_name: 'Asha', last_name: 'Rao' } }
    );
    expect(fields).toMatchObject({ user_name: 'Asha Rao', user_phone: '', billing_address: 'Flat 4, Some Street' });
    expect(fields.billing).toMatchObject({ email: 'a@x.com', line1: 'Flat 4, Some Street', gstin: '' });
    expect(buildBuyerFields({}, { auth: { email: 'only@x.com' } }).user_name).toBe('only@x.com');
    expect(buildBuyerFields({}, {}).user_name).toBe('Customer');
  });

  it('razorpaySheet is exactly what the client opens', () => {
    expect(
      razorpaySheet({
        paymentDocId: 'doc1',
        keyId: 'rzp_test_1',
        orderId: 'order_1',
        amountPaise: 118000,
        businessName: 'Duncit',
        description: 'Pod booking · Hike',
        input: { contact_email: 'a@x.com' },
        currencySymbol: '₹',
        total: 1180,
        free: false,
        payment: null,
      })
    ).toEqual({
      payment_doc_id: 'doc1',
      key_id: 'rzp_test_1',
      order_id: 'order_1',
      amount: 118000,
      currency: 'INR',
      name: 'Duncit',
      description: 'Pod booking · Hike',
      prefill_email: 'a@x.com',
      prefill_contact: '',
      currency_symbol: '₹',
      total: 1180,
      free: false,
      payment: null,
    });
  });
});

describe('quoteCheckout', () => {
  const seedPod = (over: Record<string, unknown> = {}) =>
    PodModel.create({
      pod_id: `quote-pod-${++seq}`,
      pod_title: 'Hike',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'Hike',
      pod_date_time: new Date(Date.now() + 86_400_000),
      pod_type: 'PAID',
      pod_amount: 500,
      ...over,
    });

  it('a single seat (or no pod) prices the caller’s amount with no ticket discount', async () => {
    expect(await paymentService.quoteCheckout({ amount: 1180 })).toMatchObject({
      total: 1180,
      gst_amount: 180,
      ticket_discount_amount: 0,
      ticket_discount_pct: 0,
    });
  });

  it('multi-seat re-prices the ticket server-side with the best reached tier; add-ons stay full price', async () => {
    const pod = await seedPod({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 2, discount_pct: 10 },
        { min_tickets: 3, discount_pct: 20 },
      ],
    });
    // amount 650 = one ticket (500) + 150 of add-ons. 3 seats: 1500 less 20% = 1200, + 150 = 1350.
    const quote = await paymentService.quoteCheckout({ amount: 650, pod_id: String(pod._id), seats: 3 });
    expect(quote).toMatchObject({ total: 1350, ticket_discount_amount: 300, ticket_discount_pct: 20, gst_amount: 205.93 });
  });

  it('refuses a missing pod and more seats than are left', async () => {
    await expect(
      paymentService.quoteCheckout({ amount: 500, pod_id: new Types.ObjectId().toHexString(), seats: 2 })
    ).rejects.toThrow('Pod not found');
    const nearlyFull = await seedPod({ no_of_spots: 3, pod_attendees: [new Types.ObjectId(), new Types.ObjectId()] });
    await expect(paymentService.quoteCheckout({ amount: 500, pod_id: String(nearlyFull._id), seats: 2 })).rejects.toThrow(
      'Only 1 seat left on this pod'
    );
    const full = await seedPod({ no_of_spots: 1, extra_seats: 1 });
    await expect(paymentService.quoteCheckout({ amount: 500, pod_id: String(full._id), seats: 2 })).rejects.toMatchObject({
      message: 'Pod is full',
      extensions: { code: 'POD_FULL' },
    });
  });
});

describe('Finance reads', () => {
  it('totals counts SUCCESS money only, to the paisa, and is empty for any other status filter', async () => {
    const pod = new Types.ObjectId();
    await seedPayment({ status: 'SUCCESS', total: 100.1, platform_fee_amount: 4.25, gst_amount: 15.27, ticket_discount_amount: 10, pod_id: pod });
    await seedPayment({ status: 'SUCCESS', total: 200.2, platform_fee_amount: 8.5, gst_amount: 30.54, pod_id: pod });
    await seedPayment({ status: 'FAILED', total: 999 });
    await seedPayment({ status: 'REFUNDED', total: 999 });

    expect(await paymentService.totals()).toEqual({ count: 2, gross: 300.3, fee: 12.75, gst: 45.81, ticket_discount_total: 10 });
    expect(await paymentService.totals({ pod_id: String(pod), status: 'SUCCESS' })).toMatchObject({ count: 2 });
    expect(await paymentService.totals({ status: 'FAILED' })).toEqual({ count: 0, gross: 0, fee: 0, gst: 0, ticket_discount_total: 0 });
    expect(await paymentService.totals({ search: 'nobody-matches' })).toMatchObject({ count: 0, gross: 0 });
  });

  it('getForUser only returns the caller’s own payment', async () => {
    const p = await seedPayment();
    expect((await paymentService.getForUser(String(p._id), String(p.user_id)))?.payment_id).toBe(p.payment_id);
    expect(await paymentService.getForUser(String(p._id), new Types.ObjectId().toHexString())).toBeNull();
    expect(await paymentService.getForUser('junk', String(p.user_id))).toBeNull();
  });

  it('tableForStore and tableForPod are fixed to their own slice', async () => {
    const pod = new Types.ObjectId();
    const store = await seedPayment({ metadata: { store: { channel: 'PET_STORE' } } });
    const podPay = await seedPayment({ pod_id: pod });
    await seedPayment();

    const storeTable = await paymentService.tableForStore(null);
    expect(storeTable.rows.map((r) => r.payment_id)).toEqual([store.payment_id]);
    const podTable = await paymentService.tableForPod(String(pod), null);
    expect(podTable.rows.map((r) => r.payment_id)).toEqual([podPay.payment_id]);
    expect(await paymentService.tableForPod('junk', null)).toEqual({ rows: [], total: 0, page: 1, page_size: 0 });
  });
});

describe('refund', () => {
  it('only a SUCCESS payment can be refunded, so a second refund is refused', async () => {
    await expect(paymentService.refund(new Types.ObjectId().toHexString())).rejects.toThrow('Payment not found');
    const pending = await seedPayment();
    await expect(paymentService.refund(String(pending._id))).rejects.toThrow('Only SUCCESS payments can be refunded');

    const paid = await seedPayment({ status: 'SUCCESS', invoice_no: 'DUN/2627/000007', metadata: { keep: 1 } });
    const refunded = await paymentService.refund(String(paid._id), 'Venue closed');
    expect(refunded.status).toBe('REFUNDED');
    const row = await PaymentModel.findById(paid._id).lean();
    expect(row?.metadata).toMatchObject({ keep: 1, refund_reason: 'Venue closed' });
    expect(typeof row?.metadata.refunded_at).toBe('string');

    await expect(paymentService.refund(String(paid._id))).rejects.toThrow('Only SUCCESS payments can be refunded');
    expect(mockMail).toHaveBeenCalledTimes(1);
  });

  it('tells the payer with the invoice number, amount and processing days', async () => {
    const paid = await seedPayment({ status: 'SUCCESS', invoice_no: 'DUN/2627/000008', total: 1180 });
    await paymentService.refund(String(paid._id), 'Duplicate charge');
    const { appUrl } = await getUrlConfigs();
    expect(mockMail).toHaveBeenCalledWith({
      to: paid.user_email,
      subject: 'Refund initiated — DUN/2627/000008',
      template: 'order-refund',
      category: 'billing',
      vars: {
        name: 'Asha',
        order_no: 'DUN/2627/000008',
        amount: '₹1180.00',
        reason: 'Duplicate charge',
        refund_days: '7',
        order_url: appUrl,
      },
    });
  });

  it('falls back to the payment id and description, and survives a mail failure', async () => {
    const noInvoice = await seedPayment({ status: 'SUCCESS', description: 'Shop order' });
    await paymentService.refund(String(noInvoice._id));
    expect(mockMail.mock.calls[0][0]).toMatchObject({
      subject: `Refund initiated — ${noInvoice.payment_id}`,
      vars: expect.objectContaining({ order_no: noInvoice.payment_id, reason: 'Shop order' }),
    });
    expect((await PaymentModel.findById(noInvoice._id).lean())?.metadata.refund_reason).toBeNull();

    const flaky = await seedPayment({ status: 'SUCCESS' });
    mockMail.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(paymentService.refund(String(flaky._id))).resolves.toMatchObject({ status: 'REFUNDED' });
  });
});

describe('invoicePdfBase64', () => {
  it('serves the owner or an admin, and only once an invoice number exists', async () => {
    jest.mocked(generateInvoicePdf).mockResolvedValue(Buffer.from('%PDF-1.7'));
    const p = await seedPayment({ status: 'SUCCESS', invoice_no: 'DUN/2627/000009' });
    const owner = String(p.user_id);

    await expect(paymentService.invoicePdfBase64(new Types.ObjectId().toHexString(), owner, false)).rejects.toThrow('Payment not found');
    await expect(paymentService.invoicePdfBase64(String(p._id), new Types.ObjectId().toHexString(), false)).rejects.toThrow(
      'Not your invoice'
    );
    expect(await paymentService.invoicePdfBase64(String(p._id), owner, false)).toBe(Buffer.from('%PDF-1.7').toString('base64'));
    expect(await paymentService.invoicePdfBase64(String(p._id), 'admin', true)).toBe(Buffer.from('%PDF-1.7').toString('base64'));

    const draft = await seedPayment();
    await expect(paymentService.invoicePdfBase64(String(draft._id), String(draft.user_id), false)).rejects.toThrow(
      'No invoice generated for this payment'
    );
  });
});
