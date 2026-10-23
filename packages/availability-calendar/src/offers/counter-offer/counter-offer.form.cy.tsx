import { describe, expect, it } from 'vitest';
import { counterTermsOf } from './counter-offer.types';

describe('counterTermsOf', () => {
  it('carries a pricing option with a usable amount, as a number', () => {
    expect(counterTermsOf({ model: 'PER_HOUR', rate: ' 1500 ' })).toEqual({ model: 'PER_HOUR', rate: 1500 });
    expect(counterTermsOf({ model: 'FLAT', rate: '999.5' })).toEqual({ model: 'FLAT', rate: 999.5 });
  });

  it('is null until the amount can be priced', () => {
    for (const rate of ['', '0', '-1', 'abc']) {
      expect(counterTermsOf({ model: 'FLAT', rate })).toBeNull();
    }
  });
});
