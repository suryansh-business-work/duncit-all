import { afterEach, describe, expect, it, vi } from 'vitest';

import { DUID_STORAGE_KEY, deviceTimezone, makeDevice } from '../src/device';
import { SURFACE_HEADER } from '../src/surface';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the shared header and storage keys', () => {
  it('names one DUID key and one surface header for every transport', () => {
    expect(DUID_STORAGE_KEY).toBe('duncit_duid');
    // Changing this needs the nginx Access-Control-Allow-Headers allowlist too.
    expect(SURFACE_HEADER).toBe('x-duncit-surface');
  });
});

describe('makeDevice', () => {
  it('keeps every part it was given', () => {
    expect(
      makeDevice({
        duid: 'duid-1',
        platform: 'android',
        os: 'Android 15',
        model: 'Pixel 9',
        app_version: '1.68.10',
        timezone: 'Asia/Kolkata',
      })
    ).toEqual({
      duid: 'duid-1',
      platform: 'android',
      os: 'Android 15',
      model: 'Pixel 9',
      app_version: '1.68.10',
      timezone: 'Asia/Kolkata',
    });
  });

  it('lands every absent field as an empty string, so nothing drops out of a JSON bug report', () => {
    expect(makeDevice({})).toEqual({
      duid: '',
      platform: 'unknown',
      os: '',
      model: '',
      app_version: '',
      timezone: '',
    });
  });

  it('names an unknown platform rather than leaving it blank', () => {
    expect(makeDevice({ platform: '' }).platform).toBe('unknown');
  });

  it('discards a non-string probe result instead of serialising it', () => {
    const probed = { model: 42, os: null, duid: undefined } as never;

    expect(makeDevice(probed)).toMatchObject({ model: '', os: '', duid: '' });
  });
});

describe('deviceTimezone', () => {
  it('reports the resolved IANA zone', () => {
    expect(deviceTimezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('returns an empty string where the platform reports no zone', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: '' }),
    } as unknown as Intl.DateTimeFormat);

    expect(deviceTimezone()).toBe('');
  });

  it('returns an empty string where Intl throws rather than crashing a log frame', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no Intl');
    });

    expect(deviceTimezone()).toBe('');
  });
});
