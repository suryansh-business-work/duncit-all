// Live-checkout paths against a real payments + coin ledger. Razorpay is the
// only gateway and it is stubbed at its module boundary; the invoice PDF and
// SMTP behind the deferred phase 2 are stubbed so that phase can finish fast.
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
jest.mock('@modules/finance/giftcard/giftcard.service', () => ({
  giftcardService: { assertPurchaseEnabled: jest.fn(), purchaseFacts: jest.fn(), emailForPayment: jest.fn(), issueForPayment: jest.fn() },
}));

import { Types } from 'mongoose';
import { createRazorpayOrder, getRazorpayKeys, verifyRazorpaySignature } from '../../razorpay.gateway';
import { giftcardService } from '@modules/finance/giftcard/giftcard.service';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { CoinBalanceModel, CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PaymentModel } from '../../payment.model';
import { paymentService } from '../../payment.service';

const mockOrder = jest.mocked(createRazorpayOrder);
const mockVerify = jest.mocked(verifyRazorpaySignature);
let seq = 0;

beforeAll(async () => {
  await CoinTransactionModel.init();
});

beforeEach(() => {
  jest.mocked(getRazorpayKeys).mockResolvedValue({ keyId: 'rzp_test_key', keySecret: 'secret' });
  mockOrder.mockResolvedValue({ id: 'order_TEST1' });
});

const seedUser = () =>
  UserModel.create({
    auth: { email: `checkout${++seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    metadata: { status: 'ACTIVE' },
  });

const checkoutInput = (over: Record<string, unknown> = {}) => ({
  amount: 1180,
  description: 'Membership top-up',
  contact_email: 'asha@x.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' },
  ...over,
});

/** Phase 2 is fired without being awaited; let it land before the suite's
 * collections are wiped, so it never writes into the next test. */
async function settled(paymentDocId: unknown) {
  for (let i = 0; i < 100; i++) {
    const row = await PaymentModel.findById(paymentDocId).select('finalize_state').lean();
    if (row?.finalize_state === 'COMPLETE') return row;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
  }
  throw new Error('phase 2 never completed');
}

describe('createRazorpayCheckout', () => {
  it('opens a gateway order for the exact paise and records a PENDING payment against it', async () => {
    const user = await seedUser();

    const sheet = await paymentService.createRazorpayCheckout(checkoutInput(), String(user._id));

    expect(sheet).toMatchObject({
      key_id: 'rzp_test_key',
      order_id: 'order_TEST1',
      amount: 118000,
      currency: 'INR',
      name: 'Duncit',
      description: 'Membership top-up',
      prefill_email: 'asha@x.com',
      prefill_contact: '9876543210',
      total: 1180,
      free: false,
      payment: null,
    });
    const doc = await PaymentModel.findById(sheet.payment_doc_id).lean();
    expect(doc).toMatchObject({
      status: 'PENDING',
      gateway: 'RAZORPAY',
      gateway_ref: 'order_TEST1',
      target_type: 'OTHER',
      subtotal: 1000,
      gst_amount: 180,
      platform_fee_amount: 50,
      total: 1180,
      invoice_no: null,
      user_phone: '+91 9876543210',
    });
    expect(doc?.metadata).toMatchObject({ razorpay_order_id: 'order_TEST1', original_total: 1180, source: 'app_checkout' });
    expect(mockOrder).toHaveBeenCalledWith({
      amountPaise: 118000,
      currency: 'INR',
      receipt: doc?.payment_id,
      notes: { pod_id: '', user_id: String(user._id) },
    });
  });

  it('coins covering the whole bill skip the gateway and settle at once, debiting the coins exactly once', async () => {
    const user = await seedUser();
    await CoinBalanceModel.create({ user_id: user._id, balance: 2000, lifetime_earned: 2000 });

    const sheet = await paymentService.createRazorpayCheckout(checkoutInput({ redeem_coins: 5000 }), String(user._id));

    expect(mockOrder).not.toHaveBeenCalled();
    expect(sheet).toMatchObject({ free: true, amount: 0, order_id: '', total: 0 });
    expect(sheet.payment).toMatchObject({ status: 'SUCCESS', gateway: 'COINS', total: 0, coins_redeemed: 1180 });
    await settled(sheet.payment_doc_id);
    expect(await CoinBalanceModel.findOne({ user_id: user._id }).lean()).toMatchObject({ balance: 820, lifetime_earned: 2000 });
    expect(await CoinTransactionModel.countDocuments({ user_id: user._id, source: 'PAYMENT_REDEEM' })).toBe(1);
    // Nothing was paid in money, so nothing is earned back.
    expect(await CoinTransactionModel.countDocuments({ user_id: user._id, source: 'PAYMENT_EARN' })).toBe(0);
  });

  it('refuses an unknown buyer, an invalid coupon and a non-positive amount before any order is opened', async () => {
    await expect(paymentService.createRazorpayCheckout(checkoutInput(), new Types.ObjectId().toHexString())).rejects.toThrow(
      'User not found'
    );
    const user = await seedUser();
    await expect(
      paymentService.createRazorpayCheckout(checkoutInput({ coupon_code: 'NOPE' }), String(user._id))
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(paymentService.createRazorpayCheckout(checkoutInput({ amount: 0 }), String(user._id))).rejects.toThrow(
      'Amount must be greater than 0'
    );
    expect(mockOrder).not.toHaveBeenCalled();
    expect(await PaymentModel.countDocuments({})).toBe(0);
  });
});

describe('verifyRazorpayCheckout', () => {
  async function opened() {
    const user = await seedUser();
    const sheet = await paymentService.createRazorpayCheckout(checkoutInput(), String(user._id));
    return { user, sheet };
  }
  const verifyArgs = (paymentDocId: string) => ({
    payment_doc_id: paymentDocId,
    razorpay_order_id: 'order_TEST1',
    razorpay_payment_id: 'pay_TEST1',
    razorpay_signature: 'sig',
  });

  it('a bad signature marks the payment FAILED and books nothing', async () => {
    const { user, sheet } = await opened();
    mockVerify.mockResolvedValueOnce(false);

    await expect(paymentService.verifyRazorpayCheckout(verifyArgs(sheet.payment_doc_id), String(user._id))).rejects.toThrow(
      'Payment signature verification failed'
    );

    expect(await PaymentModel.findById(sheet.payment_doc_id).lean()).toMatchObject({
      status: 'FAILED',
      invoice_no: null,
      finalize_state: 'NOT_STARTED',
      gateway_ref: 'order_TEST1',
    });
  });

  it('a good signature swaps in the payment id, settles once, and a replayed verify pays nothing twice', async () => {
    const { user, sheet } = await opened();
    mockVerify.mockResolvedValue(true);

    const first = await paymentService.verifyRazorpayCheckout(verifyArgs(sheet.payment_doc_id), String(user._id));
    expect(first).toMatchObject({ status: 'SUCCESS', total: 1180 });
    expect(first.invoice_no).toEqual(expect.any(String));
    expect(mockVerify).toHaveBeenCalledWith({ orderId: 'order_TEST1', paymentId: 'pay_TEST1', signature: 'sig', account: undefined });
    await settled(sheet.payment_doc_id);

    const again = await paymentService.verifyRazorpayCheckout(verifyArgs(sheet.payment_doc_id), String(user._id)).catch((e) => e);
    // After the first verify the gateway_ref holds the payment id, so a replay
    // with the order id is refused as a mismatch rather than re-settled.
    expect(again).toBeInstanceOf(Error);
    expect((again as Error).message).toBe('Payment/order mismatch');

    const row = await PaymentModel.findById(sheet.payment_doc_id).lean();
    expect(row).toMatchObject({ gateway_ref: 'pay_TEST1', finalize_attempts: 1, coins_earned: 118, finalize_state: 'COMPLETE' });
    expect(row?.metadata).toMatchObject({ razorpay_order_id: 'order_TEST1', razorpay_payment_id: 'pay_TEST1' });
    expect(await CoinTransactionModel.countDocuments({ payment_id: row?.payment_id, source: 'PAYMENT_EARN' })).toBe(1);
    expect(await CoinBalanceModel.findOne({ user_id: user._id }).lean()).toMatchObject({ balance: 118 });
  });
});

describe('dummyCheckout guards', () => {
  const seedPod = (over: Record<string, unknown> = {}) =>
    PodModel.create({
      pod_id: `chk-pod-${++seq}`,
      pod_title: 'Hike',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'Hike',
      pod_date_time: new Date(Date.now() + 86_400_000),
      pod_type: 'PAID',
      pod_amount: 500,
      ...over,
    });

  it('refuses when dummy mode is off, or the buyer does not exist', async () => {
    await FinanceSettingsModel.updateOne({ singleton_key: 'finance' }, { $set: { dummy_mode: false } }, { upsert: true });
    const user = await seedUser();
    await expect(paymentService.dummyCheckout(checkoutInput(), String(user._id))).rejects.toThrow(
      'Live payment gateway is not configured. Enable dummy mode to test.'
    );
    await FinanceSettingsModel.updateOne({ singleton_key: 'finance' }, { $set: { dummy_mode: true } });
    await expect(paymentService.dummyCheckout(checkoutInput(), new Types.ObjectId().toHexString())).rejects.toThrow(
      'User not found'
    );
  });

  it('refuses a pod that already took place, or one this account already holds', async () => {
    const user = await seedUser();
    const past = await seedPod({ pod_date_time: new Date(Date.now() - 3_600_000) });
    await expect(paymentService.dummyCheckout(checkoutInput({ pod_id: String(past._id) }), String(user._id))).rejects.toThrow(
      'This pod has already taken place — booking is closed.'
    );

    const pod = await seedPod();
    await PodMemberModel.create({ pod_id: pod._id, user_id: user._id, status: 'JOINED' });
    await expect(paymentService.dummyCheckout(checkoutInput({ pod_id: String(pod._id) }), String(user._id))).rejects.toMatchObject({
      message: 'You have already booked this pod.',
      extensions: { code: 'ALREADY_BOOKED' },
    });

    const other = await seedPod();
    await PodMemberModel.create({ pod_id: other._id, user_id: user._id, status: 'BACKOUT_IN_PROCESS' });
    await expect(paymentService.dummyCheckout(checkoutInput({ pod_id: String(other._id) }), String(user._id))).rejects.toThrow(
      /Keep My Spot/
    );
    expect(await PaymentModel.countDocuments({})).toBe(0);
  });

  it('a simulated gateway failure records a FAILED payment and finalizes nothing', async () => {
    const user = await seedUser();
    const pub = await paymentService.dummyCheckout(checkoutInput({ simulate_failure: true }), String(user._id));
    expect(pub).toMatchObject({ status: 'FAILED', gateway: 'DUMMY', invoice_no: null, total: 1180 });
    expect((await PaymentModel.findById(pub.id).lean())?.finalize_state).toBe('NOT_STARTED');
  });
});

describe('createRazorpayGiftCardCheckout', () => {
  const facts = {
    scope_type: 'POD_SHOP',
    scope_category_id: null,
    scope_name: 'Trekking',
    scope_image_url: '',
    scope_image_front_url: '',
    scope_image_back_url: '',
    amount: 1500,
    recipient_email: 'friend@x.com',
    recipient_name: 'Friend',
    message: 'Enjoy',
  };

  it('charges exactly the face value — no fee, no GST — and freezes the card facts on the payment', async () => {
    const user = await seedUser();
    jest.mocked(giftcardService.purchaseFacts).mockResolvedValue(facts as never);

    const sheet = await paymentService.createRazorpayGiftCardCheckout({ contact_email: 'asha@x.com' }, String(user._id));

    expect(giftcardService.assertPurchaseEnabled).toHaveBeenCalled();
    expect(sheet).toMatchObject({ amount: 150000, total: 1500, free: false, description: 'Gift card · Trekking' });
    expect(mockOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 150000, notes: { kind: 'gift_card', user_id: String(user._id) } })
    );
    const doc = await PaymentModel.findById(sheet.payment_doc_id).lean();
    expect(doc).toMatchObject({
      target_type: 'GIFT_CARD',
      subtotal: 1500,
      total: 1500,
      gst_amount: 0,
      platform_fee_amount: 0,
      coupon_code: null,
      coins_redeemed: 0,
      status: 'PENDING',
      gateway_ref: 'order_TEST1',
    });
    expect(doc?.metadata).toMatchObject({ source: 'app_giftcard_checkout', gift_card: facts, razorpay_order_id: 'order_TEST1' });
  });

  it('a card with no scope name is a Pod Shop card; purchase switched off opens no order', async () => {
    const user = await seedUser();
    jest.mocked(giftcardService.purchaseFacts).mockResolvedValue({ ...facts, scope_name: '' } as never);
    const sheet = await paymentService.createRazorpayGiftCardCheckout({ contact_email: 'asha@x.com' }, String(user._id));
    expect(sheet.description).toBe('Gift card · Pod Shop');

    mockOrder.mockClear();
    jest.mocked(giftcardService.assertPurchaseEnabled).mockRejectedValueOnce(new Error('Gift cards are switched off'));
    await expect(paymentService.createRazorpayGiftCardCheckout({ contact_email: 'asha@x.com' }, String(user._id))).rejects.toThrow('Gift cards are switched off');
    expect(mockOrder).not.toHaveBeenCalled();
  });
});
