import { describe, expect, it } from 'vitest';
import {
  POD_TYPE_OPTIONS,
  dateValue,
  isBelowMinPax,
  modeLabel,
  podModeOptions,
  podSpotCounts,
  productLines,
  productsValue,
  spotsValue,
  statusValue,
  typeValue,
} from '../podsColumns.values';
import type { PodRow } from '../queries';

const pod = (over: Partial<PodRow> = {}): PodRow =>
  ({
    id: 'p1',
    pod_id: 'DUN-POD-1',
    pod_title: 'Chess',
    club_id: 'c1',
    pod_mode: 'PHYSICAL',
    pod_hits: 0,
    pod_type: 'NATIVE_PAID',
    pod_amount: 100,
    is_active: true,
    ...over,
  }) as PodRow;

describe('podModeOptions / POD_TYPE_OPTIONS', () => {
  it('labels the modes through the caller\'s translator', () => {
    expect(podModeOptions((key) => `<${key}>`)).toEqual([
      { value: 'PHYSICAL', label: '<podForm.podMode.physical>' },
      { value: 'VIRTUAL', label: '<podForm.podMode.virtual>' },
    ]);
  });

  it('turns each pod type constant into a readable option', () => {
    expect(POD_TYPE_OPTIONS).toContainEqual({ value: 'NON_NATIVE_PAID', label: 'NON NATIVE PAID' });
    expect(POD_TYPE_OPTIONS).toHaveLength(5);
  });
});

describe('modeLabel / typeValue', () => {
  it('reads anything that is not VIRTUAL as Physical', () => {
    expect(modeLabel(pod({ pod_mode: 'VIRTUAL' }))).toBe('Virtual');
    expect(modeLabel(pod({ pod_mode: 'PHYSICAL' }))).toBe('Physical');
  });

  it('joins the mode and the spaced pod type', () => {
    expect(typeValue(pod({ pod_mode: 'VIRTUAL', pod_type: 'NATIVE_FREE' }))).toBe('Virtual · NATIVE FREE');
  });
});

describe('statusValue', () => {
  it('ranks cancelled above completed above risk above venue states', () => {
    expect(statusValue(pod({ is_deleted: true, completed_at: '2026-01-01' }))).toBe('Cancelled');
    expect(
      statusValue(pod({ completed_at: '2026-01-01', cancellation_risk: { at_risk: true, shortfall: 1 } })),
    ).toBe('Completed');
    expect(
      statusValue(
        pod({ cancellation_risk: { at_risk: true, shortfall: 1 }, venue_approval_status: 'PENDING' }),
      ),
    ).toBe('Cancellation risk');
  });

  it('names the venue\'s answer while the pod is still waiting on it', () => {
    expect(statusValue(pod({ venue_approval_status: 'PENDING' }))).toBe('Awaiting venue');
    expect(statusValue(pod({ venue_approval_status: 'DECLINED' }))).toBe('Venue rejected');
  });

  it('falls through to Active or Draft by the live switch', () => {
    expect(statusValue(pod({ cancellation_risk: { at_risk: false, shortfall: 0 } }))).toBe('Active');
    expect(statusValue(pod({ is_active: false, venue_approval_status: 'APPROVED' }))).toBe('Draft');
  });
});

describe('products', () => {
  const withItems = pod({
    product_requests: [
      { product_id: 'a', product_name: 'Tea', quantity: 2 },
      { product_id: 'b', product_name: 'Cake', quantity: 1 },
    ],
    product_cost_total: 350,
  });

  it('lists each requested product with its quantity', () => {
    expect(productLines(withItems)).toBe('Tea: 2, Cake: 1');
    expect(productLines(pod())).toBe('');
  });

  it('adds the cost, and shows a dash when nothing was requested', () => {
    expect(productsValue(withItems)).toBe('Tea: 2, Cake: 1 · ₹350');
    expect(productsValue(pod({ product_requests: [] }))).toBe('—');
    expect(productsValue(pod())).toBe('—');
  });

  it('prices items with an unreported cost at zero rather than NaN', () => {
    const noCost = pod({ product_requests: [{ product_id: 'a', product_name: 'Tea', quantity: 1 }] });
    expect(productsValue(noCost)).toBe('Tea: 1 · ₹0');
  });
});

describe('spots', () => {
  it('counts a multi-seat booking as its seats, not as one person', () => {
    expect(podSpotCounts(pod({ pod_attendees: ['a', 'b'], seats_taken: 5, no_of_spots: 10 }))).toEqual({
      seats: 5,
      people: 2,
      extraSeats: 3,
      total: 10,
    });
  });

  it('never reports negative extra seats and treats no capacity as 0', () => {
    expect(podSpotCounts(pod({ pod_attendees: ['a', 'b', 'c'], seats_taken: 1 }))).toMatchObject({
      extraSeats: 0,
      total: 0,
    });
    expect(podSpotCounts(pod({ pod_attendees: null }))).toMatchObject({ people: 0 });
  });

  it('formats seats against capacity, or just seats when no capacity was set', () => {
    expect(spotsValue(pod({ seats_taken: 4, no_of_spots: 12 }))).toBe('4 / 12');
    expect(spotsValue(pod({ seats_taken: 4, no_of_spots: 0 }))).toBe('4');
  });
});

describe('isBelowMinPax', () => {
  it('is true only for a live pod holding fewer seats than the floor', () => {
    expect(isBelowMinPax(pod({ seats_taken: 2 }), 5)).toBe(true);
    expect(isBelowMinPax(pod({ seats_taken: 5 }), 5)).toBe(false);
  });

  it('never flags a cancelled pod, nor a club with no floor', () => {
    expect(isBelowMinPax(pod({ seats_taken: 0, is_deleted: true }), 5)).toBe(false);
    expect(isBelowMinPax(pod({ seats_taken: 0 }), 0)).toBe(false);
  });
});

describe('dateValue', () => {
  it('shows a dash for a missing date and a formatted one otherwise', () => {
    expect(dateValue(null)).toBe('—');
    expect(dateValue(undefined)).toBe('—');
    expect(dateValue('2026-10-04T12:30:00.000Z')).not.toBe('—');
  });
});
