jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn(),
}));
jest.mock('@services/notify/notify.service', () => ({
  notifyEvent: jest.fn().mockResolvedValue({ wa: { status: 'SENT', reason: '', message_id: 'm1' }, mail: null }),
}));
jest.mock('@services/notify/staffAlert', () => ({ alertStaff: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { createRazorpayRefund, listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import { notifyEvent } from '@services/notify/notify.service';
import { alertStaff } from '@services/notify/staffAlert';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PaymentGatewayRefundModel } from '@modules/finance/payment/payment.gatewayRefund.model';
import {
  GATEWAY_REFUND_MAX_ATTEMPTS,
  applyRazorpayRefund,
  processGatewayRefund,
  queueGatewayRefund,
} from '@modules/finance/payment/payment.gatewayRefund';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { RentalBookingModel, type IRentalBooking } from '../../rentalBooking.model';
import { queueRentalRefund, rentalRefundKey, runRentalRefundSweep, sendRentalRefundByFinance } from '../../rentalRefund.service';
import { rentalLifecycleService } from '../../rentalLifecycle.service';
import { rentalRefundMoney } from '../../rentalRefundState';
import { venueRentalResolvers } from '../../venueRental.resolver';

/**
 * A rented item's refund goes back through Razorpay — at most once, never past
 * what was captured, and never "paid" until Razorpay says processed. Razorpay
 * and the message funnel are faked: no test here can move money or message anyone.
 */
const create = createRazorpayRefund as jest.Mock;
const list = listRazorpayRefunds as jest.Mock;
const notify = notifyEvent as jest.Mock;

let seq = 0;
async function makePayment(over: Record<string, unknown> = {}) {
  seq += 1;
  return PaymentModel.create({
    payment_id: `DPAY-RENT-${seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    pod_id: new Types.ObjectId(),
    description: 'Pod booking',
    subtotal: 8.47,
    total: 10,
    currency_symbol: '₹',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    gateway_ref: `pay_rent${seq}`,
    metadata: { razorpay_payment_id: `pay_rent${seq}` },
    ...over,
  });
}

type Payment = Awaited<ReturnType<typeof makePayment>>;

async function makeBooking(payment: Payment, over: Partial<IRentalBooking> = {}) {
  return RentalBookingModel.create({
    payment_doc_id: payment._id,
    payment_ref: payment.payment_id,
    pod_id: payment.pod_id,
    venue_id: new Types.ObjectId(),
    user_id: payment.user_id,
    item_id: new Types.ObjectId(),
    name: 'UNO Cards',
    unit: 'SLOT',
    rate: 1,
    units: 1,
    quantity: 1,
    rent_amount: 1,
    deposit_amount: 0,
    status: 'RELEASED',
    refund_due: 1,
    refund_status: 'DUE',
    ...over,
  });
}

const reload = async (id: unknown) => (await RentalBookingModel.findById(id).lean<IRentalBooking>())!;
const asCtx = (id: string, roles: string[]) => ({ user: { id, roles } }) as unknown as GraphQLContext;

beforeEach(() => {
  create.mockReset();
  list.mockReset().mockResolvedValue([]);
  notify.mockClear();
  (alertStaff as jest.Mock).mockClear();
});

describe('queueRentalRefund', () => {
  it('queues one RENTAL refund on the captured Razorpay payment and mirrors it on the booking', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment);
    const after = await queueRentalRefund(booking._id);
    const record = await PaymentGatewayRefundModel.findOne({ idempotency_key: rentalRefundKey(booking._id) }).lean();
    expect(record).toMatchObject({ source: 'RENTAL', amount_paise: 100, status: 'QUEUED', razorpay_payment_id: payment.gateway_ref });
    expect(String(after?.gateway_refund_id)).toBe(String(record?._id));
    expect(after?.refund_gateway_status).toBe('QUEUED');
    expect(after?.events.map((e) => e.type)).toEqual(['REFUND_QUEUED']);
    expect(rentalRefundMoney(after!).state).toBe('PROCESSING');
  });

  it('queues nothing twice, and nothing for a booking that owes nothing', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment);
    await queueRentalRefund(booking._id);
    await queueRentalRefund(booking._id);
    expect(await PaymentGatewayRefundModel.countDocuments({ payment_doc_id: payment._id })).toBe(1);
    const nothing = await makeBooking(payment, { status: 'RETURNED', refund_due: 0, refund_status: 'NONE' });
    await queueRentalRefund(nothing._id);
    expect(await PaymentGatewayRefundModel.countDocuments({ payment_doc_id: payment._id })).toBe(1);
  });

  it('holds a refund for review when it would push the payment past what was captured', async () => {
    // The Test Backout_pod1 shape: ₹10 captured, ₹7.65 already sent back for the seat.
    const payment = await makePayment();
    await queueGatewayRefund({ payment, amount: 7.65, key: 'backout:x', source: 'BACKOUT', reason: 'Backout', initiatedBy: 'FINANCE' });
    const tooMuch = await makeBooking(payment, { rent_amount: 3, refund_due: 3 });
    const held = await queueRentalRefund(tooMuch._id);
    expect(held?.gateway_refund_id).toBeNull();
    expect(held?.refund_review_reason).toMatch(/past the 10 captured/);
    expect(rentalRefundMoney(held!).state).toBe('REQUIRES_REVIEW');
    expect(await PaymentGatewayRefundModel.countDocuments({ idempotency_key: rentalRefundKey(tooMuch._id) })).toBe(0);
    // The ₹1 rental still fits beside the ₹7.65 (8.65 ≤ 10).
    const fits = await makeBooking(payment);
    expect((await queueRentalRefund(fits._id))?.refund_gateway_status).toBe('QUEUED');
  });

  it('holds a payment Duncit never took through Razorpay for review instead of claiming a refund', async () => {
    const payment = await makePayment({ gateway: 'DUMMY', gateway_ref: 'dummy_1', metadata: {} });
    const booking = await makeBooking(payment);
    const after = await queueRentalRefund(booking._id);
    expect(after?.refund_gateway_status).toBe('NOT_APPLICABLE');
    expect(after?.refund_review_reason).toMatch(/no Razorpay money/);
    expect(after?.refund_status).toBe('DUE');
  });
});

describe('following Razorpay', () => {
  it('reads PAID only when Razorpay processed it, tells the guest once, and ignores a redelivered webhook', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment);
    const queued = await queueRentalRefund(booking._id);
    create.mockResolvedValue({ id: 'rfnd_rent1', status: 'pending', amount: 100, receipt: `dr_${queued!.gateway_refund_id}_1` });
    await processGatewayRefund(queued!.gateway_refund_id!);
    let now = await reload(booking._id);
    expect(now.refund_status).toBe('DUE');
    expect(rentalRefundMoney(now).state).toBe('PROCESSING');
    expect(notify).not.toHaveBeenCalled();

    const processed = { id: 'rfnd_rent1', status: 'processed', amount: 100, receipt: `dr_${queued!.gateway_refund_id}_1` };
    await applyRazorpayRefund(queued!.gateway_refund_id!, processed, 'WEBHOOK');
    now = await reload(booking._id);
    expect(now).toMatchObject({ refund_status: 'PAID', refund_ref: 'rfnd_rent1', refunded_amount: 1, refund_gateway_status: 'SUCCEEDED' });
    expect(rentalRefundMoney(now)).toMatchObject({ state: 'REFUNDED', refunded: 1, outstanding: 0 });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ event: 'USER_REFUND_PROCESSED', entityId: `rental_refund:${String(booking._id)}` });

    await applyRazorpayRefund(queued!.gateway_refund_id!, processed, 'WEBHOOK');
    expect(notify).toHaveBeenCalledTimes(1);
    expect((await reload(booking._id)).events.filter((e) => e.type === 'REFUND_SUCCEEDED')).toHaveLength(1);
  });

  it('hands a refund Razorpay kept refusing to Finance, and tells the guest it is delayed', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment);
    const queued = await queueRentalRefund(booking._id);
    create.mockRejectedValue(new Error('Razorpay: refund amount exceeds'));
    for (let i = 0; i < GATEWAY_REFUND_MAX_ATTEMPTS; i += 1) {
      await PaymentGatewayRefundModel.updateOne({ _id: queued!.gateway_refund_id }, { $set: { next_attempt_at: new Date(0) } });
      await processGatewayRefund(queued!.gateway_refund_id!);
    }
    const now = await reload(booking._id);
    expect(now.refund_gateway_status).toBe('RECONCILIATION_REQUIRED');
    expect(rentalRefundMoney(now)).toMatchObject({ state: 'REQUIRES_REVIEW', outstanding: 1 });
    expect(notify.mock.calls.map((c) => c[0].event)).toContain('USER_RENTAL_REFUND_DELAYED');
    expect(alertStaff).toHaveBeenCalledWith(expect.objectContaining({ desk: 'FINANCE' }));
  });
});

describe('sendRentalRefundByFinance', () => {
  it('re-sends the hand-marked ₹1 refund through Razorpay, voiding the typed reference on the record', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment, { refund_status: 'PAID', refund_ref: 'sd', refunded_at: new Date() });
    const actor = new Types.ObjectId().toHexString();
    await sendRentalRefundByFinance(actor, String(booking._id), 'Checked Razorpay: nothing was refunded for this item');
    const now = await reload(booking._id);
    expect(now).toMatchObject({ refund_status: 'DUE', refund_ref: '', refund_gateway_status: 'QUEUED' });
    expect(now.events.map((e) => e.type)).toEqual(['MANUAL_MARK_VOIDED', 'FINANCE_SENT_REFUND', 'REFUND_QUEUED']);
    expect(now.events[0].detail).toContain('"sd"');
    expect(await PaymentGatewayRefundModel.countDocuments({ idempotency_key: rentalRefundKey(booking._id) })).toBe(1);
  });

  it('refuses without a real note, and for a refund that is not waiting for review', async () => {
    const payment = await makePayment();
    const held = await makeBooking(payment, { refund_status: 'PAID', refund_ref: 'sd' });
    await expect(sendRentalRefundByFinance('a'.repeat(24), String(held._id), 'too short')).rejects.toThrow(/at least 10/);
    const fresh = await makeBooking(payment);
    await expect(sendRentalRefundByFinance('a'.repeat(24), String(fresh._id), 'A perfectly good reason')).rejects.toThrow(
      /no refund waiting for review/
    );
  });

  it('only lets Finance managers send it', async () => {
    const payment = await makePayment();
    const held = await makeBooking(payment, { refund_status: 'PAID', refund_ref: 'sd' });
    const call = (roles: string[]) =>
      venueRentalResolvers.Mutation.sendRentalRefund({}, { id: String(held._id), note: 'Checked: never refunded' }, asCtx('b'.repeat(24), roles));
    await expect(call(['FINANCE_READER'])).rejects.toThrow(/Access Denied/);
    await expect(call(['CITY_ADMIN'])).rejects.toThrow(/Access Denied/);
  });
});

describe('closing rentals', () => {
  it('refunds rent and deposit to a guest who left the pod, and tells guest and venue', async () => {
    const payment = await makePayment({ total: 600 });
    const booking = await makeBooking(payment, { status: 'BOOKED', rent_amount: 200, deposit_amount: 300, refund_due: 0, refund_status: 'NONE' });
    expect(await rentalLifecycleService.releaseForPayment(payment._id)).toBe(1);
    const now = await reload(booking._id);
    expect(now).toMatchObject({ status: 'RELEASED', refund_due: 500, refund_status: 'DUE', deposit_policy: 'DUNCIT_REFUND' });
    expect(now.refund_gateway_status).toBe('QUEUED');
    expect(notify.mock.calls.map((c) => c[0].event)).toEqual(expect.arrayContaining(['USER_RENTAL_CANCELLED']));
  });

  it('sweeps up a refund owed but never queued', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment);
    expect(await runRentalRefundSweep()).toBeGreaterThanOrEqual(1);
    expect((await reload(booking._id)).refund_gateway_status).toBe('QUEUED');
  });

  it('refuses the retired hand-typed refund mark', async () => {
    const payment = await makePayment();
    const booking = await makeBooking(payment);
    await expect(
      venueRentalResolvers.Mutation.markRentalRefunded({}, { id: String(booking._id), reference: 'sd' }, asCtx('c'.repeat(24), ['FINANCE_MANAGER']))
    ).rejects.toThrow(/cannot be marked paid by hand/);
    expect((await reload(booking._id)).refund_status).toBe('DUE');
  });
});

describe('rentalBookingDetail and proofs', () => {
  async function venueBooking() {
    const owner = new Types.ObjectId();
    const venue = await VenueModel.create({ owner_user_id: owner, venue_name: 'Chai Corner', status: 'APPROVED', owner_email: 'owner@x.com' });
    const payment = await makePayment();
    const booking = await makeBooking(payment, { venue_id: venue._id, refund_status: 'PAID', refund_ref: 'sd', refunded_at: new Date() });
    return { owner: owner.toHexString(), booking };
  }

  it('gives the venue its own view — no guest email, no Razorpay payment — and Finance everything', async () => {
    const { owner, booking } = await venueBooking();
    const asVenue = await venueRentalResolvers.Query.rentalBookingDetail({}, { id: String(booking._id) }, asCtx(owner, []));
    expect(asVenue.viewer).toBe('VENUE');
    expect(asVenue.guest.email).toBeNull();
    expect(asVenue.payment).toBeNull();
    expect(asVenue.venue.email).toBeNull();
    const asFinance = await venueRentalResolvers.Query.rentalBookingDetail(
      {},
      { id: String(booking._id) },
      asCtx('d'.repeat(24), ['FINANCE_READER'])
    );
    expect(asFinance.viewer).toBe('FINANCE');
    expect(asFinance.payment?.razorpay_payment_id).toMatch(/^pay_rent/);
    expect(asFinance.venue.email).toBe('owner@x.com');
    // The legacy hand mark is on the rebuilt timeline, flagged as unproven.
    expect(asFinance.events.map((e) => e.type)).toContain('MANUAL_REFUND_MARK');
    expect(asFinance.booking.refund_state).toBe('REQUIRES_REVIEW');
  });

  it('refuses another venue’s owner, and anyone without a desk before reading the rental', async () => {
    const { booking } = await venueBooking();
    const otherOwner = new Types.ObjectId();
    await VenueModel.create({ owner_user_id: otherOwner, venue_name: 'Other Place', status: 'APPROVED' });
    await expect(
      venueRentalResolvers.Query.rentalBookingDetail({}, { id: String(booking._id) }, asCtx(otherOwner.toHexString(), []))
    ).rejects.toThrow(/Not your venue/);
    // A member with no venue and no Finance seat is refused even for an id that does not exist.
    await expect(
      venueRentalResolvers.Query.rentalBookingDetail({}, { id: new Types.ObjectId().toHexString() }, asCtx(new Types.ObjectId().toHexString(), ['USER']))
    ).rejects.toThrow(/Access Denied/);
  });

  it('records optional proof from the venue, and refuses an empty one or a photo from outside Duncit', async () => {
    const { owner, booking } = await venueBooking();
    const add = (input: { note?: string; image_urls?: string[] }) =>
      venueRentalResolvers.Mutation.addRentalBookingProof({}, { id: String(booking._id), input }, asCtx(owner, []));
    const after = await add({ note: 'Came back fine', image_urls: ['https://ik.imagekit.io/duncit/proof.jpg'] });
    expect(after.proofs).toHaveLength(1);
    expect(after.proofs[0]).toMatchObject({ note: 'Came back fine', added_by_role: 'VENUE' });
    await expect(add({ note: '  ' })).rejects.toThrow(/note or at least one photo/);
    await expect(add({ image_urls: ['https://evil.example.com/a.jpg'] })).rejects.toThrow(/uploaded through Duncit/);
    await expect(add({ image_urls: Array.from({ length: 7 }, (_, i) => `https://ik.imagekit.io/d/${i}.jpg`) })).rejects.toThrow(/at most 6/);
    // Evidence never moves money.
    expect((await reload(booking._id)).refund_status).toBe('PAID');
  });
});
