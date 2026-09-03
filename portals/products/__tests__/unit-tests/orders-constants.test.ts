import { describe, expect, it } from 'vitest';
import {
  ALL_STATUSES,
  PICKUP_FLOW,
  SHIP_FLOW,
  STATUS_COLOR,
  humaniseStatus,
} from '../../src/pages/orders/constants';

describe('orders constants', () => {
  it('reads a status through the shared catalogue rather than title-casing it', () => {
    // This replaced a version that title-cased the raw code — it rendered
    // "Awb Assigned" and "Rto", and reached no translator at all (rule 38).
    const t = (key: string) => key;

    expect(humaniseStatus('OUT_FOR_DELIVERY', t)).toBe('fulfilment.statusOutForDelivery');
    expect(humaniseStatus('SHIPPED', t)).toBe('fulfilment.statusShipped');
    expect(humaniseStatus('AWB_ASSIGNED', t)).toBe('fulfilment.statusAwbAssigned');
  });

  it('falls back to the raw code for a status it has no words for', () => {
    // A status added server-side must render as itself rather than blank on a
    // client that has not shipped a key for it yet.
    const t = (key: string) => key;

    expect(humaniseStatus('SOMETHING_NEW', t)).toBe('SOMETHING_NEW');
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
