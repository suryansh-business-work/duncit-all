import type { IPaymentGatewayRefund, GatewayRefundStatus } from '../../payment.gatewayRefund.model';
import type { IOrderRefund } from '@modules/commerce/productOrder/productOrder.model';
import {
  GATEWAY_REFUND_KINDS,
  ORDER_REFUND_IN_FLIGHT_MS,
  buildSection,
  caseEntry,
  caseHasRefund,
  coinEntry,
  gatewayEntry,
  gatewayKindOf,
  heldEntry,
  needsRecordedEntry,
  orderRefundEntry,
  recordedEntry,
  refundTargetOf,
  refundWriteRoles,
  sectionState,
  type RefundEntry,
} from '../../payment.refundSections';

const NOW = new Date('2026-11-23T10:00:00.000Z');

const gateway = (over: Partial<Record<keyof IPaymentGatewayRefund, unknown>> = {}) =>
  ({
    _id: 'g1',
    idempotency_key: 'finance_refund:p1',
    payment_id: 'DPAY-1',
    source: 'FINANCE_REFUND',
    status: 'QUEUED',
    amount_paise: 3650,
    razorpay_payment_id: 'pay_1',
    razorpay_refund_id: '',
    attempts: 0,
    last_error: '',
    reason: 'Customer asked',
    initiated_by: 'FINANCE',
    requested_at: null,
    processed_at: null,
    created_at: new Date('2026-11-22T09:00:00.000Z'),
    ...over,
  }) as unknown as IPaymentGatewayRefund;

const orderRefund = (over: Partial<IOrderRefund> = {}): IOrderRefund => ({
  status: 'PENDING',
  amount: 120.5,
  coins: 4,
  razorpay_refund_id: '',
  attempted_at: null,
  refunded_at: null,
  error: '',
  initiated_by: 'POD_SHOP_ADMIN_CANCEL',
  finance_recorded: false,
  ...over,
});

const entry = (over: Partial<RefundEntry>): RefundEntry => ({
  id: 'e',
  ref: null,
  source: 'FINANCE_REFUND',
  status: 'QUEUED',
  state: 'PENDING',
  amount: 10,
  coins: 0,
  razorpay_refund_id: null,
  razorpay_refund_ids: [],
  razorpay_payment_id: 'pay_1',
  initiated_by: null,
  reason: null,
  error: null,
  attempts: 0,
  requested_at: null,
  processed_at: null,
  due_at: null,
  can_refund: true,
  ...over,
});

describe('gatewayEntry', () => {
  it.each<[GatewayRefundStatus, string, boolean]>([
    ['QUEUED', 'PENDING', true],
    ['SENDING', 'PENDING', false],
    ['PROCESSING', 'PENDING', false],
    ['FAILED', 'PENDING', true],
    ['SUCCEEDED', 'COMPLETED', false],
    ['NOT_APPLICABLE', 'COMPLETED', false],
    ['RECONCILIATION_REQUIRED', 'FAILED', true],
  ])('maps %s to %s and allows the Refund button: %s', (status, state, canRefund) => {
    expect(gatewayEntry(gateway({ status }))).toMatchObject({ status, state, can_refund: canRefund });
  });

  it('never offers Refund when no Razorpay payment id is recorded — there is nothing to send it against', () => {
    const e = gatewayEntry(gateway({ status: 'RECONCILIATION_REQUIRED', razorpay_payment_id: '' }));
    expect(e.can_refund).toBe(false);
    expect(e.razorpay_payment_id).toBeNull();
  });

  it('reads the amount in rupees from integer paise and carries every id it knows', () => {
    const e = gatewayEntry(gateway({ amount_paise: 3650, razorpay_refund_id: 'rfnd_1', status: 'SUCCEEDED' }));
    expect(e.amount).toBe(36.5);
    expect(e.razorpay_refund_id).toBe('rfnd_1');
    expect(e.razorpay_refund_ids).toEqual(['rfnd_1']);
    expect(e.razorpay_payment_id).toBe('pay_1');
  });

  it('names a rented item and a backout by their own id, and everything else by the payment', () => {
    expect(gatewayEntry(gateway({ idempotency_key: 'rental_refund:b77' })).ref).toBe('b77');
    expect(gatewayEntry(gateway({ idempotency_key: 'backout:r9' })).ref).toBe('r9');
    expect(gatewayEntry(gateway({ idempotency_key: 'pod_cancel:p1' })).ref).toBe('DPAY-1');
  });

  it('surfaces the last error and the attempt count for a refund that is failing', () => {
    const e = gatewayEntry(gateway({ status: 'FAILED', last_error: 'Gateway timeout', attempts: 3 }));
    expect(e).toMatchObject({ error: 'Gateway timeout', attempts: 3 });
  });
});

describe('heldEntry', () => {
  it('is null unless the payment is holding a cancellation refund', () => {
    expect(heldEntry({ _id: 'p1', metadata: {} } as never)).toBeNull();
    expect(heldEntry({ _id: 'p1', metadata: { refund_hold: false } } as never)).toBeNull();
  });

  it('is a pending refund that is not Finance to hurry, due when the pod starts', () => {
    const release = new Date('2026-12-01T18:00:00.000Z');
    const e = heldEntry({
      _id: 'p1',
      metadata: { refund_hold: true, refund_hold_amount: 99.999, refund_hold_release_at: release, refund_hold_reason: 'Pod cancelled' },
    } as never);
    expect(e).toMatchObject({ status: 'HELD', state: 'PENDING', amount: 100, due_at: release.toISOString(), reason: 'Pod cancelled', can_refund: false });
  });
});

describe('recordedEntry', () => {
  it('reports the stamped refunded figure, falling back to the whole payment', () => {
    const base = { _id: 'p1', payment_id: 'DPAY-1', gateway_ref: null, total: 500 };
    expect(recordedEntry({ ...base, metadata: { refunded_amount: 120, refunded_at: '2026-01-02T00:00:00.000Z' } } as never).amount).toBe(120);
    expect(recordedEntry({ ...base, metadata: { refunded_at: '2026-01-02T00:00:00.000Z' } } as never).amount).toBe(500);
  });

  it('keeps every recorded Razorpay refund id and never offers a button', () => {
    const e = recordedEntry({
      _id: 'p1',
      payment_id: 'DPAY-1',
      gateway_ref: null,
      total: 10,
      metadata: { razorpay_refund_ids: ['rfnd_a', 'rfnd_b'], refund_reason: 'Dupe', refund_initiated_by: 'FINANCE' },
    } as never);
    expect(e.razorpay_refund_ids).toEqual(['rfnd_a', 'rfnd_b']);
    expect(e).toMatchObject({ state: 'COMPLETED', source: 'RECORDED', can_refund: false, reason: 'Dupe', initiated_by: 'FINANCE' });
  });
});

describe('orderRefundEntry', () => {
  const input = (refund: IOrderRefund, retryable = true) => ({
    id: 'o1',
    ref: 'ORD-1',
    source: 'CANCELLATION' as const,
    refund,
    razorpayPaymentId: 'pay_1',
    retryable,
  });

  it('is null when no refund was ever started', () => {
    expect(orderRefundEntry(input(orderRefund({ status: '' })), NOW)).toBeNull();
  });

  it.each<[IOrderRefund['status'], string]>([
    ['PENDING', 'PENDING'],
    ['PROCESSED', 'COMPLETED'],
    ['RECORDED', 'COMPLETED'],
    ['FAILED', 'FAILED'],
  ])('maps the order refund %s to %s', (status, state) => {
    expect(orderRefundEntry(input(orderRefund({ status })), NOW)?.state).toBe(state);
  });

  it('lets Finance retry a refund Razorpay refused', () => {
    const e = orderRefundEntry(input(orderRefund({ status: 'FAILED', error: 'Insufficient balance' })), NOW);
    expect(e).toMatchObject({ can_refund: true, error: 'Insufficient balance', amount: 120.5, coins: 4 });
  });

  it('only retries a PENDING refund once it is certain nothing is still on the wire', () => {
    const recent = new Date(NOW.getTime() - ORDER_REFUND_IN_FLIGHT_MS + 60_000);
    const stale = new Date(NOW.getTime() - ORDER_REFUND_IN_FLIGHT_MS - 60_000);
    expect(orderRefundEntry(input(orderRefund({ attempted_at: recent })), NOW)?.can_refund).toBe(false);
    expect(orderRefundEntry(input(orderRefund({ attempted_at: stale })), NOW)?.can_refund).toBe(true);
    // Never attempted: the retry's own claim would not match, so it is not offered.
    expect(orderRefundEntry(input(orderRefund({ attempted_at: null })), NOW)?.can_refund).toBe(false);
  });

  it('never offers a button on the e-commerce store, which pays out by hand', () => {
    expect(orderRefundEntry(input(orderRefund({ status: 'FAILED' }), false), NOW)?.can_refund).toBe(false);
  });

  it('carries the Razorpay refund id and the payment it goes back to', () => {
    const e = orderRefundEntry(input(orderRefund({ status: 'PROCESSED', razorpay_refund_id: 'rfnd_7' })), NOW);
    expect(e).toMatchObject({ razorpay_refund_ids: ['rfnd_7'], razorpay_payment_id: 'pay_1' });
  });
});

describe('failed-payment cases', () => {
  const kase = (refund: Record<string, unknown>) =>
    ({
      _id: 'c1',
      amount: 450,
      ticket_no: 'TCK-9',
      razorpay_payment_id: 'pay_case',
      refund: {
        status: '',
        razorpay_refund_id: '',
        razorpay_payment_id: '',
        amount_paise: 0,
        attempts: 0,
        claimed_at: null,
        refunded_at: null,
        error: '',
        initiated_by_name: '',
        ...refund,
      },
    }) as never;

  it('shows an owed capture as pending and offers Refund only when the case is eligible', () => {
    expect(caseEntry(kase({}), true)).toMatchObject({ status: 'NOT_STARTED', state: 'PENDING', amount: 450, can_refund: true, razorpay_payment_id: 'pay_case' });
    expect(caseEntry(kase({}), false).can_refund).toBe(false);
  });

  it('does not offer Refund while one is on its way or done', () => {
    expect(caseEntry(kase({ status: 'PENDING' }), true).can_refund).toBe(false);
    const done = caseEntry(kase({ status: 'PROCESSED', razorpay_refund_id: 'rfnd_c', amount_paise: 45000 }), true);
    expect(done).toMatchObject({ state: 'COMPLETED', can_refund: false, amount: 450, razorpay_refund_ids: ['rfnd_c'] });
  });

  it('lets Finance retry a failed case refund, with the error shown', () => {
    expect(caseEntry(kase({ status: 'FAILED', error: 'Razorpay refused' }), true)).toMatchObject({ state: 'FAILED', can_refund: true, error: 'Razorpay refused' });
  });

  it('lists a case only when a refund was started or money is still owed', () => {
    const open = { resolution: { state: 'OPEN' } };
    expect(caseHasRefund({ ...open, refund: { status: 'PROCESSED' } } as never, false)).toBe(true);
    expect(caseHasRefund({ ...open, refund: { status: '' } } as never, true)).toBe(true);
    expect(caseHasRefund({ ...open, refund: { status: '' } } as never, false)).toBe(false);
    expect(caseHasRefund({ resolution: { state: 'REJECTED' }, refund: { status: '' } } as never, true)).toBe(false);
  });
});

describe('coinEntry', () => {
  it('is a completed credit with the coins and its reason, and no cash', () => {
    const at = new Date('2026-11-20T00:00:00.000Z');
    expect(coinEntry({ _id: 't1', amount: 40.9, reason: 'Pod cancelled', backout_id: 'bk1', created_at: at } as never)).toMatchObject({
      status: 'CREDITED',
      state: 'COMPLETED',
      coins: 40,
      amount: 0,
      ref: 'bk1',
      reason: 'Pod cancelled',
      can_refund: false,
      processed_at: at.toISOString(),
    });
  });
});

describe('sections', () => {
  it('lets the worst row colour the section: failed over pending over completed', () => {
    const done = entry({ state: 'COMPLETED' });
    const owed = entry({ state: 'PENDING' });
    const failed = entry({ state: 'FAILED' });
    expect(sectionState([done])).toBe('COMPLETED');
    expect(sectionState([done, owed])).toBe('PENDING');
    expect(sectionState([done, owed, failed])).toBe('FAILED');
  });

  it('has no section for a kind with no rows', () => {
    expect(buildSection('COIN', [], [], true)).toBeNull();
  });

  it('totals cash and coins, orders rows by when they were requested and keeps the events', () => {
    const later = entry({ id: 'b', amount: 5.25, coins: 3, requested_at: '2026-11-22T10:00:00.000Z' });
    const earlier = entry({ id: 'a', amount: 10.1, requested_at: '2026-11-21T10:00:00.000Z' });
    const undated = entry({ id: 'c', amount: 1 });
    const event = { id: 'ev', type: 'REFUND_REQUESTED', source: 'FINANCE', actor_name: null, details: [], created_at: 'x' };
    const section = buildSection('POD_PAYMENT', [undated, later, earlier], [event], true);
    expect(section?.entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(section).toMatchObject({ amount: 16.35, coins: 3, events: [event] });
  });

  it('switches every Refund button off for a caller whose role may not send that kind', () => {
    const section = buildSection('POD_SHOP', [entry({ can_refund: true })], [], false);
    expect(section?.entries[0].can_refund).toBe(false);
  });
});

describe('kinds and roles', () => {
  it('files a rental under its own kind, and a pod booking apart from any other payment', () => {
    expect(gatewayKindOf({ source: 'RENTAL' } as never, { pod_id: 'p' } as never)).toBe('RENTAL');
    expect(gatewayKindOf({ source: 'FINANCE_REFUND' } as never, { pod_id: 'p' } as never)).toBe('POD_PAYMENT');
    expect(gatewayKindOf({ source: 'FINANCE_REFUND' } as never, { pod_id: null } as never)).toBe('PAYMENT');
  });

  it('puts only the gateway kinds under the pod finance city scope', () => {
    expect([...GATEWAY_REFUND_KINDS].sort()).toEqual(['PAYMENT', 'POD_PAYMENT', 'RENTAL']);
  });

  it('keeps the pod shop and failed-payment buttons off the city admin, and gives the hand-paid kinds none', () => {
    expect(refundWriteRoles('POD_PAYMENT')).toContain('CITY_ADMIN');
    expect(refundWriteRoles('POD_SHOP')).not.toContain('CITY_ADMIN');
    expect(refundWriteRoles('FAILED_PAYMENT')).not.toContain('CITY_ADMIN');
    expect(refundWriteRoles('ECOMM')).toEqual([]);
    expect(refundWriteRoles('COIN')).toEqual([]);
  });

  it('adds the recorded stamp only when no record explains a refunded payment', () => {
    expect(needsRecordedEntry({ status: 'REFUNDED', metadata: {} } as never, false)).toBe(true);
    expect(needsRecordedEntry({ status: 'SUCCESS', metadata: { refunded_at: '2026-01-01T00:00:00.000Z' } } as never, false)).toBe(true);
    expect(needsRecordedEntry({ status: 'REFUNDED', metadata: {} } as never, true)).toBe(false);
    expect(needsRecordedEntry({ status: 'SUCCESS', metadata: {} } as never, false)).toBe(false);
  });

  it('sends pod-shop and store refunds back to the Razorpay payment, and only for Razorpay money', () => {
    expect(refundTargetOf({ gateway: 'RAZORPAY', gateway_ref: 'order_1', metadata: { razorpay_payment_id: 'pay_9' } } as never)).toBe('pay_9');
    expect(refundTargetOf({ gateway: 'DUMMY', gateway_ref: 'x', metadata: { razorpay_payment_id: 'pay_9' } } as never)).toBeNull();
    expect(refundTargetOf({ gateway: 'RAZORPAY', gateway_ref: 'order_1', metadata: {} } as never)).toBeNull();
  });
});
