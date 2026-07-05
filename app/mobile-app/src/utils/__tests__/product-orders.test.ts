import {
  buildOrderTimeline,
  fulfilmentLabel,
  formatMoney,
  statusLabel,
  trackingUrl,
} from '@/utils/product-orders';

describe('buildOrderTimeline', () => {
  it('builds the SHIP ladder with done + current + pending steps', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'SHIPPED' });
    expect(steps.map((s) => s.status)).toEqual([
      'AWAITING_SHIPMENT',
      'AWB_ASSIGNED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
    expect(steps[0]?.done).toBe(true);
    expect(steps[2]?.current).toBe(true);
    expect(steps[4]?.done).toBe(false);
    expect(steps[4]?.current).toBe(false);
  });

  it('marks all prior SHIP steps done when delivered', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'DELIVERED' });
    expect(steps.every((s, i) => (i < 4 ? s.done : s.current))).toBe(true);
  });

  it('falls back to the first step for an unknown status', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'WAT' });
    expect(steps[0]?.current).toBe(true);
  });

  it('builds the PICKUP ladder', () => {
    const steps = buildOrderTimeline({
      fulfilment_method: 'PICKUP',
      fulfilment_status: 'READY_FOR_PICKUP',
    });
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'READY_FOR_PICKUP', 'PICKED_UP']);
    expect(steps[0]?.done).toBe(true);
    expect(steps[1]?.current).toBe(true);
  });

  it('collapses terminal states to a single step', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'CANCELLED' });
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ label: 'Cancelled', done: true, current: true });
  });
});

describe('labels + helpers', () => {
  it('labels statuses with a raw-code fallback', () => {
    expect(statusLabel('DELIVERED')).toBe('Delivered');
    expect(statusLabel('MYSTERY')).toBe('MYSTERY');
  });

  it('labels methods with a raw-code fallback', () => {
    expect(fulfilmentLabel('SHIP')).toBe('Ship to me');
    expect(fulfilmentLabel('PICKUP')).toBe('Pick up at venue');
    expect(fulfilmentLabel('OTHER')).toBe('OTHER');
  });

  it('builds a tracking url only when an AWB exists', () => {
    expect(trackingUrl('AWB123')).toBe('https://shiprocket.co/tracking/AWB123');
    expect(trackingUrl('')).toBe('');
  });

  it('formats money', () => {
    expect(formatMoney('₹', 1500)).toBe('₹1,500');
    expect(formatMoney('₹', 0)).toBe('₹0');
  });
});
