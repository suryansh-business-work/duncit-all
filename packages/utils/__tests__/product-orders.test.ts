/**
 * Order fulfilment. Three surfaces render the same order — the buyer in mWeb and
 * the app, the seller in the Products portal — and the two ladders the buyer saw
 * disagreed with the one the seller drives. Those two disagreements are the
 * first thing pinned here.
 */
import { describe, expect, it } from 'vitest';

import {
  ALL_FULFILMENT_STATUSES,
  buildOrderTimeline,
  FULFILMENT_STATUS_KEYS,
  FULFILMENT_TONE,
  fulfilmentFlow,
  fulfilmentLabel,
  isTerminalFulfilment,
  PICKUP_FLOW,
  SHIP_FLOW,
  statusLabel,
  TONE_CHIP_COLOR,
  trackingUrl,
  type FulfilmentStatus,
} from '../src';

/** Hands back the key, so a wrong or missing key fails by name. */
const t = (key: string) => key;

const order = (fulfilment_method: string, fulfilment_status: string) => ({
  fulfilment_method,
  fulfilment_status,
});

const currentOf = (steps: { status: string; current: boolean }[]) =>
  steps.find((s) => s.current)?.status;

describe('the flows the seller actually drives', () => {
  it('starts a shipped order at PENDING — a just-placed order is not "preparing shipment"', () => {
    expect(SHIP_FLOW[0]).toBe('PENDING');
    expect(currentOf(buildOrderTimeline(order('SHIP', 'PENDING'), t))).toBe('PENDING');
  });

  it('gives a collected order its PICKUP_SCHEDULED rung', () => {
    expect(PICKUP_FLOW).toContain('PICKUP_SCHEDULED');
    // Before this moved, the apps' ladder had no such rung, so a scheduled
    // pickup fell back to index 0 and read "Order placed" to the buyer.
    expect(currentOf(buildOrderTimeline(order('PICKUP', 'PICKUP_SCHEDULED'), t))).toBe(
      'PICKUP_SCHEDULED',
    );
  });

  it('lists every status the type allows, exactly once', () => {
    expect(new Set(ALL_FULFILMENT_STATUSES).size).toBe(ALL_FULFILMENT_STATUSES.length);
    expect(ALL_FULFILMENT_STATUSES).toHaveLength(12);
  });

  it('draws both flows from the same vocabulary', () => {
    for (const status of [...SHIP_FLOW, ...PICKUP_FLOW]) {
      expect(ALL_FULFILMENT_STATUSES, status).toContain(status);
    }
  });
});

describe('fulfilmentFlow', () => {
  it('picks the ship flow only for SHIP, and treats anything else as a pickup', () => {
    expect(fulfilmentFlow('SHIP')).toBe(SHIP_FLOW);
    expect(fulfilmentFlow('PICKUP')).toBe(PICKUP_FLOW);
    expect(fulfilmentFlow('SOMETHING_NEW')).toBe(PICKUP_FLOW);
  });
});

describe('isTerminalFulfilment', () => {
  it('is true only for the three states an order does not come back from', () => {
    expect(isTerminalFulfilment('CANCELLED')).toBe(true);
    expect(isTerminalFulfilment('RTO')).toBe(true);
    expect(isTerminalFulfilment('FAILED')).toBe(true);
    expect(isTerminalFulfilment('DELIVERED')).toBe(false);
    expect(isTerminalFulfilment('PENDING')).toBe(false);
  });
});

describe('statusLabel / fulfilmentLabel', () => {
  it('resolves every status and method through the catalogue', () => {
    for (const status of ALL_FULFILMENT_STATUSES) {
      expect(statusLabel(status, t), status).toBe(FULFILMENT_STATUS_KEYS[status]);
    }
    expect(fulfilmentLabel('SHIP', t)).toBe('fulfilment.methodShip');
    expect(fulfilmentLabel('PICKUP', t)).toBe('fulfilment.methodPickup');
  });

  it('renders an unknown code as itself — visible and greppable, never blank', () => {
    // The server can add a state before any client knows about it.
    expect(statusLabel('AWAITING_QUANTUM_TUNNEL', t)).toBe('AWAITING_QUANTUM_TUNNEL');
    expect(fulfilmentLabel('DRONE', t)).toBe('DRONE');
  });
});

describe('FULFILMENT_TONE', () => {
  it('gives every status a tone that maps onto a chip colour', () => {
    for (const status of ALL_FULFILMENT_STATUSES) {
      expect(TONE_CHIP_COLOR[FULFILMENT_TONE[status]], status).toBeTruthy();
    }
  });

  it('reads the two happy endings as done and the two bad ones as failed', () => {
    expect(FULFILMENT_TONE.DELIVERED).toBe('done');
    expect(FULFILMENT_TONE.PICKED_UP).toBe('done');
    expect(FULFILMENT_TONE.RTO).toBe('failed');
    expect(FULFILMENT_TONE.FAILED).toBe('failed');
  });
});

describe('buildOrderTimeline', () => {
  it('marks everything before the current rung done, and nothing after', () => {
    const steps = buildOrderTimeline(order('SHIP', 'SHIPPED'), t);
    expect(steps.map((s) => s.status)).toEqual([...SHIP_FLOW]);
    expect(steps.filter((s) => s.done).map((s) => s.status)).toEqual([
      'PENDING',
      'AWAITING_SHIPMENT',
      'AWB_ASSIGNED',
    ]);
    expect(currentOf(steps)).toBe('SHIPPED');
    expect(steps.at(-1)?.done).toBe(false);
  });

  it('collapses a terminal order to one step — there is no ladder left', () => {
    for (const status of ['CANCELLED', 'RTO', 'FAILED']) {
      const steps = buildOrderTimeline(order('SHIP', status), t);
      expect(steps, status).toHaveLength(1);
      expect(steps[0]).toEqual({
        status,
        label: FULFILMENT_STATUS_KEYS[status as FulfilmentStatus],
        done: true,
        current: true,
      });
    }
  });

  it('falls back to the first rung for a status the flow does not contain', () => {
    // Never empty, never broken — but it IS how the two ladder bugs stayed
    // invisible, so the flows above are what actually keep it honest.
    expect(currentOf(buildOrderTimeline(order('SHIP', 'READY_FOR_PICKUP'), t))).toBe('PENDING');
    expect(currentOf(buildOrderTimeline(order('PICKUP', 'NONSENSE'), t))).toBe('PENDING');
  });

  it('marks the last rung current and everything else done once delivered', () => {
    const steps = buildOrderTimeline(order('SHIP', 'DELIVERED'), t);
    expect(steps.at(-1)?.current).toBe(true);
    expect(steps.slice(0, -1).every((s) => s.done)).toBe(true);
  });
});

describe('trackingUrl', () => {
  it('links to ShipRocket once an AWB exists', () => {
    expect(trackingUrl('SR12345678')).toBe('https://shiprocket.co/tracking/SR12345678');
  });

  it('is empty before one is assigned, so the caller shows no link', () => {
    expect(trackingUrl('')).toBe('');
  });
});
