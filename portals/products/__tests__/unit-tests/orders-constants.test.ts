import { describe, expect, it } from 'vitest';
import {
  ALL_STATUSES,
  PICKUP_FLOW,
  SHIP_FLOW,
  STATUS_COLOR,
  humaniseStatus,
} from '../../src/pages/orders/constants';

describe('orders constants', () => {
  it('replaces underscores with spaces and upper-cases each word start', () => {
    // The source only upper-cases the first char of each word; already-upper
    // input therefore stays upper-cased.
    expect(humaniseStatus('OUT_FOR_DELIVERY')).toBe('OUT FOR DELIVERY');
    expect(humaniseStatus('shipped')).toBe('Shipped');
    expect(humaniseStatus('awb_assigned')).toBe('Awb Assigned');
  });

  it('maps every status to a chip colour', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_COLOR[status]).toBeTruthy();
    }
  });

  it('defines forward flows that start at PENDING and end at a terminal state', () => {
    expect(SHIP_FLOW[0]).toBe('PENDING');
    expect(SHIP_FLOW.at(-1)).toBe('DELIVERED');
    expect(PICKUP_FLOW[0]).toBe('PENDING');
    expect(PICKUP_FLOW.at(-1)).toBe('PICKED_UP');
  });
});
