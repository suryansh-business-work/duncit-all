/** Whether the pod sells a ticket a host discount (Smart Incentive) could come off. */
import { describe, expect, it } from 'vitest';

import { isFreePodPrice } from '../src/pod-price';

describe('isFreePodPrice', () => {
  it('reads a FREE type as free, whatever price it carries', () => {
    expect(isFreePodPrice({ pod_type: 'FREE', pod_amount: 499 })).toBe(true);
  });

  it('reads a zero or missing price as free, whatever the type says', () => {
    expect(isFreePodPrice({ pod_type: 'PAID', pod_amount: 0 })).toBe(true);
    expect(isFreePodPrice({ pod_type: null, pod_amount: null })).toBe(true);
    expect(isFreePodPrice({})).toBe(true);
  });

  it('reads a priced PAID pod as able to carry a discount', () => {
    expect(isFreePodPrice({ pod_type: 'PAID', pod_amount: 499 })).toBe(false);
  });
});
