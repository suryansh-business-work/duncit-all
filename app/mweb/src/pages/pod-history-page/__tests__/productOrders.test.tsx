import { describe, it, expect } from 'vitest';
import {
  MY_PRODUCT_ORDERS_FOR_POD,
  MY_PRODUCT_ORDERS,
  FULFILMENT_LABEL,
  STATUS_LABEL,
  statusLabel,
  buildOrderTimeline,
  trackingUrl,
  formatMoney,
} from '../productOrders';

describe('productOrders query documents', () => {
  it('MY_PRODUCT_ORDERS_FOR_POD is a parsed query with the pod variable', () => {
    expect(MY_PRODUCT_ORDERS_FOR_POD.kind).toBe('Document');
    const src = MY_PRODUCT_ORDERS_FOR_POD.loc?.source.body ?? '';
    expect(src).toContain('MyProductOrdersForPod');
    expect(src).toContain('$podId: ID!');
    expect(src).toContain('myProductOrdersForPod(pod_doc_id: $podId)');
  });

  it('MY_PRODUCT_ORDERS is a parsed query that includes the pod field', () => {
    expect(MY_PRODUCT_ORDERS.kind).toBe('Document');
    const src = MY_PRODUCT_ORDERS.loc?.source.body ?? '';
    expect(src).toContain('myProductOrders');
    expect(src).toContain('pod_title');
  });
});

describe('label maps', () => {
  it('FULFILMENT_LABEL maps both methods', () => {
    expect(FULFILMENT_LABEL.SHIP).toBe('Ship to me');
    expect(FULFILMENT_LABEL.PICKUP).toBe('Pick up at venue');
  });

  it('STATUS_LABEL covers known statuses', () => {
    expect(STATUS_LABEL.DELIVERED).toBe('Delivered');
    expect(STATUS_LABEL.CANCELLED).toBe('Cancelled');
  });
});

describe('statusLabel', () => {
  it('returns the mapped label for a known status', () => {
    expect(statusLabel('SHIPPED')).toBe('Shipped');
  });

  it('falls back to the raw value for an unknown status', () => {
    expect(statusLabel('MYSTERY')).toBe('MYSTERY');
  });
});

describe('buildOrderTimeline', () => {
  it('collapses terminal statuses to a single done+current step', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'CANCELLED' });
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ status: 'CANCELLED', label: 'Cancelled', done: true, current: true });
  });

  it('builds the SHIP ladder with the current status marked', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'SHIPPED' });
    expect(steps.map((s) => s.status)).toEqual([
      'AWAITING_SHIPMENT',
      'AWB_ASSIGNED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
    const current = steps.find((s) => s.current);
    expect(current?.status).toBe('SHIPPED');
    // Everything before SHIPPED is done, nothing after.
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(true);
    expect(steps[2].done).toBe(false);
    expect(steps[3].done).toBe(false);
    expect(steps.every((s) => typeof s.label === 'string')).toBe(true);
  });

  it('builds the PICKUP ladder for non-SHIP methods', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'PICKUP', fulfilment_status: 'READY_FOR_PICKUP' });
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'READY_FOR_PICKUP', 'PICKED_UP']);
    expect(steps.find((s) => s.current)?.status).toBe('READY_FOR_PICKUP');
  });

  it('falls back to the first step for an unrecognised status', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'NOT_A_REAL_STATUS' });
    expect(steps[0].current).toBe(true);
    expect(steps[0].done).toBe(false);
  });
});

describe('trackingUrl', () => {
  it('returns a ShipRocket url for an AWB', () => {
    expect(trackingUrl('ABC123')).toBe('https://shiprocket.co/tracking/ABC123');
  });

  it('returns an empty string when there is no AWB', () => {
    expect(trackingUrl('')).toBe('');
  });
});

describe('formatMoney', () => {
  it('formats a positive amount with the symbol and en-IN grouping', () => {
    expect(formatMoney('₹', 100000)).toBe('₹1,00,000');
  });

  it('treats falsy amounts as zero', () => {
    expect(formatMoney('$', 0)).toBe('$0');
    // @ts-expect-error exercising the || 0 guard with a nullish amount
    expect(formatMoney('$', undefined)).toBe('$0');
  });
});
