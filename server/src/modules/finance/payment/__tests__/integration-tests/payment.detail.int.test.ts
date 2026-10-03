import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { LeaderboardPointModel, LeaderboardSettingsModel } from '@modules/engagement/leaderboard/leaderboard.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { CouponModel } from '@modules/finance/coupon/coupon.model';
import { ShortLinkClickModel } from '@modules/crm/marketing/shortLinkClick.model';
import { GiftCardModel } from '@modules/finance/giftcard/giftcard.model';
import { PaymentModel } from '../../payment.model';
import { paymentDetailService, type PaymentArtifact } from '../../payment.detail.service';

/**
 * Finance > Payment Logs > detail. Every tick on that page must be backed by a
 * document that exists right now, every cross by one that does not, and a row
 * nothing can settle must go grey — never red. Each artifact is seeded directly
 * (the audit only reads) and checked for exactly what it claims.
 */

const USER_ID = new Types.ObjectId();
const DONE_AT = new Date('2026-09-20T10:00:00.000Z');

const step = (key: string, status: string, extra: Record<string, unknown> = {}) => ({
  key,
  status,
  detail: '',
  refs: [],
  at: DONE_AT,
  ...extra,
});

let seq = 0;
const seedPayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `pay_detail_${++seq}`,
    user_id: USER_ID,
    user_name: 'Aarav Sharma',
    user_email: 'aarav@example.com',
    subtotal: 847.46,
    total: 1000,
    status: 'SUCCESS',
    ...over,
  });

const byKey = (artifacts: PaymentArtifact[]) => new Map(artifacts.map((a) => [a.key, a]));

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.collection.insertOne({
    _id: new Types.ObjectId(),
    pod_title: 'Sunday Badminton',
    pod_date_time: new Date('2026-10-05T07:00:00.000Z'),
    pod_attendees: [new Types.ObjectId(), new Types.ObjectId(), USER_ID],
    extra_seats: 1,
    no_of_spots: 10,
    ...over,
  });

describe('paymentDetailService.detail — lookup', () => {
  it('returns null for a payment that does not exist', async () => {
    expect(await paymentDetailService.detail(new Types.ObjectId().toHexString())).toBeNull();
  });
});

describe('paymentDetailService.detail — a fully settled pod booking', () => {
  it('ticks every artifact from the documents themselves and offers nothing to retry', async () => {
    const pod = await seedPod();
    const payment = await seedPayment({
      pod_id: pod.insertedId,
      invoice_no: 'DUN-INV-0042',
      coupon_code: 'WELCOME10',
      coupon_discount: 100,
      coins_redeemed: 50,
      finalize_state: 'COMPLETE',
      finalize_attempts: 1,
      finalized_at: DONE_AT,
      metadata: { seats: 2, original_total: 1150 },
      steps: [
        step('RECEIPT_EMAIL', 'DONE'),
        step('PAYMENT_CAPTURED', 'DONE', { refs: ['pay_x'], detail: 'Dummy Gateway' }),
        step('LEADERBOARD_POINTS', 'DONE'),
        step('COUPON_REDEEMED', 'DONE'),
        step('TICKET_EMAIL', 'DONE'),
        step('LINK_ATTRIBUTION', 'DONE'),
        step('INVOICE_PDF', 'DONE'),
        step('BACKOUT_FILL', 'SKIPPED'),
        step('GIFT_CARD_EMAIL', 'SKIPPED'),
        step('SHIPMENT', 'SKIPPED'),
      ],
    });
    const membershipId = new Types.ObjectId();
    await PodMemberModel.collection.insertOne({ _id: membershipId, payment_id: payment._id, status: 'JOINED', seats: 2 });
    await TicketModel.collection.insertOne({ payment_id: payment._id, ticket_code: 'TKT-7781', status: 'VALID' });
    await LeaderboardPointModel.collection.insertOne({
      source_id: String(pod.insertedId),
      user_id: USER_ID,
      source_type: 'POD_JOIN',
      points: 10,
    });
    await CouponModel.collection.insertOne({
      code: 'WELCOME10',
      discount_pct: 10,
      description: 'Ten percent off your first pod',
      used_count: 4,
    });
    await CoinTransactionModel.collection.insertMany([
      {
        user_id: USER_ID,
        type: 'DEBIT',
        amount: 50,
        balance_after: 0,
        source: 'PAYMENT_REDEEM',
        reason: 'Spent at checkout',
        payment_id: payment.payment_id,
        created_at: new Date('2026-09-20T10:00:01.000Z'),
      },
      {
        user_id: USER_ID,
        type: 'CREDIT',
        amount: 12,
        balance_after: 12,
        source: 'PAYMENT_EARN',
        payment_id: payment.payment_id,
        earn_pct: 1.2,
        created_at: new Date('2026-09-20T10:00:02.000Z'),
      },
    ]);
    await ShortLinkClickModel.collection.insertOne({
      click_id: 'clk_abc',
      code: 'dsl-diwali',
      conversions: [{ payment_id: payment._id }],
    });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    const a = byKey(detail.artifacts);

    expect(a.get('TICKET_PAYMENT')).toMatchObject({ created: true, count: 1, refs: [payment.payment_id], segment: 'PAYMENT' });
    expect(a.get('INVOICE')).toMatchObject({ created: true, refs: ['DUN-INV-0042'] });
    expect(a.get('POD_SEAT')).toMatchObject({ created: true, refs: ['2 booked', '4/10 seats'], segment: 'POD' });
    expect(a.get('POD_MEMBERSHIP')).toMatchObject({ created: true, refs: [String(membershipId), 'JOINED'] });
    expect(a.get('POD_TICKET')).toMatchObject({ created: true, refs: ['TKT-7781', 'VALID'] });
    expect(a.get('POD_TICKET_EMAIL')).toMatchObject({ created: true, refs: ['aarav@example.com'], retry_key: null });
    expect(a.get('LEADERBOARD_POINTS')).toMatchObject({ created: true, refs: ['10 pts'], not_applicable: false });
    expect(a.get('COUPON_REDEEMED')).toMatchObject({ created: true, refs: ['WELCOME10', '4 redemptions'] });
    expect(a.get('COINS_REDEEMED')).toMatchObject({ created: true, refs: ['50 coins'] });
    expect(a.get('COINS_EARNED')).toMatchObject({ created: true, refs: ['12 coins'] });
    expect(a.get('LINK_ATTRIBUTION')).toMatchObject({ created: true, refs: ['dsl-diwali', 'clk_abc'] });
    expect(a.get('RECEIPT_EMAIL')).toMatchObject({ created: true, refs: ['aarav@example.com'] });
    for (const key of ['PRODUCT_ORDER', 'STOCK_ADJUSTED', 'SHIPMENT', 'GIFT_CARD_ISSUED', 'GIFT_CARD_EMAIL'] as const) {
      expect(a.get(key)).toMatchObject({ not_applicable: true, created: false, retry_key: null });
    }
    expect(detail.artifacts.every((x) => x.retry_key === null)).toBe(true);

    expect(detail.payment).toMatchObject({ id: String(payment._id), payment_id: payment.payment_id });
    expect(detail).toMatchObject({
      finalize_state: 'COMPLETE',
      finalize_attempts: 1,
      finalized_at: DONE_AT.toISOString(),
      finalize_error: null,
      needs_refund: false,
      can_retry_finalize: false,
      retryable_step_keys: [],
      original_total: 1150,
      coins_redeemed: 50,
      coins_earned: 12,
      gift_card: null,
      product_orders: [],
    });
    expect(detail.coupon).toEqual({
      code: 'WELCOME10',
      discount: 100,
      discount_type: 'PERCENT',
      discount_value: 10,
      title: 'Ten percent off your first pod',
      still_exists: true,
    });
    expect(detail.pod_booking).toEqual({
      pod_id: String(pod.insertedId),
      pod_title: 'Sunday Badminton',
      pod_date_time: '2026-10-05T07:00:00.000Z',
      seats: 2,
      membership_id: String(membershipId),
      membership_status: 'JOINED',
      ticket_code: 'TKT-7781',
      ticket_status: 'VALID',
    });
    expect(detail.coins).toEqual([
      expect.objectContaining({ type: 'DEBIT', amount: 50, source: 'PAYMENT_REDEEM', reason: 'Spent at checkout', earn_pct: 0 }),
      expect.objectContaining({ type: 'CREDIT', amount: 12, source: 'PAYMENT_EARN', reason: '', earn_pct: 1.2 }),
    ]);
    // Recorded steps come back in pipeline order, whatever order they were stored in.
    expect(detail.steps.map((s) => s.key)).toEqual([
      'PAYMENT_CAPTURED',
      'LEADERBOARD_POINTS',
      'COUPON_REDEEMED',
      'BACKOUT_FILL',
      'LINK_ATTRIBUTION',
      'TICKET_EMAIL',
      'INVOICE_PDF',
      'RECEIPT_EMAIL',
      'GIFT_CARD_EMAIL',
      'SHIPMENT',
    ]);
    expect(detail.steps[0]).toEqual({
      key: 'PAYMENT_CAPTURED',
      label: 'Payment captured',
      status: 'DONE',
      detail: 'Dummy Gateway',
      refs: ['pay_x'],
      at: DONE_AT.toISOString(),
      segment: 'PAYMENT',
      can_retry: false,
    });
    expect(detail.steps.every((s) => !s.can_retry)).toBe(true);
  });
});

describe('paymentDetailService.detail — a booking whose deferred work is outstanding', () => {
  it('reds the missing pod records and offers every owed deferred step for retry', async () => {
    const payment = await seedPayment({
      pod_id: new Types.ObjectId(),
      total: 899.5,
      ticket_discount_amount: 100,
      coupon_code: 'GONE20',
      coupon_discount: 50.25,
      coins_redeemed: 30,
      finalize_state: 'CORE_DONE',
      steps: [
        step('PAYMENT_CAPTURED', 'DONE'),
        step('TICKET_EMAIL', 'PENDING', { at: null }),
        step('RECEIPT_EMAIL', 'FAILED', { detail: 'SMTP refused the connection' }),
      ],
    });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    const a = byKey(detail.artifacts);

    expect(a.get('POD_SEAT')).toMatchObject({ created: false, refs: [], not_applicable: false, retry_key: null });
    expect(a.get('POD_MEMBERSHIP')).toMatchObject({ created: false, retry_key: null });
    expect(a.get('POD_TICKET')).toMatchObject({ created: false, retry_key: null });
    expect(a.get('POD_TICKET_EMAIL')).toMatchObject({ created: false, retry_key: 'TICKET_EMAIL' });
    expect(a.get('LEADERBOARD_POINTS')).toMatchObject({ created: false, not_applicable: false, retry_key: null });
    expect(a.get('RECEIPT_EMAIL')).toMatchObject({ created: false, count: 0, retry_key: 'RECEIPT_EMAIL' });
    expect(a.get('COUPON_REDEEMED')).toMatchObject({ created: false, refs: ['GONE20'], not_applicable: false });
    expect(a.get('COINS_REDEEMED')).toMatchObject({ created: false, count: 0, refs: [] });
    expect(a.get('LINK_ATTRIBUTION')).toMatchObject({ not_applicable: true });

    expect(detail.retryable_step_keys).toEqual([
      'BACKOUT_FILL',
      'LINK_ATTRIBUTION',
      'TICKET_EMAIL',
      'INVOICE_PDF',
      'RECEIPT_EMAIL',
      'GIFT_CARD_EMAIL',
      'SHIPMENT',
    ]);
    const steps = new Map(detail.steps.map((s) => [s.key, s]));
    expect(steps.get('PAYMENT_CAPTURED')?.can_retry).toBe(false);
    expect(steps.get('TICKET_EMAIL')).toMatchObject({ can_retry: true, status: 'PENDING', at: null });
    expect(steps.get('RECEIPT_EMAIL')).toMatchObject({ can_retry: true, detail: 'SMTP refused the connection' });

    // No frozen gross: rebuilt by adding every discount back onto the net total.
    expect(detail.original_total).toBe(1079.75);
    expect(detail.coupon).toEqual({
      code: 'GONE20',
      discount: 50.25,
      discount_type: 'PERCENT',
      discount_value: 0,
      title: '',
      still_exists: false,
    });
    expect(detail.pod_booking).toMatchObject({ pod_title: '', pod_date_time: null, seats: 1, membership_id: null, ticket_code: null });
    expect(detail.can_retry_finalize).toBe(false);
  });

  it('shows the pod’s occupancy beside a missing booking row', async () => {
    const pod = await seedPod({ extra_seats: 0, no_of_spots: 6 });
    const payment = await seedPayment({ pod_id: pod.insertedId, finalize_state: 'COMPLETE', steps: [step('PAYMENT_CAPTURED', 'DONE')] });
    const a = byKey((await paymentDetailService.detail(String(payment._id)))!.artifacts);
    expect(a.get('POD_SEAT')).toMatchObject({ created: false, count: 0, refs: ['3/6 seats'] });
  });

  it('greys the points row when the join reward is switched off', async () => {
    await LeaderboardSettingsModel.create({ singleton_key: 'leaderboard', points_per_join: 0 });
    const pod = await seedPod();
    const payment = await seedPayment({ pod_id: pod.insertedId, steps: [step('LEADERBOARD_POINTS', 'DONE')] });
    const a = byKey((await paymentDetailService.detail(String(payment._id)))!.artifacts);
    expect(a.get('LEADERBOARD_POINTS')).toMatchObject({ not_applicable: true, created: false });
  });
});

describe('paymentDetailService.detail — payments with no step record', () => {
  it('greys what only a step could prove on a payment finalized before step tracking', async () => {
    const payment = await seedPayment({ coupon_code: 'OLDCODE', coins_earned: 7 });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    const a = byKey(detail.artifacts);

    expect(a.get('RECEIPT_EMAIL')).toMatchObject({
      created: false,
      not_applicable: true,
      refs: ['aarav@example.com', 'predates step tracking'],
      retry_key: null,
    });
    expect(a.get('COUPON_REDEEMED')).toMatchObject({ not_applicable: true, retry_key: null, refs: ['OLDCODE'] });
    // The payment says coins were earned but no ledger row exists: a real gap.
    expect(a.get('COINS_EARNED')).toMatchObject({ created: false, not_applicable: false, count: 0 });
    expect(a.get('INVOICE')).toMatchObject({ created: false, refs: [] });
    expect(a.get('POD_SEAT')).toMatchObject({ not_applicable: true });
    expect(detail).toMatchObject({
      finalize_state: 'NOT_STARTED',
      finalized_at: null,
      steps: [],
      retryable_step_keys: [],
      can_retry_finalize: false,
      pod_booking: null,
      coins_earned: 7,
    });
  });

  it('offers no per-step retry on a committed core that predates step tracking', async () => {
    const payment = await seedPayment({ finalize_state: 'COMPLETE' });
    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    expect(detail.retryable_step_keys).toEqual([]);
  });
});

describe('paymentDetailService.detail — finalization and refund states', () => {
  it('offers the whole-finalization retry only when the core rolled back after capture', async () => {
    const payment = await seedPayment({
      status: 'PENDING',
      finalize_state: 'FAILED',
      finalize_error: 'Seat claim conflicted',
      steps: [step('PAYMENT_CAPTURED', 'DONE'), step('RECEIPT_EMAIL', 'PENDING')],
    });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;

    expect(detail.can_retry_finalize).toBe(true);
    expect(detail.finalize_error).toBe('Seat claim conflicted');
    expect(detail.retryable_step_keys).toEqual([]);
    expect(detail.steps.find((s) => s.key === 'RECEIPT_EMAIL')?.can_retry).toBe(false);
    expect(byKey(detail.artifacts).get('TICKET_PAYMENT')).toMatchObject({ created: false, count: 0, refs: [payment.payment_id] });
  });

  it('keeps a refunded payment’s capture ticked, marks the refund, and offers no retry at all', async () => {
    const payment = await seedPayment({
      status: 'REFUNDED',
      finalize_state: 'FAILED',
      needs_refund: false,
      steps: [step('RECEIPT_EMAIL', 'FAILED')],
    });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;

    expect(byKey(detail.artifacts).get('TICKET_PAYMENT')).toMatchObject({
      created: true,
      refs: [payment.payment_id, 'REFUNDED'],
    });
    expect(detail.can_retry_finalize).toBe(false);
    expect(detail.retryable_step_keys).toEqual([]);
    expect(detail.steps[0].can_retry).toBe(false);
  });

  it('does not offer a retry on a refunded payment even with its core committed', async () => {
    const payment = await seedPayment({ status: 'REFUNDED', finalize_state: 'COMPLETE', steps: [step('SHIPMENT', 'FAILED')] });
    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    expect(detail.retryable_step_keys).toEqual([]);
    expect(detail.steps[0].can_retry).toBe(false);
  });
});

describe('paymentDetailService.detail — product orders', () => {
  const seedOrder = (paymentId: Types.ObjectId, over: Record<string, unknown> = {}) =>
    ProductOrderModel.collection.insertOne({
      order_no: `DUN-ORD-${++seq}`,
      payment_id: paymentId,
      fulfilment_method: 'SHIP',
      // One SHIP order per pickup origin — the unique (payment, pod, method, origin) key.
      pickup_location_id: new Types.ObjectId(),
      fulfilment_status: 'PENDING',
      total: 698,
      line_items: [{ qty: 2 }],
      created_at: new Date(`2026-09-20T10:00:0${seq % 10}.000Z`),
      ...over,
    });

  it('ticks the orders and the stock when every paid unit landed, and reds an unbooked shipment', async () => {
    const payment = await seedPayment({
      target_type: 'PRODUCT',
      finalize_state: 'CORE_DONE',
      metadata: { product_lines: [{ quantity: 2 }, { quantity: 1 }] },
      steps: [step('PRODUCT_ORDERS', 'DONE'), step('SHIPMENT', 'FAILED')],
    });
    await seedOrder(payment._id, {
      order_no: 'DUN-ORD-A',
      shiprocket: { awb: 'AWB123456' },
      fulfilment_status: 'SHIPPED',
      created_at: new Date('2026-09-20T10:00:01.000Z'),
    });
    await seedOrder(payment._id, {
      order_no: 'DUN-ORD-B',
      total: 349,
      line_items: [{ qty: 1 }],
      created_at: new Date('2026-09-20T10:00:02.000Z'),
    });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    const a = byKey(detail.artifacts);

    expect(a.get('PRODUCT_ORDER')).toMatchObject({ created: true, count: 2, refs: ['DUN-ORD-A', 'DUN-ORD-B'] });
    expect(a.get('STOCK_ADJUSTED')).toMatchObject({ created: true, count: 3, refs: ['3 units'] });
    expect(a.get('SHIPMENT')).toMatchObject({ created: false, count: 2, refs: ['AWB123456'], retry_key: 'SHIPMENT' });
    expect(detail.product_orders).toEqual([
      expect.objectContaining({ order_no: 'DUN-ORD-A', item_count: 2, awb: 'AWB123456', total: 698, fulfilment_status: 'SHIPPED' }),
      expect.objectContaining({ order_no: 'DUN-ORD-B', item_count: 1, awb: null, total: 349 }),
    ]);
    expect(detail.retryable_step_keys).toContain('SHIPMENT');
  });

  it('reds the stock row when the orders hold fewer units than were paid for, and the orders row when none exist', async () => {
    const short = await seedPayment({ target_type: 'PRODUCT', metadata: { product_lines: [{ quantity: 3 }] } });
    await seedOrder(short._id, { line_items: [{ qty: 2 }], fulfilment_method: 'PICKUP' });
    const shortA = byKey((await paymentDetailService.detail(String(short._id)))!.artifacts);
    expect(shortA.get('STOCK_ADJUSTED')).toMatchObject({ created: false, count: 2, refs: ['2 units'] });
    expect(shortA.get('SHIPMENT')).toMatchObject({ not_applicable: true });

    const none = await seedPayment({ target_type: 'PRODUCT', metadata: { product_lines: [{ quantity: 1 }] } });
    const noneA = byKey((await paymentDetailService.detail(String(none._id)))!.artifacts);
    expect(noneA.get('PRODUCT_ORDER')).toMatchObject({ created: false, count: 0, refs: [] });
    expect(noneA.get('STOCK_ADJUSTED')).toMatchObject({ created: false, count: 0 });
  });
});

describe('paymentDetailService.detail — gift cards and attribution', () => {
  it('reads the bought card back by its payment and ticks the e-mail to its recipient', async () => {
    const payment = await seedPayment({
      target_type: 'GIFT_CARD',
      finalize_state: 'COMPLETE',
      steps: [step('GIFT_CARD_ISSUED', 'DONE'), step('GIFT_CARD_EMAIL', 'DONE')],
    });
    const card = await GiftCardModel.create({
      code: 'ABCD-EFGH-JKMN-PQRS',
      purchaser_user_id: USER_ID,
      recipient_email: 'priya@example.com',
      recipient_name: 'Priya Menon',
      scope_type: 'SHOP',
      initial_amount: 1000,
      balance: 1000,
      payment_id: payment.payment_id,
      expires_at: new Date('2027-09-20T00:00:00.000Z'),
    });

    const detail = (await paymentDetailService.detail(String(payment._id)))!;
    const a = byKey(detail.artifacts);

    expect(a.get('GIFT_CARD_ISSUED')).toMatchObject({ created: true, refs: ['ABCD-EFGH-JKMN-PQRS', 'ACTIVE'], segment: 'GIFT_CARD' });
    expect(a.get('GIFT_CARD_EMAIL')).toMatchObject({ created: true, refs: ['priya@example.com'] });
    expect(detail.gift_card).toEqual({
      id: String(card._id),
      code: 'ABCD-EFGH-JKMN-PQRS',
      recipient_name: 'Priya Menon',
      recipient_email: 'priya@example.com',
      scope_name: '',
      initial_amount: 1000,
      balance: 1000,
      status: 'ACTIVE',
      expires_at: '2027-09-20T00:00:00.000Z',
      redeemed_at: null,
    });
  });

  it('reds a missing card and offers the card e-mail, addressed to the buyer', async () => {
    const payment = await seedPayment({
      target_type: 'GIFT_CARD',
      finalize_state: 'CORE_DONE',
      steps: [step('GIFT_CARD_EMAIL', 'FAILED')],
    });
    const a = byKey((await paymentDetailService.detail(String(payment._id)))!.artifacts);
    expect(a.get('GIFT_CARD_ISSUED')).toMatchObject({ created: false, retry_key: null });
    expect(a.get('GIFT_CARD_EMAIL')).toMatchObject({ created: false, refs: ['aarav@example.com'], retry_key: 'GIFT_CARD_EMAIL' });
  });

  it('finds the attribution on the retired single-payment slot of an older click', async () => {
    const payment = await seedPayment();
    await ShortLinkClickModel.collection.insertOne({ click_id: 'clk_legacy', code: 'dsl-old', converted_payment_id: payment._id });
    const a = byKey((await paymentDetailService.detail(String(payment._id)))!.artifacts);
    expect(a.get('LINK_ATTRIBUTION')).toMatchObject({ created: true, refs: ['dsl-old', 'clk_legacy'] });
  });
});
