/**
 * The buyer's order detail page: the ladder with real tracking folded in, the
 * support-ticket draft, and which documents an order offers. mWeb and the app
 * render all three from here, so what they decide is pinned here.
 */
import { describe, expect, it } from 'vitest';

import {
  buildDetailedOrderTimeline,
  courierScanStatus,
  orderDownloads,
  orderSupportDraft,
  PICKUP_FLOW,
  SHIP_FLOW,
  type DetailedTimelineStep,
  type OrderTrackingEvent,
} from '../src';

/** Hands back the key (and any values), so a wrong key or value fails by name. */
const t = (key: string, options?: { vars?: Record<string, string> }) =>
  options?.vars
    ? `${key}(${Object.entries(options.vars)
        .map(([name, value]) => `${name}=${value}`)
        .join(',')})`
    : key;

/** An event the platform wrote: our own status code, no courier id. */
const own = (status: string, at: string | null, note = 'operator note'): OrderTrackingEvent => ({
  status,
  code: 0,
  location: '',
  note,
  at,
});

/** A courier scan: the courier's label, with ShipRocket's status id. */
const scan = (status: string, at: string | null, location: string | null = '', note: string | null = ''): OrderTrackingEvent => ({
  status,
  code: 18,
  location,
  note,
  at,
});

const step = (steps: DetailedTimelineStep[], status: string): DetailedTimelineStep => {
  const found = steps.find((s) => s.status === status);
  if (!found) throw new Error(`no ${status} step`);
  return found;
};

const labels = (s: DetailedTimelineStep) => s.scans.map((entry) => entry.label);

describe('courierScanStatus', () => {
  it('maps the courier labels onto the lifecycle the server moves through', () => {
    const cases: [string, string][] = [
      ['RTO Delivered', 'RTO_DELIVERED'],
      ['RTO INITIATED', 'RTO'],
      ['Return to origin in transit', 'RTO'],
      ['UNDELIVERED', 'NDR'],
      ['Delivery Attempted', 'NDR'],
      ['UNTRACEABLE', 'LOST'],
      ['Canceled', 'CANCELLED'],
      ['CANCELLED', 'CANCELLED'],
      ['Cancelled before dispatch', 'CANCELLED'],
      ['Out For Delivery', 'OUT_FOR_DELIVERY'],
      ['OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY'],
      ['Delivered', 'DELIVERED'],
      ['PICKED UP', 'SHIPPED'],
      ['Reached at destination hub', 'SHIPPED'],
      ['PICKUP RESCHEDULED', 'PICKUP_SCHEDULED'],
      ['AWB Assigned', 'AWB_ASSIGNED'],
    ];
    for (const [label, status] of cases) expect(courierScanStatus(label), label).toBe(status);
  });

  it('answers null for a label that says nothing we track, rather than guessing', () => {
    expect(courierScanStatus('Customs hold')).toBeNull();
    expect(courierScanStatus('   ')).toBeNull();
    expect(courierScanStatus('')).toBeNull();
    expect(courierScanStatus(null)).toBeNull();
    expect(courierScanStatus(undefined)).toBeNull();
  });
});

describe('buildDetailedOrderTimeline — an order on its ladder', () => {
  const shipped = {
    fulfilment_method: 'SHIP',
    fulfilment_status: 'SHIPPED',
    created_at: '2026-10-01T09:00:00.000Z',
    // Deliberately out of order: the builder sorts by time.
    tracking_events: [
      scan('IN TRANSIT', '2026-10-02T20:00:00.000Z', 'Hyderabad Hub', 'Bag received'),
      own('AWB_ASSIGNED', '2026-10-01T11:00:00.000Z', 'AWB X1 with Delhivery'),
      scan('PICKED UP', '2026-10-02T09:00:00.000Z', 'Bengaluru', 'Shipment picked up'),
      own('AWAITING_SHIPMENT', '2026-10-01T10:00:00.000Z', 'ShipRocket order 1 created'),
      own('PICKUP_SCHEDULED', '2026-10-01T12:00:00.000Z', 'Pickup requested'),
    ],
  };

  it('keeps the whole flow, in ladder order, with the current rung marked', () => {
    const steps = buildDetailedOrderTimeline(shipped, t);
    expect(steps.map((s) => s.status)).toEqual([...SHIP_FLOW]);
    expect(steps.filter((s) => s.done).map((s) => s.status)).toEqual(['PENDING', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED']);
    expect(steps.filter((s) => s.current).map((s) => s.status)).toEqual(['SHIPPED']);
    expect(steps.map((s) => s.tone)).toEqual(['done', 'done', 'done', 'moving', 'neutral', 'neutral']);
    expect(step(steps, 'SHIPPED').label).toBe('fulfilment.statusShipped');
  });

  it('times each reached rung: the order date, then the first event that proves the rung', () => {
    const steps = buildDetailedOrderTimeline(shipped, t);
    expect(step(steps, 'PENDING').at).toBe('2026-10-01T09:00:00.000Z');
    expect(step(steps, 'AWAITING_SHIPMENT').at).toBe('2026-10-01T10:00:00.000Z');
    expect(step(steps, 'AWB_ASSIGNED').at).toBe('2026-10-01T11:00:00.000Z');
    // Two scans prove SHIPPED; the rung was reached at the first.
    expect(step(steps, 'SHIPPED').at).toBe('2026-10-02T09:00:00.000Z');
    expect(step(steps, 'OUT_FOR_DELIVERY').at).toBeNull();
    expect(step(steps, 'DELIVERED').at).toBeNull();
  });

  it('files the courier scans under their rung, oldest first, and headlines the latest', () => {
    const shippedStep = step(buildDetailedOrderTimeline(shipped, t), 'SHIPPED');
    expect(shippedStep.scans).toEqual([
      { label: 'PICKED UP', location: 'Bengaluru', note: 'Shipment picked up', at: '2026-10-02T09:00:00.000Z' },
      { label: 'IN TRANSIT', location: 'Hyderabad Hub', note: 'Bag received', at: '2026-10-02T20:00:00.000Z' },
    ]);
    expect(shippedStep.location).toBe('Hyderabad Hub');
    expect(shippedStep.note).toBe('Bag received');
  });

  it("never shows a platform event's note — those are written for operators", () => {
    const steps = buildDetailedOrderTimeline(shipped, t);
    for (const status of ['PENDING', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED']) {
      expect(step(steps, status).note, status).toBe('');
      expect(step(steps, status).location, status).toBe('');
      expect(step(steps, status).scans, status).toEqual([]);
    }
  });

  it('keeps a failed attempt and an early "delivered" scan under the rung the order is on', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'OUT_FOR_DELIVERY',
        tracking_events: [
          scan('OUT FOR DELIVERY', '2026-10-03T08:00:00.000Z', 'Pune'),
          scan('UNDELIVERED', '2026-10-03T13:00:00.000Z', 'Pune', 'Customer not available'),
          scan('DELIVERED', '2026-10-04T10:00:00.000Z', 'Pune'),
        ],
      },
      t,
    );
    expect(labels(step(steps, 'OUT_FOR_DELIVERY'))).toEqual(['OUT FOR DELIVERY', 'UNDELIVERED', 'DELIVERED']);
    // The server has not moved the order, so the last rung is still ahead.
    expect(step(steps, 'DELIVERED')).toMatchObject({ done: false, current: false, at: null, scans: [] });
    // No order date and no event for it: the first rung's time is simply unknown.
    expect(step(steps, 'PENDING').at).toBeNull();
  });

  it('takes the delivery time from the order, which is what the return window counts from', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'DELIVERED',
        delivered_at: '2026-10-05T12:30:00.000Z',
        tracking_events: [scan('Delivered', '2026-10-05T12:00:00.000Z', 'Pune', 'Handed to consignee')],
      },
      t,
    );
    const delivered = step(steps, 'DELIVERED');
    expect(delivered).toMatchObject({
      current: true,
      done: false,
      tone: 'done',
      at: '2026-10-05T12:30:00.000Z',
      location: 'Pune',
      note: 'Handed to consignee',
    });
    expect(steps.slice(0, -1).every((s) => s.done && s.tone === 'done')).toBe(true);
  });

  it('walks a collected order down the pickup flow', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'PICKUP',
        fulfilment_status: 'PICKED_UP',
        created_at: '2026-10-01T09:00:00.000Z',
        delivered_at: '2026-10-02T17:00:00.000Z',
        tracking_events: [
          own('PICKUP_SCHEDULED', '2026-10-01T10:00:00.000Z'),
          own('READY_FOR_PICKUP', '2026-10-02T09:00:00.000Z'),
        ],
      },
      t,
    );
    expect(steps.map((s) => s.status)).toEqual([...PICKUP_FLOW]);
    expect(steps.map((s) => s.at)).toEqual([
      '2026-10-01T09:00:00.000Z',
      '2026-10-01T10:00:00.000Z',
      '2026-10-02T09:00:00.000Z',
      '2026-10-02T17:00:00.000Z',
    ]);
    expect(step(steps, 'PICKED_UP').tone).toBe('done');
  });

  it('survives events with no time, no place and no words', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'SHIPPED',
        tracking_events: [
          { status: 'IN TRANSIT', code: 18, location: null, note: null, at: null },
          { status: 'IN TRANSIT', code: 18, at: 'not-a-date' },
        ],
      },
      t,
    );
    const shippedStep = step(steps, 'SHIPPED');
    expect(shippedStep.scans).toEqual([
      { label: 'IN TRANSIT', location: '', note: '', at: null },
      { label: 'IN TRANSIT', location: '', note: '', at: null },
    ]);
    // Proven reached, but nothing says when.
    expect(shippedStep).toMatchObject({ current: true, at: null, location: '', note: '' });
  });

  it('leaves a scan it cannot place on the rung the parcel was already on, and lends that rung its time', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'AWAITING_SHIPMENT',
        tracking_events: [scan('Customs hold', '2026-10-01T15:00:00.000Z', 'Mumbai', 'Held for inspection')],
      },
      t,
    );
    expect(step(steps, 'PENDING')).toMatchObject({
      at: '2026-10-01T15:00:00.000Z',
      location: 'Mumbai',
      note: 'Held for inspection',
    });
    expect(step(steps, 'AWAITING_SHIPMENT').scans).toEqual([]);
  });

  it('shows the bare ladder for an order with no tracking at all', () => {
    const steps = buildDetailedOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'PENDING' }, t);
    expect(steps.map((s) => s.status)).toEqual([...SHIP_FLOW]);
    expect(steps[0]).toMatchObject({ current: true, tone: 'pending', at: null, scans: [] });
    expect(buildDetailedOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'PENDING', tracking_events: null }, t)).toEqual(steps);
  });
});

describe('buildDetailedOrderTimeline — an order that left its ladder', () => {
  it('shows a cancelled order as the rungs it reached, then why it stopped', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'CANCELLED',
        created_at: '2026-10-01T09:00:00.000Z',
        cancelled_at: '2026-10-01T18:00:00.000Z',
        cancel_reason: 'Out of stock',
        tracking_events: [
          own('AWAITING_SHIPMENT', '2026-10-01T10:00:00.000Z'),
          own('AWB_ASSIGNED', '2026-10-01T11:00:00.000Z'),
          own('CANCELLED', '2026-10-01T18:00:05.000Z', 'internal reason text'),
        ],
      },
      t,
    );
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED', 'CANCELLED']);
    expect(steps.slice(0, 3).every((s) => s.done && !s.current && s.tone === 'done')).toBe(true);
    expect(steps[3]).toEqual({
      status: 'CANCELLED',
      label: 'fulfilment.statusCancelled',
      done: true,
      current: true,
      at: '2026-10-01T18:00:00.000Z',
      location: '',
      note: 'Out of stock',
      tone: 'neutral',
      scans: [],
    });
  });

  it('falls back to the cancellation event when the order carries no date or reason', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'PICKUP',
        fulfilment_status: 'CANCELLED',
        tracking_events: [own('CANCELLED', '2026-10-01T18:00:05.000Z', 'internal reason text')],
      },
      t,
    );
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'CANCELLED']);
    expect(steps[1]).toMatchObject({ at: '2026-10-01T18:00:05.000Z', note: '' });
  });

  it('puts a failed delivery after the last rung reached, and keeps later scans with it', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'NDR',
        tracking_events: [
          scan('SHIPPED', '2026-10-02T09:00:00.000Z', 'Bengaluru'),
          scan('OUT FOR DELIVERY', '2026-10-03T08:00:00.000Z', 'Pune'),
          scan('UNDELIVERED', '2026-10-03T13:00:00.000Z', 'Pune', 'Customer not available'),
          own('NDR_REATTEMPT', '2026-10-03T15:00:00.000Z', 'Please re-attempt delivery'),
          scan('OUT FOR DELIVERY', '2026-10-04T08:00:00.000Z', 'Pune', 'Second attempt'),
        ],
      },
      t,
    );
    // Still moving: delivery is drawn after it, not yet reached.
    expect(steps.map((s) => s.status)).toEqual([...SHIP_FLOW.slice(0, 5), 'NDR', 'DELIVERED']);
    expect(step(steps, 'DELIVERED')).toMatchObject({ done: false, current: false, tone: 'neutral', at: null, scans: [] });
    const ndr = step(steps, 'NDR');
    // A failed attempt is answered, not final: current, but not done.
    expect(ndr).toMatchObject({
      done: false,
      current: true,
      tone: 'pending',
      at: '2026-10-03T13:00:00.000Z',
      location: 'Pune',
      note: 'Second attempt',
    });
    expect(labels(ndr)).toEqual(['UNDELIVERED', 'OUT FOR DELIVERY']);
    expect(labels(step(steps, 'SHIPPED'))).toEqual(['SHIPPED']);
    expect(labels(step(steps, 'OUT_FOR_DELIVERY'))).toEqual(['OUT FOR DELIVERY']);
  });

  it('reads the return journey under the closing step of a parcel that came back', () => {
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'RTO_DELIVERED',
        tracking_events: [
          scan('IN TRANSIT', '2026-10-02T09:00:00.000Z', 'Bengaluru'),
          scan('RTO INITIATED', '2026-10-05T09:00:00.000Z', 'Pune'),
          scan('RTO DELIVERED', '2026-10-08T09:00:00.000Z', 'Bengaluru', 'Returned to seller'),
        ],
      },
      t,
    );
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED', 'SHIPPED', 'RTO_DELIVERED']);
    const closing = step(steps, 'RTO_DELIVERED');
    expect(closing).toMatchObject({ done: true, current: true, tone: 'failed', at: '2026-10-08T09:00:00.000Z' });
    expect(labels(closing)).toEqual(['RTO INITIATED', 'RTO DELIVERED']);
  });

  it('gives a shipment waiting for its courier pickup its own step, with the rest of the ladder ahead', () => {
    // The server parks a booked SHIP order in PICKUP_SCHEDULED, which the ship
    // flow does not carry — it must not read back as "Order placed".
    const steps = buildDetailedOrderTimeline(
      {
        fulfilment_method: 'SHIP',
        fulfilment_status: 'PICKUP_SCHEDULED',
        tracking_events: [
          own('AWAITING_SHIPMENT', '2026-10-01T10:00:00.000Z'),
          own('AWB_ASSIGNED', '2026-10-01T11:00:00.000Z'),
          own('PICKUP_SCHEDULED', '2026-10-01T12:00:00.000Z'),
        ],
      },
      t,
    );
    expect(steps.map((s) => s.status)).toEqual([
      'PENDING',
      'AWAITING_SHIPMENT',
      'AWB_ASSIGNED',
      'PICKUP_SCHEDULED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
    expect(step(steps, 'PICKUP_SCHEDULED')).toMatchObject({
      done: false,
      current: true,
      tone: 'moving',
      at: '2026-10-01T12:00:00.000Z',
    });
    expect(steps.slice(0, 3).every((s) => s.done)).toBe(true);
    expect(steps.slice(4).every((s) => !s.done && !s.current && s.at === null)).toBe(true);
  });

  it('draws a status no client knows yet as itself, after the first rung — never an empty timeline', () => {
    const steps = buildDetailedOrderTimeline(
      { fulfilment_method: 'PICKUP', fulfilment_status: 'AWAITING_QUANTUM_TUNNEL' },
      t,
    );
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'AWAITING_QUANTUM_TUNNEL', ...PICKUP_FLOW.slice(1)]);
    expect(steps[1]).toMatchObject({
      label: 'AWAITING_QUANTUM_TUNNEL',
      done: false,
      current: true,
      tone: 'neutral',
      at: null,
    });
  });
});

describe('orderSupportDraft', () => {
  const order = {
    order_no: 'ord_1',
    fulfilment_status: 'SHIPPED',
    payment_ref: 'pay_9',
    cancelled_at: null,
    refund: { status: 'NONE' },
    shiprocket: { awb: 'AWB1', courier_name: 'Delhivery' },
    line_items: [
      { name: 'Leash', variant_label: 'Red', qty: 2 },
      { name: 'Bowl', variant_label: '', qty: 1 },
    ],
  };

  it('names the order in the subject and carries every reference an agent needs in the body', () => {
    expect(orderSupportDraft(order, t)).toEqual({
      subject: 'mweb.orderDetail.supportSubject(orderNo=ord_1)',
      category: 'QUESTION',
      message: [
        'mweb.orderDetail.supportIntro',
        '',
        'mweb.orderDetail.supportOrder(orderNo=ord_1)',
        'mweb.orderDetail.supportItems(items=Leash (Red) × 2, Bowl × 1)',
        'mweb.orderDetail.supportStatus(status=fulfilment.statusShipped)',
        'mweb.orderDetail.supportAwb(awb=AWB1 (Delhivery))',
        'mweb.orderDetail.supportPaymentRef(ref=pay_9)',
      ].join('\n'),
    });
  });

  it('gives the AWB alone when the courier is not named yet', () => {
    const draft = orderSupportDraft({ ...order, shiprocket: { awb: 'AWB1', courier_name: null } }, t);
    expect(draft.message).toContain('mweb.orderDetail.supportAwb(awb=AWB1)');
  });

  it('leaves out the references an order does not have', () => {
    const bare = { order_no: 'ord_2', fulfilment_status: 'PENDING', line_items: [{ name: 'Bowl', qty: 1 }] };
    for (const shiprocket of [undefined, null, { awb: null }]) {
      const draft = orderSupportDraft({ ...bare, shiprocket }, t);
      expect(draft.message).not.toContain('supportAwb');
      expect(draft.message).not.toContain('supportPaymentRef');
      expect(draft.category).toBe('QUESTION');
    }
  });

  it('files an order with money on its way back under Payment / Refund', () => {
    expect(orderSupportDraft({ ...order, cancelled_at: '2026-10-01T18:00:00.000Z' }, t).category).toBe('PAYMENT');
    expect(orderSupportDraft({ ...order, refund: { status: 'PENDING' } }, t).category).toBe('PAYMENT');
  });
});

describe('orderDownloads', () => {
  it('offers both documents for a paid, booked shipment', () => {
    expect(
      orderDownloads({ payment_id: 'p1', fulfilment_method: 'SHIP', shiprocket: { shipment_id: 'S1' } }),
    ).toEqual({ invoice: true, sellerInvoice: true });
  });

  it('holds the seller invoice back until the shipment is booked', () => {
    expect(orderDownloads({ payment_id: 'p1', fulfilment_method: 'SHIP', shiprocket: { shipment_id: '' } }).sellerInvoice).toBe(false);
    expect(orderDownloads({ payment_id: 'p1', fulfilment_method: 'SHIP', shiprocket: null }).sellerInvoice).toBe(false);
    expect(orderDownloads({ payment_id: 'p1', fulfilment_method: 'SHIP' }).sellerInvoice).toBe(false);
  });

  it('never offers a seller invoice for a collected order — nothing was shipped', () => {
    expect(
      orderDownloads({ payment_id: 'p1', fulfilment_method: 'PICKUP', shiprocket: { shipment_id: 'S1' } }),
    ).toEqual({ invoice: true, sellerInvoice: false });
  });

  it('offers no Duncit invoice without a payment behind the order', () => {
    expect(orderDownloads({ payment_id: null, fulfilment_method: 'SHIP', shiprocket: { shipment_id: 'S1' } }).invoice).toBe(false);
    expect(orderDownloads({ fulfilment_method: 'SHIP' }).invoice).toBe(false);
  });
});
