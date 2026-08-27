import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ambientDateFormat,
  ambientDateFormatter,
  ambientDateSettings,
  ambientTimeFormat,
  formatDate,
  formatDateTime,
  formatDay,
  formatTime,
  resetAmbientDateSettings,
  setAmbientDateSettings,
  subscribeAmbientDateSettings,
} from '../src/ambient';
import { FALLBACK_DATE_FORMAT, FALLBACK_TIME_FORMAT, FALLBACK_TIME_ZONE } from '../src/format';

// The ambient cell is module-level state; every test leaves it on the fallbacks.
afterEach(() => {
  resetAmbientDateSettings();
});

describe('setAmbientDateSettings', () => {
  it('starts on the shared fallbacks before any settings land', () => {
    expect(ambientDateFormat()).toBe(FALLBACK_DATE_FORMAT);
    expect(ambientDateSettings()).toEqual({
      dateFormat: FALLBACK_DATE_FORMAT,
      timeFormat: FALLBACK_TIME_FORMAT,
      timeZone: FALLBACK_TIME_ZONE,
      timeZoneAware: false,
    });
  });

  it('publishes the admin patterns, filling gaps from the fallbacks', () => {
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    expect(ambientDateFormat()).toBe('yyyy-MM-dd');
    expect(ambientDateSettings().timeFormat).toBe(FALLBACK_TIME_FORMAT);
    expect(ambientDateSettings().timeZone).toBe(FALLBACK_TIME_ZONE);
    expect(ambientDateSettings().timeZoneAware).toBe(false);
  });

  it('treats empty strings as unset, exactly like the provider sending nothing', () => {
    setAmbientDateSettings({ dateFormat: '', timeFormat: '', timeZone: '' });
    expect(ambientDateSettings()).toEqual({
      dateFormat: FALLBACK_DATE_FORMAT,
      timeFormat: FALLBACK_TIME_FORMAT,
      timeZone: FALLBACK_TIME_ZONE,
      timeZoneAware: false,
    });
  });

  it('rebuilds the formatter only when a publish actually changes something', () => {
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    const first = ambientDateFormatter();
    // Same value published again (a provider re-render) keeps the reference.
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    expect(ambientDateFormatter()).toBe(first);
    setAmbientDateSettings({ dateFormat: 'dd/MM/yyyy' });
    expect(ambientDateFormatter()).not.toBe(first);
    expect(ambientDateFormatter().dateFormat).toBe('dd/MM/yyyy');
  });

  it('detects a change in EACH field, not just the date pattern', () => {
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    const listener = vi.fn();
    const unsubscribe = subscribeAmbientDateSettings(listener);
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm' });
    expect(listener).toHaveBeenCalledTimes(1);
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', timeZone: 'UTC' });
    expect(listener).toHaveBeenCalledTimes(2);
    setAmbientDateSettings({
      dateFormat: 'yyyy-MM-dd',
      timeFormat: 'HH:mm',
      timeZone: 'UTC',
      timeZoneAware: true,
    });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(ambientDateSettings().timeZoneAware).toBe(true);
    expect(ambientTimeFormat()).toBe('HH:mm');
    unsubscribe();
  });
});

describe('subscribeAmbientDateSettings', () => {
  it('does not wake subscribers for an unchanged publish', () => {
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    const listener = vi.fn();
    const unsubscribe = subscribeAmbientDateSettings(listener);
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('stops notifying after the returned unsubscribe runs', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAmbientDateSettings(listener);
    setAmbientDateSettings({ dateFormat: 'dd/MM/yyyy' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setAmbientDateSettings({ dateFormat: 'MM-dd-yyyy' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ambient plain formatters', () => {
  it('format the published patterns, matching the hook the components use', () => {
    setAmbientDateSettings({
      dateFormat: 'yyyy-MM-dd',
      timeFormat: 'HH:mm',
      timeZone: 'Asia/Kolkata',
      timeZoneAware: true,
    });
    // 00:00Z is 05:30 IST on the same day — e.g. a DUN-POD-4821 start time.
    expect(formatDate('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
    expect(formatTime('2026-03-01T00:00:00.000Z')).toBe('05:30');
    expect(formatDateTime('2026-03-01T00:00:00.000Z')).toBe('2026-03-01 · 05:30');
  });

  it('renders a stored calendar day with no zone conversion', () => {
    setAmbientDateSettings({ dateFormat: 'dd MMM yyyy', timeZone: 'UTC', timeZoneAware: true });
    expect(formatDay('2000-01-05')).toBe('05 Jan 2000');
  });
});

describe('resetAmbientDateSettings', () => {
  it('drops back to the fallbacks and tells subscribers', () => {
    setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd' });
    const listener = vi.fn();
    const unsubscribe = subscribeAmbientDateSettings(listener);
    resetAmbientDateSettings();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(ambientDateFormat()).toBe(FALLBACK_DATE_FORMAT);
    expect(ambientDateFormatter().dateFormat).toBe(FALLBACK_DATE_FORMAT);
    unsubscribe();
  });
});
