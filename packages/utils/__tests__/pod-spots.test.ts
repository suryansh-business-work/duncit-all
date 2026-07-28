import { describe, expect, it } from 'vitest';
import { HOST_FREE_SPOT_NOTE, payableSpots, payingAttendees } from '../src/pod-spots';

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
