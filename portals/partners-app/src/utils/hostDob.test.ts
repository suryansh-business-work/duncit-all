import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HOST_DOB_MAX_AGE_YEARS,
  HOST_DOB_MIN_AGE_YEARS,
  getHostDobMaxDate,
  getHostDobMinDate,
  isValidHostDob,
} from './hostDob';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 15, 13, 30));
});
afterEach(() => vi.useRealTimers());

describe('host date of birth bounds', () => {
  it('allows hosts from 18 to 100 years old, counted from the start of today', () => {
    expect(HOST_DOB_MIN_AGE_YEARS).toBe(18);
    expect(HOST_DOB_MAX_AGE_YEARS).toBe(100);
    expect(getHostDobMaxDate()).toEqual(new Date(2008, 5, 15));
    expect(getHostDobMinDate()).toEqual(new Date(1926, 5, 15));
  });
});

describe('isValidHostDob', () => {
  it('accepts a missing value because the field is optional', () => {
    expect(isValidHostDob(undefined)).toBe(true);
    expect(isValidHostDob(null)).toBe(true);
    expect(isValidHostDob('')).toBe(true);
  });

  it('refuses text that is not a date', () => {
    expect(isValidHostDob('not-a-date')).toBe(false);
  });

  it('accepts someone exactly 18 today and someone exactly 100 today', () => {
    expect(isValidHostDob('2008-06-15')).toBe(true);
    expect(isValidHostDob('1926-06-15')).toBe(true);
  });

  it('refuses someone a day short of 18 and someone a day past 100', () => {
    expect(isValidHostDob('2008-06-16')).toBe(false);
    expect(isValidHostDob('1926-06-14')).toBe(false);
  });

  it('accepts a grown adult', () => {
    expect(isValidHostDob('1990-01-31')).toBe(true);
  });
});
