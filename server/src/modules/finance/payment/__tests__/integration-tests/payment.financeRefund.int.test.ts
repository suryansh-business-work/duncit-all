jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn().mockResolvedValue([]),
}));

import { Types } from 'mongoose';
import { createRazorpayRefund } from '@modules/finance/payment/razorpay.gateway';
import { paymentService } from '../../payment.service';
import { PaymentModel } from '../../payment.model';
import { PaymentGatewayRefundModel } from '../../payment.gatewayRefund.model';

/**
 * Finance's Refund on a payment used to mark it refunded and nothing else —
 * the money was meant to go back by hand. It now goes back through Razorpay in
 * the same call, and the row says where the refund stands.
 */
const create = createRazorpayRefund as jest.Mock;

let seq = 0;
const makePayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `DPAY-FR-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    description: 'Pod booking',
    subtotal: 84.75,
    total: 100,
    currency_symbol: '₹',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    gateway_ref: `pay_fr${seq}`,
    metadata: { razorpay_payment_id: `pay_fr${seq}` },
    ...over,
  });

beforeEach(() => create.mockReset());

describe('paymentService.refund — Finance refunds through Razorpay', () => {
  it('sends the whole payment back and answers with Razorpay’s verdict on the row', async () => {
    const payment = await makePayment();
    create.mockResolvedValue({ id: 'rfnd_fin', status: 'processed', amount: 10000, receipt: 'dr_x_1' });

    const row = await paymentService.refund(String(payment._id), 'Duplicate booking', String(new Types.ObjectId()));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ paymentId: `pay_fr${seq}`, amountPaise: 10000 }));
    expect(row).toMatchObject({ status: 'REFUNDED', refund_status: 'SUCCEEDED', razorpay_refund_ids: ['rfnd_fin'] });
  });

  it('only sends what a Backout has not already returned', async () => {
    const payment = await makePayment({ metadata: { razorpay_payment_id: 'pay_partial', refunded_amount: 40 } });
    create.mockResolvedValue({ id: 'rfnd_rest', status: 'pending', amount: 6000, receipt: 'dr_y_1' });

    const row = await paymentService.refund(String(payment._id), 'Pod moved', undefined);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ paymentId: 'pay_partial', amountPaise: 6000 }));
    expect(row).toMatchObject({ refund_status: 'PROCESSING' });
  });

  it('keeps the refund (marked FAILED, retried by the sweep) when Razorpay refuses it, instead of losing it', async () => {
    const payment = await makePayment();
    create.mockRejectedValue(new Error('Razorpay refund failed: insufficient balance'));

    const row = await paymentService.refund(String(payment._id), 'Venue closed', undefined);

    expect(row).toMatchObject({ status: 'REFUNDED', refund_status: 'FAILED' });
    expect(await PaymentGatewayRefundModel.findOne({ payment_doc_id: payment._id })).toMatchObject({
      status: 'FAILED',
      source: 'FINANCE_REFUND',
      last_error: 'Razorpay refund failed: insufficient balance',
    });
  });

  it('records a test-gateway payment without calling Razorpay', async () => {
    const payment = await makePayment({ gateway: 'DUMMY', gateway_ref: 'dummy', metadata: {} });
    const row = await paymentService.refund(String(payment._id), 'Test', undefined);
    expect(create).not.toHaveBeenCalled();
    expect(row).toMatchObject({ status: 'REFUNDED', refund_status: 'NOT_APPLICABLE' });
  });

  it('refuses a second refund of the same payment and sends nothing more', async () => {
    const payment = await makePayment();
    create.mockResolvedValue({ id: 'rfnd_once', status: 'processed', amount: 10000, receipt: 'dr_z_1' });
    await paymentService.refund(String(payment._id), 'First', undefined);

    await expect(paymentService.refund(String(payment._id), 'Again', undefined)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
