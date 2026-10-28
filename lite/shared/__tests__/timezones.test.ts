import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTimeZone, timeZoneOptions } from '../timezones';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isTimeZone', () => {
  it('accepts IANA names and the aliases an engine knows but may not list', () => {
    expect(isTimeZone('Europe/London')).toBe(true);
    expect(isTimeZone('Asia/Kolkata')).toBe(true);
    expect(isTimeZone('Asia/Calcutta')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
  });

  it('refuses a blank, made-up or malformed zone', () => {
    expect(isTimeZone('')).toBe(false);
    expect(isTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isTimeZone('Asia Kolkata')).toBe(false);
  });
});

describe('timeZoneOptions', () => {
  it('lists every zone the engine names, sorted', () => {
    const zones = timeZoneOptions();
    expect(zones).toEqual(expect.arrayContaining(Intl.supportedValuesOf('timeZone')));
    expect(zones).toEqual([...zones].sort((a, b) => a.localeCompare(b)));
  });

  it('adds a kept zone the engine knows only by another name, once', () => {
    const zones = timeZoneOptions(['Asia/Kolkata', 'Asia/Kolkata', 'UTC']);
    expect(zones.filter((zone) => zone === 'Asia/Kolkata')).toHaveLength(1);
    expect(zones).toContain('UTC');
  });

  it('never adds a kept value that is not a zone', () => {
    expect(timeZoneOptions(['', 'Mars/Olympus_Mons'])).toEqual(timeZoneOptions());
  });

  it('still offers the kept zones where the engine cannot list any', () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => {
      throw new RangeError('Intl.supportedValuesOf is not supported');
    });
    expect(timeZoneOptions(['Asia/Kolkata', 'Europe/London'])).toEqual(['Asia/Kolkata', 'Europe/London']);
  });
});
