import { describe, expect, it } from 'vitest';
import {
  HOST_FREE_SPOT_NOTE,
  SPOTS_HARD_MAX,
  payableSpots,
  payingAttendees,
  spotsBounds,
} from '../src/pod-spots';

describe('HOST_FREE_SPOT_NOTE', () => {
  it('states the total spots − 1 rule shown next to money figures', () => {
    expect(HOST_FREE_SPOT_NOTE).toBe(
      'Your spot is free — the calculation is based on total spots − 1.',
    );
  });
});

describe('payableSpots', () => {
  it('bills one fewer than capacity because the host sits in the pod for free', () => {
    expect(payableSpots(30)).toBe(29);
    expect(payableSpots(2)).toBe(1);
  });

  it('bills nothing for a host-only or unlimited pod', () => {
    expect(payableSpots(1)).toBe(0);
    expect(payableSpots(0)).toBe(0);
  });

  it('never returns a negative for a nonsensical capacity', () => {
    expect(payableSpots(-5)).toBe(0);
  });

  it('treats non-finite capacities as unsellable', () => {
    expect(payableSpots(Number.NaN)).toBe(0);
    expect(payableSpots(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('floors a fractional capacity before subtracting the host spot', () => {
    expect(payableSpots(30.9)).toBe(29);
  });
});

describe('payingAttendees', () => {
  it('drops hosts from the head count', () => {
    expect(payingAttendees(['host-1', 'guest-1', 'guest-2'], ['host-1'])).toBe(2);
  });

  it('counts everyone when the pod has no hosts listed', () => {
    expect(payingAttendees(['guest-1', 'guest-2'], [])).toBe(2);
    expect(payingAttendees(['guest-1', 'guest-2'], null)).toBe(2);
    expect(payingAttendees(['guest-1'], undefined)).toBe(1);
  });

  it('returns zero when nobody has joined', () => {
    expect(payingAttendees([], ['host-1'])).toBe(0);
    expect(payingAttendees(null, ['host-1'])).toBe(0);
    expect(payingAttendees(undefined, ['host-1'])).toBe(0);
  });

  it('returns zero when every attendee is a host', () => {
    expect(payingAttendees(['host-1', 'host-2'], ['host-1', 'host-2'])).toBe(0);
  });

  it('ignores hosts who never joined the attendee list', () => {
    expect(payingAttendees(['guest-1'], ['host-1', 'host-2'])).toBe(1);
  });
});

describe('spotsBounds', () => {
  it('runs from the sub-category minimum to the booked space capacity', () => {
    expect(spotsBounds({ minPax: 4, venueCapacity: 30 })).toEqual({
      min: 4,
      max: 30,
      slidable: true,
    });
  });

  // A virtual pod has no venue: floored but not capped, and NOT slidable —
  // dragging a 0–10,000 slider is useless, so those keep the numeric stepper.
  it('falls back to the hard ceiling, without a slider, when no venue caps the pod', () => {
    expect(spotsBounds({ minPax: 4, venueCapacity: null })).toEqual({
      min: 4,
      max: SPOTS_HARD_MAX,
      slidable: false,
    });
    expect(spotsBounds({ minPax: 4, venueCapacity: 0 })).toEqual({
      min: 4,
      max: SPOTS_HARD_MAX,
      slidable: false,
    });
  });

  it('treats an unset minimum as no floor', () => {
    expect(spotsBounds({ minPax: 0, venueCapacity: 30 })).toEqual({ min: 0, max: 30, slidable: true });
    expect(spotsBounds({}).min).toBe(0);
    expect(spotsBounds({ minPax: null, venueCapacity: null })).toEqual({
      min: 0,
      max: SPOTS_HARD_MAX,
      slidable: false,
    });
  });

  // Nothing to choose between — the caller shows a fixed number, not a dead slider.
  it('is not slidable when the capacity leaves no room above the minimum', () => {
    expect(spotsBounds({ minPax: 8, venueCapacity: 8 })).toEqual({ min: 8, max: 8, slidable: false });
  });

  // A space smaller than the activity's minimum can never satisfy it; the range
  // collapses rather than inverting, and the server rejects the pod.
  it('never returns a max below the min', () => {
    expect(spotsBounds({ minPax: 10, venueCapacity: 4 })).toEqual({ min: 10, max: 10, slidable: false });
  });

  it('floors fractional input', () => {
    expect(spotsBounds({ minPax: 4.7, venueCapacity: 30.9 })).toEqual({ min: 4, max: 30, slidable: true });
  });
});
