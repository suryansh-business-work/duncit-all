// A refused Razorpay signature must not strand a capture Razorpay really made.
// The verify is refused, the payment stays PENDING, and the reconciler — which
// asks Razorpay itself — adopts the capture and books the seat exactly once.
// Razorpay is stubbed at its module boundary; the finalizer, the seats, the
// membership, the ticket and the coin ledger are real.
const mockJob: { run?: () => Promise<unknown> } = {};
jest.mock('@utils/clusterJob', () => ({
  startClusterJob: jest.fn((job: { run: () => Promise<unknown> }) => {
    mockJob.run = job.run;
    return () => undefined;
  }),
}));
jest.mock('../../razorpay.gateway', () => ({
  getRazorpayKeys: jest.fn(),
  createRazorpayOrder: jest.fn(),
  verifyRazorpaySignature: jest.fn(),
  findCapturedPaymentForOrder: jest.fn(),
}));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/invoice/invoice.pdf', () => ({ generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')) }));
jest.mock('../../payment.invoice', () => ({ invoiceDataForPayment: jest.fn().mockResolvedValue({}) }));
jest.mock('@modules/crm/marketing/shortLinkJourney.service', () => ({
  shortLinkJourneyService: { attributePayment: jest.fn() },
}));

import { Types } from 'mongoose';
import {
  createRazorpayOrder,
  findCapturedPaymentForOrder,
  getRazorpayKeys,
  verifyRazorpaySignature,
} from '../../razorpay.gateway';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podSeatsTaken } from '@modules/pods/pod/pod.seats';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { PaymentModel } from '../../payment.model';
import { paymentService } from '../../payment.service';
import { startPaymentReconciler } from '../../payment.reconciler';

const mockVerify = jest.mocked(verifyRazorpaySignature);
const mockCaptured = jest.mocked(findCapturedPaymentForOrder);

beforeAll(async () => {
  await CoinTransactionModel.init();
});

beforeEach(() => {
  jest.mocked(getRazorpayKeys).mockResolvedValue({ keyId: 'rzp_test_key', keySecret: 'secret' });
  jest.mocked(createRazorpayOrder).mockResolvedValue({ id: 'order_FORGED1' });
});

async function sweep(): Promise<void> {
  startPaymentReconciler();
  if (!mockJob.run) throw new Error('the reconciler registered no job');
  await mockJob.run();
}

/** The capture sweep leaves a checkout alone for its first five minutes. */
const ageCheckout = (id: string) =>
  PaymentModel.collection.updateOne(
    { _id: new Types.ObjectId(id) },
    { $set: { created_at: new Date(Date.now() - 10 * 60_000), reconcile_checked_at: null } }
  );

async function openPodCheckout() {
  const user = await UserModel.create({
    auth: { email: `forged-${new Types.ObjectId().toString()}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    metadata: { status: 'ACTIVE' },
  });
  const pod = await PodModel.create({
    pod_id: `forged-pod-${new Types.ObjectId().toString()}`,
    pod_title: 'Hike',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'Hike',
    pod_date_time: new Date(Date.now() + 86_400_000),
    pod_type: 'PAID',
    pod_amount: 500,
    no_of_spots: 5,
  });
  const sheet = await paymentService.createRazorpayCheckout(
    {
      pod_id: String(pod._id),
      contact_email: 'asha@x.com',
      contact_phone_extension: '+91',
      contact_phone_number: '9876543210',
      billing: { line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' },
    },
    String(user._id)
  );
  return { user, pod, sheet };
}

describe('a refused signature on a payment Razorpay captured', () => {
  it('is adopted by the reconciler and booked exactly once', async () => {
    const { user, pod, sheet } = await openPodCheckout();
    const verify = {
      payment_doc_id: sheet.payment_doc_id,
      razorpay_order_id: 'order_FORGED1',
      razorpay_payment_id: 'pay_FORGED1',
      razorpay_signature: 'forged',
    };
    mockVerify.mockResolvedValue(false);

    await expect(paymentService.verifyRazorpayCheckout(verify, String(user._id))).rejects.toThrow(
      'Payment signature verification failed'
    );
    expect(await PodMemberModel.countDocuments({ pod_id: pod._id })).toBe(0);

    await ageCheckout(sheet.payment_doc_id);
    mockCaptured.mockResolvedValue({ id: 'pay_REAL1', amount: 50000 });
    await sweep();

    const paid = await PaymentModel.findById(sheet.payment_doc_id).lean();
    expect(paid).toMatchObject({ status: 'SUCCESS', gateway_ref: 'pay_REAL1', finalize_attempts: 1 });
    expect(paid?.metadata).toMatchObject({ razorpay_payment_id: 'pay_REAL1', verify_failures: 1 });

    // A second sweep and a late (now genuine) verify must not book again.
    await sweep();
    mockVerify.mockResolvedValue(true);
    await expect(paymentService.verifyRazorpayCheckout(verify, String(user._id))).rejects.toThrow(
      'Payment/order mismatch'
    );

    const members = await PodMemberModel.find({ pod_id: pod._id }).lean();
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ status: 'JOINED', payment_id: paid?._id });
    expect(await TicketModel.countDocuments({ membership_id: members[0]._id })).toBe(1);
    expect(podSeatsTaken((await PodModel.findById(pod._id).lean())!)).toBe(1);
    // Coins earned once, not once per sweep or verify.
    expect(paid?.coins_earned).toBeGreaterThan(0);
    expect(await CoinTransactionModel.countDocuments({ payment_id: paid?.payment_id, source: 'PAYMENT_EARN' })).toBe(1);
    expect((await PaymentModel.findById(sheet.payment_doc_id).lean())?.finalize_attempts).toBe(1);
  });

  it('stays PENDING and unbooked when Razorpay shows no capture', async () => {
    const { user, pod, sheet } = await openPodCheckout();
    mockVerify.mockResolvedValue(false);
    await expect(
      paymentService.verifyRazorpayCheckout(
        {
          payment_doc_id: sheet.payment_doc_id,
          razorpay_order_id: 'order_FORGED1',
          razorpay_payment_id: 'pay_FAKE',
          razorpay_signature: 'forged',
        },
        String(user._id)
      )
    ).rejects.toThrow('Payment signature verification failed');

    await ageCheckout(sheet.payment_doc_id);
    mockCaptured.mockResolvedValue(null);
    await sweep();

    expect(await PaymentModel.findById(sheet.payment_doc_id).lean()).toMatchObject({
      status: 'PENDING',
      gateway_ref: 'order_FORGED1',
      finalize_state: 'NOT_STARTED',
    });
    expect(await PodMemberModel.countDocuments({ pod_id: pod._id })).toBe(0);
  });
});

describe('a repeat verify of a payment that already settled', () => {
  /** A payment exactly as a successful verify leaves it: the payment id in
   * gateway_ref, the order id kept in metadata, booked and finished. */
  async function settledPayment() {
    const user = await UserModel.create({
      auth: { email: `repeat-${new Types.ObjectId().toString()}@x.com` },
      profile: { first_name: 'Asha', last_name: 'Rao' },
      metadata: { status: 'ACTIVE' },
    });
    const payment = await PaymentModel.create({
      payment_id: `repeat-${new Types.ObjectId().toString()}`,
      user_id: user._id,
      user_name: 'Asha Rao',
      user_email: 'asha@x.com',
      subtotal: 500,
      total: 500,
      status: 'SUCCESS',
      gateway: 'RAZORPAY',
      gateway_ref: 'pay_DONE1',
      paid_at: new Date('2026-10-01T10:00:00Z'),
      invoice_no: 'INV-REPEAT-1',
      finalize_state: 'COMPLETE',
      finalize_attempts: 1,
      metadata: { razorpay_order_id: 'order_DONE1', razorpay_payment_id: 'pay_DONE1' },
    });
    return { user, payment };
  }

  const verifyInput = (paymentDocId: unknown, over: Record<string, string> = {}) => ({
    payment_doc_id: String(paymentDocId),
    razorpay_order_id: 'order_DONE1',
    razorpay_payment_id: 'pay_DONE1',
    razorpay_signature: 'sig',
    ...over,
  });

  it('returns the same SUCCESS payment and writes nothing', async () => {
    const { user, payment } = await settledPayment();
    const before = await PaymentModel.findById(payment._id).lean();
    mockVerify.mockClear();
    mockVerify.mockResolvedValue(true);

    const out = await paymentService.verifyRazorpayCheckout(verifyInput(payment._id), String(user._id));

    expect(out).toMatchObject({
      id: String(payment._id),
      status: 'SUCCESS',
      gateway_ref: 'pay_DONE1',
      invoice_no: 'INV-REPEAT-1',
      finalize_state: 'COMPLETE',
    });
    // The signature is still checked against the stored order and payment.
    expect(mockVerify).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order_DONE1', paymentId: 'pay_DONE1', signature: 'sig' })
    );
    expect(await PaymentModel.findById(payment._id).lean()).toEqual(before);
  });

  it('still refuses a different Razorpay payment id on the same order', async () => {
    const { user, payment } = await settledPayment();
    const before = await PaymentModel.findById(payment._id).lean();
    mockVerify.mockResolvedValue(true);

    await expect(
      paymentService.verifyRazorpayCheckout(
        verifyInput(payment._id, { razorpay_payment_id: 'pay_OTHER' }),
        String(user._id)
      )
    ).rejects.toThrow('Payment/order mismatch');
    await expect(
      paymentService.verifyRazorpayCheckout(
        verifyInput(payment._id, { razorpay_order_id: 'order_OTHER' }),
        String(user._id)
      )
    ).rejects.toThrow('Payment/order mismatch');
    expect(await PaymentModel.findById(payment._id).lean()).toEqual(before);
  });

  it('still refuses a bad signature for the settled order and payment, without recording a failure', async () => {
    const { user, payment } = await settledPayment();
    const before = await PaymentModel.findById(payment._id).lean();
    mockVerify.mockResolvedValue(false);

    await expect(
      paymentService.verifyRazorpayCheckout(verifyInput(payment._id, { razorpay_signature: 'forged' }), String(user._id))
    ).rejects.toThrow('Payment signature verification failed');
    expect(await PaymentModel.findById(payment._id).lean()).toEqual(before);
  });

  it('is answered after a real verify, booking the seat once', async () => {
    const { user, pod, sheet } = await openPodCheckout();
    const verify = {
      payment_doc_id: sheet.payment_doc_id,
      razorpay_order_id: 'order_FORGED1',
      razorpay_payment_id: 'pay_TAPPED1',
      razorpay_signature: 'sig',
    };
    mockVerify.mockResolvedValue(true);

    const first = await paymentService.verifyRazorpayCheckout(verify, String(user._id));
    const again = await paymentService.verifyRazorpayCheckout(verify, String(user._id));

    expect(first).toMatchObject({ status: 'SUCCESS', gateway_ref: 'pay_TAPPED1' });
    expect(again).toMatchObject({ id: first.id, status: 'SUCCESS', gateway_ref: 'pay_TAPPED1', invoice_no: first.invoice_no });
    expect(await PodMemberModel.countDocuments({ pod_id: pod._id })).toBe(1);
    expect((await PaymentModel.findById(sheet.payment_doc_id).lean())?.finalize_attempts).toBe(1);
  });
});
