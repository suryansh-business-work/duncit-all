/**
 * The taskbar clock's pure decisions — reading zones and offsets out of the
 * engine's own Intl data, with no hard-coded list of names or abbreviations.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  deviceTimeZone,
  describeZone,
  formatGmtOffset,
  supportedTimeZones,
  zoneChoices,
} from '../src/workspace/clock';

const AT = new Date('2026-08-28T12:00:00.000Z');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatGmtOffset', () => {
  it('pads a positive offset with a plus sign', () => {
    expect(formatGmtOffset(330)).toBe('GMT+05:30');
  });

  it('pads a negative offset with a minus sign', () => {
    expect(formatGmtOffset(-240)).toBe('GMT-04:00');
  });

  it('writes zero with a plus sign, the same as every other positive offset', () => {
    expect(formatGmtOffset(0)).toBe('GMT+00:00');
  });
});

describe('describeZone', () => {
  it('names a zone by its abbreviation when the engine has one', () => {
    // describeZone reads the process's ambient default locale (undefined) on
    // purpose — in a browser that is the visitor's own setting. A test runner
    // has no such visitor, so its default locale is whatever the OS/container
    // happens to be configured with, and 'IST' is only what ICU answers for an
    // Indian one. Pin it here so the assertion means something everywhere.
    const RealDateTimeFormat = Intl.DateTimeFormat;
    const spy = vi
      .spyOn(Intl, 'DateTimeFormat')
      // A `function`, not an arrow: vitest 4 only lets a mock stand in for a
      // constructor when its implementation is constructible, and this one is
      // reached through `new Intl.DateTimeFormat(...)`.
      .mockImplementation(function (locale, options) {
        return new RealDateTimeFormat(locale ?? 'en-IN', options) as unknown as Intl.DateTimeFormat;
      });

    const zone = describeZone('Asia/Kolkata', AT);

    expect(zone.value).toBe('Asia/Kolkata');
    expect(zone.offset).toBe(330);
    expect(zone.gmt).toBe('GMT+05:30');
    expect(zone.name).toBe('IST');

    spy.mockRestore();
  });

  it('falls back to the long name when the short one is just the offset again', () => {
    const zone = describeZone('America/New_York', AT);

    expect(zone.offset).toBe(-240);
    expect(zone.gmt).toBe('GMT-04:00');
    // Whatever ICU calls it in full, it is not the bare 'GMT-4' short() gave.
    expect(zone.name).not.toBe('GMT-4');
    expect(zone.name.length).toBeGreaterThan(0);
  });

  it('treats a zone with no offset digits at all as GMT/UTC zero', () => {
    const zone = describeZone('UTC', AT);

    expect(zone.offset).toBe(0);
    expect(zone.gmt).toBe('GMT+00:00');
  });

  it('reads a whole-hour offset with no minutes part as exactly on the hour', () => {
    // 'GMT+14' carries no ':mm' at all — the minutes capture group is undefined.
    const zone = describeZone('Pacific/Kiritimati', AT);

    expect(zone.offset).toBe(14 * 60);
    expect(zone.gmt).toBe('GMT+14:00');
  });

  it('names a zone blank when the formatter finds no time-zone part at all', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () =>
        ({
          formatToParts: () => [{ type: 'literal', value: '' }],
        }) as unknown as Intl.DateTimeFormat
    );

    const zone = describeZone('Asia/Kolkata', AT);

    expect(zone.name).toBe('');
    expect(zone.offset).toBe(0);
    spy.mockRestore();
  });

  it('describes a zone the engine cannot format as blank rather than throwing', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('Invalid time zone specified');
    });

    expect(() => describeZone('Not/AZone', AT)).not.toThrow();
    const zone = describeZone('Not/AZone', AT);
    expect(zone.name).toBe('');
    expect(zone.offset).toBe(0);

    spy.mockRestore();
  });
});

describe('zoneChoices', () => {
  it('lists every zone the browser knows, ordered west to east, and caches the result', () => {
    const first = zoneChoices();

    expect(first.length).toBeGreaterThan(0);
    for (let i = 1; i < first.length; i += 1) {
      expect(first[i].offset).toBeGreaterThanOrEqual(first[i - 1].offset);
    }

    expect(zoneChoices()).toBe(first);
  });
});

describe('supportedTimeZones and deviceTimeZone, when Intl refuses to answer', () => {
  it('reads an empty list rather than throwing when supportedValuesOf itself throws', () => {
    const spy = vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => {
      throw new Error('unsupported key');
    });

    expect(supportedTimeZones()).toEqual([]);
    spy.mockRestore();
  });

  it('reads an empty list on an older engine with no supportedValuesOf at all', () => {
    const original = Intl.supportedValuesOf;
    // @ts-expect-error -- simulating an engine old enough not to have this at all.
    delete Intl.supportedValuesOf;

    expect(supportedTimeZones()).toEqual([]);
    Intl.supportedValuesOf = original;
  });

  it('reads an empty string rather than throwing when the device zone cannot be read', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(deviceTimeZone()).toBe('');
    spy.mockRestore();
  });

  it('reads an empty string when the engine resolves to no zone at all', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone: '' }) }) as unknown as Intl.DateTimeFormat
    );

    expect(deviceTimeZone()).toBe('');
    spy.mockRestore();
  });
});
