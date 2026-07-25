import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_SOURCE,
  createClock,
  resolveNow,
  toEpochMs,
  toTimeSource,
} from '../src/clock';

const iso = (s: string) => new Date(s).getTime();

describe('toTimeSource', () => {
  it('accepts the three known sources and defaults anything else', () => {
    expect(toTimeSource('SERVER')).toBe('SERVER');
    expect(toTimeSource('BROWSER')).toBe('BROWSER');
    expect(toTimeSource('CUSTOM')).toBe('CUSTOM');
    expect(toTimeSource('nonsense')).toBe(DEFAULT_TIME_SOURCE);
    expect(toTimeSource(null)).toBe(DEFAULT_TIME_SOURCE);
    expect(toTimeSource(undefined)).toBe(DEFAULT_TIME_SOURCE);
  });
});

describe('toEpochMs', () => {
  it('coerces ISO strings, numbers and Dates, and rejects junk', () => {
    expect(toEpochMs('2026-01-01T00:00:00.000Z')).toBe(iso('2026-01-01T00:00:00.000Z'));
    expect(toEpochMs(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(toEpochMs(new Date('2026-01-01T00:00:00.000Z'))).toBe(iso('2026-01-01T00:00:00.000Z'));
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs(undefined)).toBeNull();
    expect(toEpochMs('')).toBeNull();
    expect(toEpochMs('not-a-date')).toBeNull();
    expect(toEpochMs(new Date('nope'))).toBeNull();
  });
});

describe('resolveNow', () => {
  const realNow = () => 1_000_000;

  it('BROWSER uses the device clock', () => {
    expect(resolveNow({ source: 'BROWSER', realNow })).toBe(1_000_000);
  });

  it('SERVER keeps ticking by adding the time elapsed since the response', () => {
    // Server said 5,000,000 when the device clock read 999,000 — 1s ago.
    expect(
      resolveNow({
        source: 'SERVER',
        serverNow: new Date(5_000_000),
        serverNowReceivedAt: 999_000,
        realNow,
      }),
    ).toBe(5_001_000);
  });

  it('SERVER falls back to the device clock when the server time is missing', () => {
    expect(resolveNow({ source: 'SERVER', realNow })).toBe(1_000_000);
    expect(resolveNow({ source: 'SERVER', serverNow: new Date(5_000_000), realNow })).toBe(1_000_000);
    expect(resolveNow({ source: 'SERVER', serverNowReceivedAt: 999_000, realNow })).toBe(1_000_000);
  });

  it('CUSTOM starts at the anchor and moves with the server clock', () => {
    // Anchor 2030-01-01, saved when the server read 4,000,000. The server is
    // now at 5,001,000 -> 1,001,000ms have passed, so the custom clock has too.
    const anchor = iso('2030-01-01T00:00:00.000Z');
    expect(
      resolveNow({
        source: 'CUSTOM',
        customTime: '2030-01-01T00:00:00.000Z',
        customTimeSetAt: new Date(4_000_000),
        serverNow: new Date(5_000_000),
        serverNowReceivedAt: 999_000,
        realNow,
      }),
    ).toBe(anchor + 1_001_000);
  });

  it('CUSTOM without a save-stamp freezes at the anchor', () => {
    const anchor = iso('2030-01-01T00:00:00.000Z');
    expect(
      resolveNow({ source: 'CUSTOM', customTime: '2030-01-01T00:00:00.000Z', realNow }),
    ).toBe(anchor);
  });

  it('CUSTOM measures elapsed on the device clock when there is no server time', () => {
    const anchor = iso('2030-01-01T00:00:00.000Z');
    expect(
      resolveNow({
        source: 'CUSTOM',
        customTime: '2030-01-01T00:00:00.000Z',
        customTimeSetAt: new Date(900_000),
        realNow,
      }),
    ).toBe(anchor + 100_000);
  });

  it('CUSTOM with no anchor falls back to server, then device', () => {
    expect(
      resolveNow({
        source: 'CUSTOM',
        serverNow: new Date(5_000_000),
        serverNowReceivedAt: 999_000,
        realNow,
      }),
    ).toBe(5_001_000);
    expect(resolveNow({ source: 'CUSTOM', realNow })).toBe(1_000_000);
  });

  it('defaults to the real Date.now when no realNow is injected', () => {
    const before = Date.now();
    const value = resolveNow({ source: 'BROWSER' });
    expect(value).toBeGreaterThanOrEqual(before);
  });
});

describe('createClock', () => {
  it('exposes the source and a live now()/nowMs()', () => {
    const clock = createClock({ source: 'BROWSER', realNow: () => 1_234_000 });
    expect(clock.source).toBe('BROWSER');
    expect(clock.nowMs()).toBe(1_234_000);
    expect(clock.now().getTime()).toBe(1_234_000);
  });
});
