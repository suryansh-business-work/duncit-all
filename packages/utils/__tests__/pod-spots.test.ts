import { describe, expect, it } from 'vitest';
import {
  HOST_FREE_SPOT_NOTE,
  SPOTS_HARD_MAX,
  attendeeSeatCount,
  payableSpots,
  payingAttendees,
  podSeatsTaken,
  podSpotsLeft,
  spotsBounds,
  type PodSeatCounts,
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

  // A negative minimum is no floor and a negative capacity is no venue — the
  // bounds never invert into a range the stepper cannot render.
  it('treats a negative minimum as no floor and a negative capacity as no venue', () => {
    expect(spotsBounds({ minPax: -3, venueCapacity: 30 })).toEqual({ min: 0, max: 30, slidable: true });
    expect(spotsBounds({ minPax: 4, venueCapacity: -5 })).toEqual({
      min: 4,
      max: SPOTS_HARD_MAX,
      slidable: false,
    });
  });
});

/** A pod's seat fields, with only the ones under test set deliberately. */
const seatPod = (over: PodSeatCounts = {}): PodSeatCounts => ({ ...over });

describe('podSeatsTaken', () => {
  // The bug this exists for: a person who books four seats is ONE entry in
  // `pod_attendees`, so counting the list under-reported that booking by three.
  it('prefers the server-computed seats_taken over the attendee list length', () => {
    expect(podSeatsTaken(seatPod({ seats_taken: 5, pod_attendees: ['a', 'b'] }))).toBe(5);
  });

  it('falls back to the attendee list for a query that never selected seats_taken', () => {
    expect(podSeatsTaken(seatPod({ pod_attendees: ['a', 'b', 'c'] }))).toBe(3);
    expect(podSeatsTaken(seatPod({ seats_taken: null, pod_attendees: ['a', 'b'] }))).toBe(2);
  });

  // Zero and negative are not "nobody booked" — they are "not selected"; the
  // list (which every query carries) is the authority then.
  it('does not trust a zero or negative seats_taken over a populated list', () => {
    expect(podSeatsTaken(seatPod({ seats_taken: 0, pod_attendees: ['a'] }))).toBe(1);
    expect(podSeatsTaken(seatPod({ seats_taken: -2, pod_attendees: ['a', 'b'] }))).toBe(2);
  });

  it('ignores a non-finite seats_taken', () => {
    expect(podSeatsTaken(seatPod({ seats_taken: Number.NaN, pod_attendees: ['a'] }))).toBe(1);
    expect(
      podSeatsTaken(seatPod({ seats_taken: Number.POSITIVE_INFINITY, pod_attendees: ['a'] })),
    ).toBe(1);
  });

  it('floors a fractional seats_taken', () => {
    expect(podSeatsTaken(seatPod({ seats_taken: 3.9 }))).toBe(3);
  });

  it('is zero when the pod carries neither a count nor an attendee list', () => {
    expect(podSeatsTaken(seatPod())).toBe(0);
    expect(podSeatsTaken(seatPod({ seats_taken: null, pod_attendees: null }))).toBe(0);
    expect(podSeatsTaken(seatPod({ pod_attendees: [] }))).toBe(0);
  });

  it('is zero for a missing pod', () => {
    expect(podSeatsTaken(null)).toBe(0);
    expect(podSeatsTaken(undefined)).toBe(0);
  });
});

describe('podSpotsLeft', () => {
  it('prefers the server-computed seats_available over its own arithmetic', () => {
    // The derived answer would be 6; the server's figure wins.
    expect(podSpotsLeft(seatPod({ seats_available: 7, no_of_spots: 10, seats_taken: 4 }))).toBe(7);
  });

  it('floors a fractional seats_available', () => {
    expect(podSpotsLeft(seatPod({ seats_available: 2.9 }))).toBe(2);
  });

  it('derives capacity minus seats taken when seats_available was not selected', () => {
    expect(podSpotsLeft(seatPod({ no_of_spots: 10, seats_taken: 4 }))).toBe(6);
    expect(podSpotsLeft(seatPod({ seats_available: null, no_of_spots: 10, seats_taken: 4 }))).toBe(6);
  });

  // The derivation goes through podSeatsTaken, so a multi-seat booking is
  // subtracted as the seats it holds, never as the one row it renders as.
  it('subtracts the attendee list when neither server figure is present', () => {
    expect(podSpotsLeft(seatPod({ no_of_spots: 10, pod_attendees: ['a', 'b'] }))).toBe(8);
  });

  it('floors a fractional capacity before subtracting', () => {
    expect(podSpotsLeft(seatPod({ no_of_spots: 10.7, seats_taken: 3 }))).toBe(7);
  });

  // Zero is "not selected", not "sold out" — the same rule as seats_taken — so
  // the answer is re-derived from the fields that are present.
  it('does not trust a zero or negative seats_available', () => {
    expect(podSpotsLeft(seatPod({ seats_available: 0, no_of_spots: 10, seats_taken: 3 }))).toBe(7);
    expect(podSpotsLeft(seatPod({ seats_available: -1, no_of_spots: 10, seats_taken: 3 }))).toBe(7);
  });

  // Infinity is the case that matters here: without the finite check it would
  // be "positive" and the screen would show infinite seats left.
  it('ignores a non-finite seats_available', () => {
    expect(podSpotsLeft(seatPod({ seats_available: Number.NaN, no_of_spots: 5, seats_taken: 1 }))).toBe(4);
    expect(
      podSpotsLeft(seatPod({ seats_available: Number.POSITIVE_INFINITY, no_of_spots: 5, seats_taken: 1 })),
    ).toBe(4);
  });

  // `no_of_spots` of 0 means unlimited, which has no meaningful "left".
  it('answers zero for an unlimited or unsized pod, whatever is booked', () => {
    expect(podSpotsLeft(seatPod({ no_of_spots: 0, seats_taken: 3 }))).toBe(0);
    expect(podSpotsLeft(seatPod({ no_of_spots: null, pod_attendees: ['a'] }))).toBe(0);
    expect(podSpotsLeft(seatPod({ no_of_spots: -4, seats_taken: 1 }))).toBe(0);
    expect(podSpotsLeft(seatPod())).toBe(0);
  });

  it('never goes negative for an overbooked pod', () => {
    expect(podSpotsLeft(seatPod({ no_of_spots: 4, seats_taken: 6 }))).toBe(0);
  });

  it('reports a full pod as exactly zero left', () => {
    expect(podSpotsLeft(seatPod({ no_of_spots: 4, seats_taken: 4 }))).toBe(0);
  });

  it('is zero for a missing pod', () => {
    expect(podSpotsLeft(null)).toBe(0);
    expect(podSpotsLeft(undefined)).toBe(0);
  });
});

describe('attendeeSeatCount', () => {
  // The bug this exists for: a party of three is ONE row, so a heading counting
  // rows told five people they were seven.
  it('counts the seats a booking holds, not the row it renders as', () => {
    expect(attendeeSeatCount([{ seats: 1 }, { seats: 3 }, { seats: 1 }])).toBe(5);
  });

  it('treats a row with no seats as a booking for one', () => {
    expect(attendeeSeatCount([{}, { seats: null }, { seats: 0 }])).toBe(3);
  });

  it('floors a fractional seats value and counts a negative one as a booking for one', () => {
    expect(attendeeSeatCount([{ seats: 2.9 }, { seats: -2 }])).toBe(3);
  });

  it('is zero for an empty or missing list', () => {
    expect(attendeeSeatCount([])).toBe(0);
    expect(attendeeSeatCount(null)).toBe(0);
    expect(attendeeSeatCount(undefined)).toBe(0);
  });
});
