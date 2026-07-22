import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPodActive, isPodExpired, podStatus, podStatusChip } from '../podStatus';

const NOW = new Date('2026-07-22T12:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe('podStatus', () => {
  it('returns UPCOMING when start is missing', () => {
    expect(podStatus()).toBe('UPCOMING');
    expect(podStatus(null)).toBe('UPCOMING');
    expect(podStatus(undefined)).toBe('UPCOMING');
  });

  it('returns UPCOMING when start is not a valid date', () => {
    expect(podStatus('not-a-date')).toBe('UPCOMING');
  });

  it('returns UPCOMING when start is in the future', () => {
    expect(podStatus(iso(HOUR))).toBe('UPCOMING');
  });

  it('returns LIVE when now is between start and derived end (no explicit end)', () => {
    // start 1h ago, no end -> live for 4h tail
    expect(podStatus(iso(-HOUR))).toBe('LIVE');
  });

  it('returns LIVE exactly at start time', () => {
    expect(podStatus(iso(0))).toBe('LIVE');
  });

  it('returns LIVE when now is between explicit start and end', () => {
    expect(podStatus(iso(-HOUR), iso(HOUR))).toBe('LIVE');
  });

  it('returns LIVE exactly at the end time', () => {
    expect(podStatus(iso(-HOUR), iso(0))).toBe('LIVE');
  });

  it('returns ENDED past the explicit end time', () => {
    expect(podStatus(iso(-2 * HOUR), iso(-HOUR))).toBe('ENDED');
  });

  it('returns ENDED past the derived 4h tail when no end is given', () => {
    // start 5h ago, tail is 4h -> ended
    expect(podStatus(iso(-5 * HOUR))).toBe('ENDED');
  });
});

describe('isPodActive', () => {
  it('is true for upcoming pods', () => {
    expect(isPodActive(iso(HOUR))).toBe(true);
  });

  it('is true for live pods', () => {
    expect(isPodActive(iso(-HOUR))).toBe(true);
  });

  it('is false for ended pods', () => {
    expect(isPodActive(iso(-2 * HOUR), iso(-HOUR))).toBe(false);
  });
});

describe('isPodExpired', () => {
  it('is false when start is missing', () => {
    expect(isPodExpired()).toBe(false);
    expect(isPodExpired(null)).toBe(false);
  });

  it('is false when start is an invalid date', () => {
    expect(isPodExpired('nonsense')).toBe(false);
  });

  it('is false when start is in the future', () => {
    expect(isPodExpired(iso(HOUR))).toBe(false);
  });

  it('is true when start is in the past', () => {
    expect(isPodExpired(iso(-HOUR))).toBe(true);
  });
});

describe('podStatusChip', () => {
  it('maps LIVE to a success chip', () => {
    expect(podStatusChip('LIVE')).toEqual({ label: 'Live', color: 'success' });
  });

  it('maps UPCOMING to a warning chip', () => {
    expect(podStatusChip('UPCOMING')).toEqual({ label: 'Upcoming', color: 'warning' });
  });

  it('maps ENDED to a default chip', () => {
    expect(podStatusChip('ENDED')).toEqual({ label: 'Ended', color: 'default' });
  });
});
