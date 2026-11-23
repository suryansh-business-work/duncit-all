jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn(),
  fetchRazorpayOrderPayments: jest.fn(),
  fetchRazorpayPayment: jest.fn(),
}));
jest.mock('@modules/finance/failedPayment/failedPayment.refund', () => ({
  ...jest.requireActual('@modules/finance/failedPayment/failedPayment.refund'),
  initiateFailedPaymentRefund: jest.fn().mockResolvedValue(null),
}));

import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { createRazorpayRefund, listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import { initiateFailedPaymentRefund } from '@modules/finance/failedPayment/failedPayment.refund';
import { FailedPaymentCaseModel } from '@modules/finance/failedPayment/failedPaymentCase.model';
import { PaymentEventModel } from '@modules/finance/failedPayment/paymentEvent.model';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { PaymentModel } from '../../payment.model';
import { PaymentGatewayRefundModel } from '../../payment.gatewayRefund.model';
import { paymentRefundSections, refundViewerFor } from '../../payment.refundSections.service';
import { refundToSource } from '../../payment.refundAction';
import { refundPaymentToSourceSchema } from '../../payment.validator';
import { validate } from '@utils/validate';

/**
 * The Refund area of one payment, read back from every engine that keeps a
 * refund, and Finance's "send it back to the same source" press. Razorpay is
 * faked: nothing here can move real money.
 */
const create = createRazorpayRefund as jest.Mock;
const list = listRazorpayRefunds as jest.Mock;
const failedRefund = initiateFailedPaymentRefund as jest.Mock;

const finance: AuthUser = { id: new Types.ObjectId().toHexString(), email: 'fin@duncit.com', roles: ['FINANCE_MANAGER'] } as AuthUser;
const city: AuthUser = { id: new Types.ObjectId().toHexString(), email: 'city@duncit.com', roles: ['CITY_ADMIN'] } as AuthUser;
const support: AuthUser = { id: new Types.ObjectId().toHexString(), email: 's@duncit.com', roles: ['SUPPORT_MANAGER'] } as AuthUser;

let seq = 0;
const makePayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `DPAY-RS-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    pod_id: new Types.ObjectId(),
    description: 'Pod booking',
    subtotal: 30.51,
    total: 36,
    currency_symbol: '₹',
    status: 'REFUNDED',
    gateway: 'RAZORPAY',
    gateway_ref: `pay_rzp${seq}`,
    metadata: { razorpay_payment_id: `pay_rzp${seq}`, razorpay_order_id: `order_${seq}` },
    ...over,
  });

type Payment = Awaited<ReturnType<typeof makePayment>>;

const makeRecord = (payment: Payment, over: Record<string, unknown> = {}) =>
  PaymentGatewayRefundModel.create({
    idempotency_key: `finance_refund:${String(payment._id)}:${++seq}`,
    payment_doc_id: payment._id,
    payment_id: payment.payment_id,
    pod_id: payment.pod_id,
    user_id: payment.user_id,
    source: 'FINANCE_REFUND',
    reason: 'Customer asked',
    amount_paise: 3600,
    razorpay_payment_id: String(payment.metadata.razorpay_payment_id),
    status: 'QUEUED',
    initiated_by: 'FINANCE',
    ...over,
  });

const section = async (payment: Payment, kind: string, viewer = refundViewerFor(finance)) =>
  (await paymentRefundSections(String(payment._id), viewer)).find((s) => s.kind === kind);

beforeEach(() => {
  create.mockReset();
  list.mockReset().mockResolvedValue([]);
  failedRefund.mockClear();
});

describe('paymentRefundSections', () => {
  it('has nothing to show for an unknown id or a payment that was never refunded', async () => {
    expect(await paymentRefundSections('not-an-id', refundViewerFor(finance))).toEqual([]);
    expect(await paymentRefundSections(String(new Types.ObjectId()), refundViewerFor(finance))).toEqual([]);
    const plain = await makePayment({ status: 'SUCCESS' });
    expect(await paymentRefundSections(String(plain._id), refundViewerFor(finance))).toEqual([]);
  });

  it('files a finished Finance refund under the pod payment with its Razorpay ids, and the coins apart', async () => {
    const payment = await makePayment();
    const record = await makeRecord(payment, { status: 'SUCCEEDED', razorpay_refund_id: 'rfnd_done', processed_at: new Date() });
    await PaymentEventModel.create({
      payment_doc_id: payment._id,
      type: 'REFUND_PROCESSED',
      source: 'WEBHOOK',
      data: { gateway_refund_id: String(record._id), razorpay_refund_id: 'rfnd_done' },
    });
    await CoinTransactionModel.create({
      user_id: payment.user_id,
      type: 'CREDIT',
      amount: 12,
      balance_after: 12,
      source: 'PAYMENT_REFUND',
      reason: 'Pod cancelled',
      payment_id: payment.payment_id,
      backout_id: `bk-${seq}`,
    });

    const sections = await paymentRefundSections(String(payment._id), refundViewerFor(finance));

    expect(sections.map((s) => s.kind)).toEqual(['COIN', 'POD_PAYMENT']);
    const pod = sections[1];
    expect(pod).toMatchObject({ state: 'COMPLETED', amount: 36 });
    expect(pod.entries[0]).toMatchObject({
      status: 'SUCCEEDED',
      razorpay_refund_id: 'rfnd_done',
      razorpay_refund_ids: ['rfnd_done'],
      razorpay_payment_id: payment.metadata.razorpay_payment_id,
      can_refund: false,
    });
    expect(pod.events.map((e) => e.type)).toEqual(['REFUND_PROCESSED']);
    expect(sections[0]).toMatchObject({ state: 'COMPLETED', coins: 12, amount: 0 });
  });

  it('files a refund of something that is not a pod booking under Payment, not Pod Payment', async () => {
    const payment = await makePayment({ target_type: 'PRODUCT', pod_id: null });
    await makeRecord(payment, { pod_id: null, status: 'SUCCEEDED', razorpay_refund_id: 'rfnd_shop' });
    expect((await paymentRefundSections(String(payment._id), refundViewerFor(finance))).map((s) => s.kind)).toEqual(['PAYMENT']);
  });

  it('colours a stuck refund red and offers Refund only to a role that may send it', async () => {
    const payment = await makePayment();
    await makeRecord(payment, { status: 'RECONCILIATION_REQUIRED', attempts: 5, last_error: 'Razorpay timeout' });

    const mine = await section(payment, 'POD_PAYMENT');
    expect(mine).toMatchObject({ state: 'FAILED' });
    expect(mine?.entries[0]).toMatchObject({ can_refund: true, error: 'Razorpay timeout', attempts: 5 });

    const theirs = await section(payment, 'POD_PAYMENT', refundViewerFor(support));
    expect(theirs?.entries[0].can_refund).toBe(false);
  });

  it('shows a held cancellation refund as pending and not Finance to hurry', async () => {
    const release = new Date('2030-01-01T10:00:00.000Z');
    const payment = await makePayment({
      status: 'SUCCESS',
      metadata: { razorpay_payment_id: 'pay_held', refund_hold: true, refund_hold_amount: 36, refund_hold_release_at: release },
    });
    const pod = await section(payment, 'POD_PAYMENT');
    expect(pod).toMatchObject({ state: 'PENDING', amount: 36 });
    expect(pod?.entries[0]).toMatchObject({ status: 'HELD', due_at: release.toISOString(), can_refund: false });
  });

  it('falls back to the stamps on the payment for a refund older than the refund engine', async () => {
    const payment = await makePayment({
      metadata: {
        razorpay_payment_id: 'pay_old',
        refunded_at: '2026-01-02T00:00:00.000Z',
        refunded_amount: 20,
        razorpay_refund_ids: ['rfnd_a', 'rfnd_b'],
        refund_reason: 'Duplicate booking',
      },
    });
    const pod = await section(payment, 'POD_PAYMENT');
    expect(pod?.entries).toHaveLength(1);
    expect(pod?.entries[0]).toMatchObject({
      status: 'RECORDED',
      amount: 20,
      razorpay_refund_ids: ['rfnd_a', 'rfnd_b'],
      reason: 'Duplicate booking',
      can_refund: false,
    });
  });

  it('lists a captured-but-unbooked payment under Failed Payment and ties its activity to the case', async () => {
    const payment = await makePayment({ status: 'SUCCESS', needs_refund: true, finalize_state: 'FAILED' });
    const kase = await FailedPaymentCaseModel.create({ payment_doc_id: payment._id, amount: 36, razorpay_payment_id: 'pay_x' });
    await PaymentEventModel.create({ payment_doc_id: payment._id, case_id: kase._id, type: 'REFUND_REQUESTED', source: 'FINANCE', data: { attempt: 1 } });
    await PaymentEventModel.create({ payment_doc_id: payment._id, type: 'CAPTURED', source: 'SERVER', data: {} });

    const failed = await section(payment, 'FAILED_PAYMENT');

    expect(failed).toMatchObject({ state: 'PENDING', amount: 36 });
    expect(failed?.entries[0]).toMatchObject({ id: String(kase._id), status: 'NOT_STARTED', can_refund: true });
    // Only refund activity belongs under the Refund heading.
    expect(failed?.events.map((e) => e.type)).toEqual(['REFUND_REQUESTED']);
  });

  it('keeps activity that names no refund of its own on the payment’s own refund', async () => {
    const payment = await makePayment();
    await makeRecord(payment, { status: 'PROCESSING', razorpay_refund_id: 'rfnd_p' });
    await PaymentEventModel.create({ payment_doc_id: payment._id, type: 'REFUND_FAILED', source: 'SERVER', data: {} });
    expect((await section(payment, 'POD_PAYMENT'))?.events.map((e) => e.type)).toEqual(['REFUND_FAILED']);
  });
});

describe('refundToSource', () => {
  const input = (payment: Payment, entryId: string, over: Record<string, unknown> = {}) => ({
    payment_doc_id: String(payment._id),
    kind: 'POD_PAYMENT' as const,
    entry_id: entryId,
    note: 'Customer waited three days',
    ...over,
  });

  it('sends a stuck refund back through the payment’s own Razorpay payment, once, and writes who pressed it and why', async () => {
    const payment = await makePayment();
    const record = await makeRecord(payment, { status: 'RECONCILIATION_REQUIRED', attempts: 5, last_error: 'timeout' });
    create.mockResolvedValue({ id: 'rfnd_new', status: 'processed', amount: 3600, receipt: `dr_${record._id}_1` });

    await refundToSource(input(payment, String(record._id), { client_request_id: 'req-1' }), finance);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ paymentId: payment.metadata.razorpay_payment_id, amountPaise: 3600 }));
    expect(await PaymentGatewayRefundModel.findById(record._id)).toMatchObject({ status: 'SUCCEEDED', razorpay_refund_id: 'rfnd_new' });
    const press = await PaymentEventModel.findOne({ payment_doc_id: payment._id, type: 'REFUND_REQUESTED' });
    expect(press).toMatchObject({ source: 'FINANCE', actor: { id: finance.id } });
    expect(press?.data).toMatchObject({ kind: 'POD_PAYMENT', entry_id: String(record._id), note: 'Customer waited three days', via: 'PAYMENT_DETAIL' });

    // The same refund can not be sent twice: the row is finished now.
    await expect(refundToSource(input(payment, String(record._id), { client_request_id: 'req-1' }), finance)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(await PaymentEventModel.countDocuments({ payment_doc_id: payment._id, type: 'REFUND_REQUESTED' })).toBe(1);
  });

  it.each([
    ['PROCESSING', 'already on its way'],
    ['SUCCEEDED', 'already been sent'],
  ])('refuses a refund that is %s and never calls Razorpay', async (status, message) => {
    const payment = await makePayment();
    const record = await makeRecord(payment, { status });
    await expect(refundToSource(input(payment, String(record._id)), finance)).rejects.toThrow(new RegExp(message));
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses to hurry a held cancellation refund', async () => {
    const payment = await makePayment({ status: 'SUCCESS', metadata: { razorpay_payment_id: 'pay_h', refund_hold: true, refund_hold_amount: 36 } });
    await expect(refundToSource(input(payment, `held:${String(payment._id)}`), finance)).rejects.toThrow(/released automatically/);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a refund that is not on this payment', async () => {
    const payment = await makePayment();
    const other = await makePayment();
    const foreign = await makeRecord(other, { status: 'FAILED', attempts: 5 });
    await expect(refundToSource(input(payment, String(foreign._id)), finance)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a caller whose role may not send that kind, before reading anything', async () => {
    const payment = await makePayment();
    const record = await makeRecord(payment, { status: 'FAILED', attempts: 5 });
    await expect(refundToSource(input(payment, String(record._id)), support)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    // A city admin may send a pod payment's refund but not a pod-shop refund.
    await expect(refundToSource(input(payment, 'x', { kind: 'POD_SHOP' }), city)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(refundToSource(input(payment, 'x', { kind: 'ECOMM' }), finance)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('hands a failed-payment refund to the case’s own refund with the case id and the actor', async () => {
    const payment = await makePayment({ status: 'SUCCESS', needs_refund: true, finalize_state: 'FAILED' });
    const kase = await FailedPaymentCaseModel.create({ payment_doc_id: payment._id, amount: 36 });

    await refundToSource(input(payment, String(kase._id), { kind: 'FAILED_PAYMENT', client_request_id: 'req-case-1' }), finance);

    expect(failedRefund).toHaveBeenCalledWith(String(kase._id), 'req-case-1', expect.objectContaining({ id: finance.id }));
    const press = await PaymentEventModel.findOne({ payment_doc_id: payment._id, case_id: kase._id, type: 'REFUND_REQUESTED' });
    expect(press?.data).toMatchObject({ kind: 'FAILED_PAYMENT', note: 'Customer waited three days' });
  });
});

describe('refundPaymentToSourceSchema', () => {
  const base = { payment_doc_id: 'p1', kind: 'POD_PAYMENT', entry_id: 'e1', note: 'Customer waited' };

  it('accepts a complete press and trims the note', async () => {
    expect(await validate(refundPaymentToSourceSchema, { ...base, note: '  Customer waited  ' })).toMatchObject({ note: 'Customer waited' });
  });

  it.each([
    ['a missing note', { note: '' }],
    ['a note under 3 characters', { note: 'ab' }],
    ['a note over 500 characters', { note: 'x'.repeat(501) }],
    ['an unknown kind', { kind: 'CASH' }],
    ['no refund chosen', { entry_id: '' }],
  ])('refuses %s with a field-level message', async (_label, over) => {
    await expect(validate(refundPaymentToSourceSchema, { ...base, ...over })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});
