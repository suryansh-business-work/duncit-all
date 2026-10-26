import { describe, expect, it } from 'vitest';
import {
  ORDER_STATUS_COLORS,
  REFUND_STATUSES,
  REFUND_STATUS_COLORS,
  orderItemsSummary,
  orderTotal,
  refundAmount,
  refundStatusLabel,
} from './order-labels';
import type { OrderRow } from './orders.queries';

/** Writes the key and its variables out, so a test sees both which copy and what filled it. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}|${JSON.stringify(options.vars)}` : key;

const line = (name: string, qty: number) => ({ name, qty }) as OrderRow['line_items'][number];

describe('orderItemsSummary', () => {
  it('shows a dash for an order with no lines', () => {
    expect(orderItemsSummary(t, { line_items: [] })).toBe('—');
  });

  it('names the one line', () => {
    expect(orderItemsSummary(t, { line_items: [line('Collar', 2)] })).toBe(
      'partners.orders.itemLine|{"name":"Collar","qty":2}',
    );
  });

  it('names the first line and counts the rest', () => {
    const summary = orderItemsSummary(t, { line_items: [line('Collar', 2), line('Leash', 1), line('Bowl', 4)] });
    expect(summary).toBe(
      'partners.orders.itemsMore|{"first":"partners.orders.itemLine|{\\"name\\":\\"Collar\\",\\"qty\\":2}","more":2}',
    );
  });
});

describe('money', () => {
  it('writes the total in the currency it was paid in', () => {
    expect(orderTotal({ total: 1499.5, currency_symbol: '$' })).toBe('$1,499.50');
  });

  it('falls back to the rupee when the order carries no symbol', () => {
    expect(orderTotal({ total: 250, currency_symbol: '' })).toBe('₹250.00');
  });

  it('writes the refund in the order currency', () => {
    expect(refundAmount({ refund: { amount: 99 } as OrderRow['refund'], currency_symbol: '$' })).toBe('$99.00');
    expect(refundAmount({ refund: { amount: 99 } as OrderRow['refund'], currency_symbol: '' })).toBe('₹99.00');
  });
});

describe('refund and status vocabulary', () => {
  it.each([
    ['PENDING', 'partners.orders.refundPending'],
    ['PROCESSED', 'partners.orders.refundProcessed'],
    ['RECORDED', 'partners.orders.refundRecorded'],
    ['FAILED', 'partners.orders.refundFailed'],
    ['NONE', 'partners.orders.refundNone'],
  ])('labels a %s refund', (status, expected) => {
    expect(refundStatusLabel(status, t)).toBe(expected);
  });

  it('offers every refund state but NONE and colours each', () => {
    expect(REFUND_STATUSES).toEqual(['PENDING', 'PROCESSED', 'RECORDED', 'FAILED']);
    expect(REFUND_STATUS_COLORS).toEqual({
      NONE: 'default',
      PENDING: 'warning',
      PROCESSED: 'success',
      RECORDED: 'info',
      FAILED: 'error',
    });
  });

  it('colours each fulfilment status with a chip colour', () => {
    expect(Object.keys(ORDER_STATUS_COLORS).length).toBeGreaterThan(0);
    expect(Object.values(ORDER_STATUS_COLORS).every(Boolean)).toBe(true);
  });
});
