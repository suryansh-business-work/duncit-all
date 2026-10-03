// The core's failure path, the buyer's failure notice and Finance's retry, on a
// real payments + coin ledger. Third parties (PDF, SMTP, WhatsApp, the ticket
// and seat services) are stubbed; the money-side services run for real so a
// retry is proven not to pay coins twice.
jest.mock('@services/invoice/invoice.pdf', () => ({ generateInvoicePdf: jest.fn() }));
jest.mock('../../payment.invoice', () => ({ invoiceDataForPayment: jest.fn().mockResolvedValue({}) }));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@modules/pods/ticket/ticket.service', () => ({
  ticketService: { emailById: jest.fn(), ensureForMembership: jest.fn() },
}));
jest.mock('@modules/pods/podMember/podMember.service', () => ({
  fillBackoutsAfterJoin: jest.fn(),
  podMemberService: { createPaidMembership: jest.fn() },
}));
jest.mock('@modules/pods/pod/pod.seats.service', () => ({ claimSeats: jest.fn() }));
jest.mock('@modules/engagement/leaderboard/leaderboard.service', () => ({
  leaderboardService: { awardPodJoin: jest.fn() },
}));
jest.mock('@modules/crm/marketing/shortLinkJourney.service', () => ({
  shortLinkJourneyService: { attributePayment: jest.fn() },
}));
jest.mock('@services/notify/notify.service', () => ({ notifyEvent: jest.fn() }));
jest.mock('@modules/pods/pod/pod.place', () => ({ podPlaceLine: jest.fn().mockResolvedValue('Hall A') }));

import { Types } from 'mongoose';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { sendEmail } from '@services/email/email.service';
import { ticketService } from '@modules/pods/ticket/ticket.service';
import { podMemberService } from '@modules/pods/podMember/podMember.service';
import { notifyEvent } from '@services/notify/notify.service';
import { CoinBalanceModel, CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PaymentModel, type IPaymentStep, type PaymentStepKey } from '../../payment.model';
import { paymentFinalizer } from '../../payment.finalize';

const mockNotify = notifyEvent as jest.Mock;
const mockMail = sendEmail as jest.Mock;

const DEFERRED: PaymentStepKey[] = [
  'BACKOUT_FILL',
  'LINK_ATTRIBUTION',
  'TICKET_EMAIL',
  'INVOICE_PDF',
  'RECEIPT_EMAIL',
  'GIFT_CARD_EMAIL',
  'SHIPMENT',
];

let seq = 0;
const step = (key: PaymentStepKey, status: IPaymentStep['status'], detail = '') => ({
  key,
  status,
  detail,
  refs: [],
  at: new Date(),
});

function seedPayment(over: Record<string, unknown> = {}) {
  seq += 1;
  return PaymentModel.create({
    payment_id: `PAY-RT-${seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: `rt${seq}@x.com`,
    subtotal: 500,
    total: 500,
    target_type: 'OTHER',
    description: 'Top-up',
    gateway: 'RAZORPAY',
    ...over,
  });
}

const reload = (id: unknown) => PaymentModel.findById(id).lean();
const stepOf = async (id: unknown, key: PaymentStepKey) => (await reload(id))?.steps.find((s) => s.key === key);

beforeAll(async () => {
  await CoinTransactionModel.init();
});

beforeEach(() => {
  jest.mocked(generateInvoicePdf).mockResolvedValue(Buffer.from('pdf'));
  mockMail.mockResolvedValue(undefined);
});

describe('finalizePayment', () => {
  it('commits the core once: SUCCESS, an invoice number, coins earned, and every deferred step seeded PENDING', async () => {
    const p = await seedPayment();

    await paymentFinalizer.finalizePayment(String(p._id), 'Razorpay');

    const row = await reload(p._id);
    expect(row).toMatchObject({
      status: 'SUCCESS',
      finalize_state: 'CORE_DONE',
      finalize_attempts: 1,
      needs_refund: false,
      finalize_error: null,
      coins_earned: 50, // default 10% pod/other rate on ₹500
    });
    expect(row?.invoice_no).toEqual(expect.any(String));
    expect(row?.paid_at).toBeInstanceOf(Date);
    const byKey = Object.fromEntries((row?.steps ?? []).map((s) => [s.key, s]));
    expect(byKey.PAYMENT_CAPTURED).toMatchObject({ status: 'DONE', detail: 'Razorpay', refs: [p.payment_id] });
    expect(byKey.SEATS_CLAIMED).toMatchObject({ status: 'SKIPPED', detail: 'This payment has no pod' });
    expect(byKey.COINS_EARNED).toMatchObject({ status: 'DONE', detail: '50 coins earned' });
    expect(byKey.COUPON_REDEEMED).toMatchObject({ status: 'SKIPPED', detail: 'No coupon was applied' });
    for (const key of DEFERRED) expect(byKey[key].status).toBe('PENDING');
  });

  it('a replayed webhook over a committed core changes nothing and burns no second invoice number', async () => {
    const p = await seedPayment();
    await paymentFinalizer.finalizePayment(String(p._id), 'Razorpay');
    const first = await reload(p._id);

    await paymentFinalizer.finalizePayment(String(p._id), 'Razorpay (webhook)');

    const second = await reload(p._id);
    expect(second?.invoice_no).toBe(first?.invoice_no);
    expect(second?.finalize_attempts).toBe(1);
    expect(second?.coins_earned).toBe(50);
    expect(await CoinTransactionModel.countDocuments({ payment_id: p.payment_id })).toBe(1);
    expect(await CoinBalanceModel.findOne({ user_id: p.user_id }).lean()).toMatchObject({ balance: 50 });
  });

  it('a core that cannot commit is marked FAILED for refund, keeps no invoice number, tells the buyer, and rethrows', async () => {
    // Coins applied at checkout that the buyer no longer holds.
    const p = await seedPayment({ coins_redeemed: 100, total: 400 });

    await expect(paymentFinalizer.finalizePayment(String(p._id), 'Razorpay')).rejects.toMatchObject({
      extensions: { code: 'COIN_BALANCE_CHANGED' },
    });

    const row = await reload(p._id);
    expect(row).toMatchObject({
      status: 'PENDING',
      finalize_state: 'FAILED',
      needs_refund: true,
      finalize_attempts: 1,
      invoice_no: null,
      coins_earned: 0,
    });
    expect(row?.finalize_error).toMatch(/no longer available/);
    // No pod on this payment: the notice is a recorded decision, not a silence.
    expect(await stepOf(p._id, 'PAYMENT_FAILED_NOTICE')).toMatchObject({
      status: 'SKIPPED',
      detail: 'This payment has no pod',
    });
    expect(mockNotify).not.toHaveBeenCalled();
    expect(await CoinTransactionModel.countDocuments({})).toBe(0);
  });

  it('a zero-charge settlement that fails needs no refund', async () => {
    const p = await seedPayment({ coins_redeemed: 100, total: 0 });
    await expect(paymentFinalizer.finalizePayment(String(p._id), 'Duncit Coins')).rejects.toThrow();
    expect((await reload(p._id))?.needs_refund).toBe(false);
  });

  it('a failed pod payment WhatsApps the buyer once, however many times finalization is retried', async () => {
    const club = await ClubModel.create({ club_id: 'rt-club', club_name: 'RT Club' });
    const pod = await PodModel.create({
      pod_id: 'rt-pod',
      pod_title: 'Night Cycling',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: club._id,
      pod_description: 'Ride',
      pod_date_time: new Date('2026-12-05T14:00:00Z'),
      pod_type: 'PAID',
      pod_amount: 400,
    });
    jest.mocked(podMemberService.createPaidMembership).mockResolvedValue({ _id: new Types.ObjectId() } as never);
    jest.mocked(ticketService.ensureForMembership).mockResolvedValue({ _id: new Types.ObjectId(), ticket_code: 'T-1' } as never);
    mockNotify.mockResolvedValue({ wa: { status: 'SENT', message_id: 'wa-77' } });
    const p = await seedPayment({ target_type: 'POD', pod_id: pod._id, coins_redeemed: 50, total: 350 });

    await expect(paymentFinalizer.finalizePayment(String(p._id), 'Razorpay')).rejects.toThrow();
    await expect(paymentFinalizer.finalizePayment(String(p._id), 'Razorpay')).rejects.toThrow();

    expect(mockNotify).toHaveBeenCalledTimes(1);
    const sent = mockNotify.mock.calls[0][0];
    expect(sent).toMatchObject({ event: 'USER_PAYMENT_FAILED', entityId: String(p._id), name: 'Asha', email: p.user_email });
    expect(sent.params[1]).toBe('Night Cycling');
    expect(sent.params[5]).toMatch(/\/club\/rt-club\/pod\/rt-pod$/);
    expect(sent.params[6]).toBe('A host');
    expect(sent.params[7]).toBe(p.payment_id);
    expect(await stepOf(p._id, 'PAYMENT_FAILED_NOTICE')).toMatchObject({ status: 'DONE', refs: ['wa-77'] });
    expect((await reload(p._id))?.finalize_attempts).toBe(2);
  });

  it('a notice the funnel could not deliver is recorded FAILED so the next pass tries again', async () => {
    const pod = await PodModel.create({
      pod_id: 'rt-pod-2',
      pod_title: 'Swim',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'Swim',
      pod_date_time: new Date('2026-12-06T14:00:00Z'),
      pod_type: 'FREE',
    });
    jest.mocked(podMemberService.createPaidMembership).mockResolvedValue({ _id: new Types.ObjectId() } as never);
    jest.mocked(ticketService.ensureForMembership).mockResolvedValue({ _id: new Types.ObjectId(), ticket_code: 'T-2' } as never);
    mockNotify.mockResolvedValueOnce({ wa: { status: 'FAILED', reason: 'AiSensy 500' } });
    const p = await seedPayment({ target_type: 'POD', pod_id: pod._id, coins_redeemed: 10 });

    await expect(paymentFinalizer.finalizePayment(String(p._id), 'Razorpay')).rejects.toThrow();
    expect(await stepOf(p._id, 'PAYMENT_FAILED_NOTICE')).toMatchObject({ status: 'FAILED', detail: 'AiSensy 500' });

    mockNotify.mockResolvedValueOnce({ wa: { status: 'SKIPPED', reason: 'Opted out' } });
    await expect(paymentFinalizer.finalizePayment(String(p._id), 'Razorpay')).rejects.toThrow();
    expect(await stepOf(p._id, 'PAYMENT_FAILED_NOTICE')).toMatchObject({ status: 'SKIPPED', detail: 'Opted out' });
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });
});

describe('retry', () => {
  it('refuses an unknown payment, a refunded one, an unknown step and a pre-ledger payment', async () => {
    await expect(paymentFinalizer.retry(new Types.ObjectId().toHexString())).rejects.toThrow('Payment not found');

    const refunded = await seedPayment({ status: 'REFUNDED', finalize_state: 'CORE_DONE' });
    await expect(paymentFinalizer.retry(String(refunded._id))).rejects.toThrow(
      'This payment has been refunded — there is nothing to re-run'
    );

    const done = await seedPayment({ status: 'SUCCESS', finalize_state: 'CORE_DONE' });
    await expect(paymentFinalizer.retry(String(done._id), ['SEATS_CLAIMED', 'bogus'])).rejects.toThrow(
      'These steps cannot be re-run on their own: SEATS_CLAIMED, bogus'
    );

    const legacy = await seedPayment({ status: 'SUCCESS', finalize_state: 'NOT_STARTED' });
    await expect(paymentFinalizer.retry(String(legacy._id))).rejects.toThrow(
      'This payment was settled before checkout recorded its steps'
    );
  });

  it('refuses when nothing is owed — including a payment that predates step tracking', async () => {
    const complete = await seedPayment({
      status: 'SUCCESS',
      finalize_state: 'COMPLETE',
      steps: DEFERRED.map((k) => step(k, k === 'SHIPMENT' ? 'SKIPPED' : 'DONE')),
    });
    await expect(paymentFinalizer.retry(String(complete._id))).rejects.toThrow(
      'Nothing on this payment is waiting to be re-run'
    );
    const untracked = await seedPayment({ status: 'SUCCESS', finalize_state: 'COMPLETE', steps: [] });
    await expect(paymentFinalizer.retry(String(untracked._id))).rejects.toThrow('Nothing on this payment');
  });

  it('re-opens just the requested failed row (with its paired step), resets the budget and runs only those', async () => {
    const p = await seedPayment({
      status: 'SUCCESS',
      invoice_no: 'INV/RT/1',
      finalize_state: 'CORE_DONE',
      side_effect_attempts: 6,
      side_effects_lease_at: new Date(),
      steps: [
        step('PAYMENT_CAPTURED', 'DONE', 'UPI'),
        ...DEFERRED.map((k) => {
          if (k === 'RECEIPT_EMAIL') return step(k, 'FAILED', 'mailbox full');
          if (k === 'TICKET_EMAIL') return step(k, 'FAILED', 'smtp down');
          return step(k, 'DONE');
        }),
      ],
    });

    await paymentFinalizer.retry(String(p._id), ['RECEIPT_EMAIL']);

    const row = await reload(p._id);
    const byKey = Object.fromEntries((row?.steps ?? []).map((s) => [s.key, s]));
    expect(byKey.RECEIPT_EMAIL.status).toBe('DONE');
    // INVOICE_PDF was DONE so it is not owed; only the receipt itself re-ran.
    expect(mockMail).toHaveBeenCalledTimes(1);
    expect(byKey.TICKET_EMAIL).toMatchObject({ status: 'FAILED', detail: 'smtp down' });
    expect(ticketService.emailById).not.toHaveBeenCalled();
    expect(row).toMatchObject({ side_effect_attempts: 0, side_effects_lease_at: null, finalize_state: 'CORE_DONE' });
  });

  it('with no selection re-runs everything still owed and completes the payment', async () => {
    const p = await seedPayment({
      status: 'SUCCESS',
      invoice_no: 'INV/RT/2',
      finalize_state: 'CORE_DONE',
      steps: DEFERRED.map((k) => (k === 'SHIPMENT' ? step(k, 'FAILED', 'courier 401') : step(k, 'DONE'))),
    });

    await paymentFinalizer.retry(String(p._id));

    expect(await stepOf(p._id, 'SHIPMENT')).toMatchObject({ status: 'SKIPPED', detail: 'Nothing on this payment ships' });
    expect(mockMail).not.toHaveBeenCalled();
    expect((await reload(p._id))?.finalize_state).toBe('COMPLETE');
  });

  it('a FAILED core is re-run whole, and a second retry cannot pay the coins twice', async () => {
    const p = await seedPayment({ finalize_state: 'FAILED', side_effect_attempts: 6, steps: [step('PAYMENT_CAPTURED', 'DONE', 'UPI')] });

    await paymentFinalizer.retry(String(p._id));

    const row = await reload(p._id);
    expect(row).toMatchObject({ status: 'SUCCESS', finalize_state: 'COMPLETE', coins_earned: 50, side_effect_attempts: 0 });
    expect(row?.steps.find((s) => s.key === 'PAYMENT_CAPTURED')?.detail).toBe('UPI');
    expect(mockMail).toHaveBeenCalledTimes(1);

    await expect(paymentFinalizer.retry(String(p._id))).rejects.toThrow('Nothing on this payment is waiting to be re-run');
    expect(await CoinTransactionModel.countDocuments({ payment_id: p.payment_id, source: 'PAYMENT_EARN' })).toBe(1);
    expect(await CoinBalanceModel.findOne({ user_id: p.user_id }).lean()).toMatchObject({ balance: 50, lifetime_earned: 50 });
  });
});
