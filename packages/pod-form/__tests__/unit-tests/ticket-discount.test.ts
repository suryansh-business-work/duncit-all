import { describe, it, expect } from 'vitest';
import { formatTicketPrice, podHasTicketPrice } from '../../src/ticket-discount';

describe('podHasTicketPrice', () => {
  it('is true for a paid pod with a price above zero', () => {
    expect(podHasTicketPrice({ pod_type: 'NATIVE_PAID', pod_amount: 499 })).toBe(true);
  });

  it('is false for any FREE type, whatever price is still in the box', () => {
    expect(podHasTicketPrice({ pod_type: 'NATIVE_FREE', pod_amount: 499 })).toBe(false);
  });

  it('is false for a paid pod whose price is zero or not typed yet', () => {
    expect(podHasTicketPrice({ pod_type: 'NATIVE_PAID', pod_amount: 0 })).toBe(false);
    expect(podHasTicketPrice({ pod_type: 'NATIVE_PAID', pod_amount: '' as unknown as number })).toBe(false);
  });
});

describe('formatTicketPrice', () => {
  it('prices a whole-rupee ticket without paise', () => {
    expect(formatTicketPrice(500)).toBe('₹500');
  });

  // ₹499 at 10% off is ₹449.10 — the whole-rupee default would round it away.
  it('keeps the paise a discount can land on', () => {
    expect(formatTicketPrice(449.1)).toBe('₹449.10');
  });

  it('uses the configured currency symbol', () => {
    expect(formatTicketPrice(1250, 'Rs ')).toBe('Rs 1,250');
  });
});
