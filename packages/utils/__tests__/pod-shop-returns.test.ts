import { describe, expect, it } from 'vitest';
import {
  RETURN_COMMENTS_MAX,
  RETURN_REASONS,
  RETURN_STATUS_KEYS,
  canCancelReturn,
  groupReturnsByOrder,
  openReturnLines,
  reasonKey,
  refundCopy,
  returnDeadline,
  returnFormDefaults,
  returnStatusKey,
  returnTone,
  toReturnInput,
} from '../src/pod-shop-returns';

const money = (n: number) => `₹${n.toFixed(2)}`;
const date = (iso: string) => `day:${iso.slice(0, 10)}`;

describe('return status', () => {
  it('names every server status with its own literal key', () => {
    expect(returnStatusKey('PICKUP_SCHEDULED')).toBe('mweb.podShopReturns.statusPickupScheduled');
    expect(Object.keys(RETURN_STATUS_KEYS)).toEqual([
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'PICKUP_SCHEDULED',
      'RECEIVED',
      'REFUNDED',
      'CANCELLED',
    ]);
  });

  it('falls back to "requested" for a status the app does not know yet', () => {
    expect(returnStatusKey('ON_HOLD')).toBe('mweb.podShopReturns.statusRequested');
  });

  it('colours a refund as done, a rejection or withdrawal as closed, everything else as moving', () => {
    expect(returnTone('REFUNDED')).toBe('done');
    expect(returnTone('REJECTED')).toBe('closed');
    expect(returnTone('CANCELLED')).toBe('closed');
    expect(returnTone('PICKUP_SCHEDULED')).toBe('active');
  });

  it('lets the buyer withdraw only a return nobody has decided yet', () => {
    expect(canCancelReturn('REQUESTED')).toBe(true);
    expect(canCancelReturn('APPROVED')).toBe(false);
  });
});

describe('return reasons', () => {
  it('maps each stable reason id to its key, and an unknown id to nothing', () => {
    expect(RETURN_REASONS.map((r) => r.id)).toContain('damaged');
    expect(reasonKey('wrong-item')).toBe('mweb.podShopReturns.reasonWrongItem');
    expect(reasonKey('changed-my-mind')).toBeNull();
  });
});

describe('what can still go back', () => {
  const lines = [
    { product_id: 'a', variant_id: '', returnable_qty: 0, returnable_until: '2026-10-01T00:00:00.000Z' },
    { product_id: 'b', variant_id: 'v1', returnable_qty: 2, returnable_until: '2026-10-20T00:00:00.000Z' },
    { product_id: 'c', variant_id: '', returnable_qty: 1, returnable_until: '2026-10-10T00:00:00.000Z' },
    { product_id: 'd', variant_id: '', returnable_qty: 1, returnable_until: '2026-10-15T00:00:00.000Z' },
    { product_id: 'e', variant_id: '', returnable_qty: 1, returnable_until: null },
  ];

  it('keeps only lines with units left to return', () => {
    expect(openReturnLines(lines).map((l) => l.product_id)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('gives the earliest deadline among open lines, ignoring closed lines and missing dates', () => {
    // 'a' has the earliest date but nothing left to return, so it does not count.
    expect(returnDeadline(lines)).toBe('2026-10-10T00:00:00.000Z');
  });

  it('has no deadline when nothing can go back', () => {
    expect(returnDeadline([lines[0]])).toBeNull();
    expect(returnDeadline([])).toBeNull();
  });
});

describe('refund copy', () => {
  it('says nothing when there is no refund', () => {
    expect(refundCopy({ status: 'NONE', amount: 0, coins: 0 }, money, date)).toEqual([]);
  });

  it('says the refund is initiated while Razorpay has not settled it', () => {
    expect(refundCopy({ status: 'PENDING', amount: 590, coins: 0 }, money, date)).toEqual([
      { key: 'mweb.ordersHistory.refundInitiated', vars: { amount: '₹590.00' } },
    ]);
  });

  it('dates a processed refund, and falls back to "initiated" without a date', () => {
    expect(
      refundCopy({ status: 'PROCESSED', amount: 100, coins: 0, refunded_at: '2026-10-04T09:00:00.000Z' }, money, date)
    ).toEqual([{ key: 'mweb.ordersHistory.refundProcessedOn', vars: { amount: '₹100.00', date: 'day:2026-10-04' } }]);
    expect(refundCopy({ status: 'PROCESSED', amount: 100, coins: 0, refunded_at: null }, money, date)).toEqual([
      { key: 'mweb.ordersHistory.refundInitiated', vars: { amount: '₹100.00' } },
    ]);
  });

  it('reports a recorded refund and the coins that came back', () => {
    expect(refundCopy({ status: 'RECORDED', amount: 50, coins: 20 }, money, date)).toEqual([
      { key: 'mweb.ordersHistory.refundRecorded', vars: { amount: '₹50.00' } },
      { key: 'mweb.ordersHistory.coinsReturned', vars: { coins: '20' } },
    ]);
  });

  it('tells the buyer a refused refund will be paid out by the team, without an amount', () => {
    expect(refundCopy({ status: 'FAILED', amount: 590, coins: 0 }, money, date)).toEqual([
      { key: 'mweb.ordersHistory.refundFailed' },
    ]);
  });

  it('shows only coins when no cash went back, and nothing for an unknown status', () => {
    expect(refundCopy({ status: 'RECORDED', amount: 0, coins: 5 }, money, date)).toEqual([
      { key: 'mweb.ordersHistory.coinsReturned', vars: { coins: '5' } },
    ]);
    expect(refundCopy({ status: 'REVERSED', amount: 10, coins: 0 }, money, date)).toEqual([]);
  });
});

describe('groupReturnsByOrder', () => {
  it('collects returns under the order they belong to, keeping their order', () => {
    const grouped = groupReturnsByOrder([
      { id: 'r1', order_id: 'o1' },
      { id: 'r2', order_id: 'o2' },
      { id: 'r3', order_id: 'o1' },
    ]);
    expect(grouped.get('o1')?.map((r) => r.id)).toEqual(['r1', 'r3']);
    expect(grouped.get('o2')?.map((r) => r.id)).toEqual(['r2']);
    expect(grouped.has('o3')).toBe(false);
  });
});

describe('the Return items form', () => {
  const order = {
    line_items: [
      { product_id: 'p1', variant_id: null, variant_label: null, name: 'Shuttlecock' },
      { product_id: 'p2', variant_id: 'v2', variant_label: 'Size M', name: 'Club Tee' },
    ],
    returnable: [
      { product_id: 'p1', variant_id: '', returnable_qty: 3 },
      { product_id: 'p2', variant_id: 'v2', returnable_qty: 0 },
      // A line the order no longer lists is never offered.
      { product_id: 'gone', variant_id: '', returnable_qty: 1 },
    ],
  };

  it('offers one empty row per line that can still go back, matching variant-less lines', () => {
    expect(returnFormDefaults(order)).toEqual({
      lines: [{ product_id: 'p1', variant_id: '', name: 'Shuttlecock', variant_label: '', max: 3, qty: 0 }],
      reason: '',
      comments: '',
    });
  });

  it('sends only the picked lines, the reason as read, and trimmed comments', () => {
    const input = toReturnInput(
      'order-1',
      {
        lines: [
          { product_id: 'p1', variant_id: '', name: 'Shuttlecock', variant_label: '', max: 3, qty: 2 },
          { product_id: 'p3', variant_id: 'v9', name: 'Racket', variant_label: '', max: 1, qty: 0 },
        ],
        reason: 'damaged',
        comments: '  Box was crushed  ',
      },
      'Arrived damaged'
    );
    expect(input).toEqual({
      order_id: 'order-1',
      items: [{ product_id: 'p1', variant_id: '', qty: 2 }],
      reason: 'Arrived damaged',
      comments: 'Box was crushed',
    });
  });

  it('caps comments at the server limit', () => {
    expect(RETURN_COMMENTS_MAX).toBe(2000);
  });
});
